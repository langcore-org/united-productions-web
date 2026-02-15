/**
 * Next.js Middleware
 *
 * レート制限と認証を適用するミドルウェア
 * - API Routesに対してレート制限を適用
 * - 特定のパスを保護
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { getToken } from 'next-auth/jwt';
import { checkRateLimit, incrementRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { FREE_TIER_LIMITS } from '@/lib/llm/config';
import type { LLMProvider } from '@/lib/llm/types';

/**
 * レート制限を適用するAPIパス
 */
const RATE_LIMITED_PATHS = [
  '/api/llm/chat',
  '/api/llm/stream',
];

/**
 * プロバイダー別のレート制限を適用するパス
 */
const PROVIDER_SPECIFIC_PATHS: Record<string, LLMProvider> = {
  '/api/meeting-notes': 'gemini-2.5-flash-lite',
  '/api/transcripts': 'gemini-2.5-flash-lite',
  '/api/schedules': 'gemini-2.5-flash-lite',
  '/api/research': 'perplexity-sonar',
};

/**
 * リクエストから識別子を取得
 * IPアドレスまたはセッションIDを使用
 */
function getIdentifier(request: NextRequest): string {
  // X-Forwarded-Forヘッダーから元のIPを取得
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Real-IPヘッダー
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // フォールバック: unknown
  return 'unknown';
}

/**
 * リクエストからプロバイダーを取得
 * クエリパラメータまたはボディから推定
 */
async function getProvider(request: NextRequest): Promise<LLMProvider | null> {
  const url = new URL(request.url);

  // クエリパラメータから取得
  const providerParam = url.searchParams.get('provider');
  if (providerParam) {
    return providerParam as LLMProvider;
  }

  // パスベースのデフォルトプロバイダー
  for (const [path, defaultProvider] of Object.entries(PROVIDER_SPECIFIC_PATHS)) {
    if (url.pathname.startsWith(path)) {
      return defaultProvider;
    }
  }

  // POSTリクエストの場合はボディから取得を試行
  if (request.method === 'POST') {
    try {
      // リクエストをクローン（元のリクエストは消費しない）
      const clonedRequest = request.clone();
      const body = await clonedRequest.json();
      if (body.provider) {
        return body.provider as LLMProvider;
      }
    } catch {
      // ボディパースエラーは無視
    }
  }

  return null;
}

/**
 * レート制限エラーレスポンスを生成
 */
function createRateLimitResponse(result: Awaited<ReturnType<typeof checkRateLimit>>): NextResponse {
  const headers = getRateLimitHeaders(result);

  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: `Rate limit exceeded. Please try again after ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
      limits: {
        rpm: { used: result.currentRpm, limit: result.limitRpm },
        rpd: { used: result.currentRpd, limit: result.limitRpd },
      },
    },
    {
      status: 429,
      headers,
    }
  );
}

/**
 * 認証が必要なパス
 */
const PROTECTED_PATHS = [
  '/meeting-notes',
  '/transcripts',
  '/research',
  '/schedules',
  '/settings',
];

/**
 * 認証関連パス（リダイレクト対象外）
 */
const AUTH_PATHS = [
  '/auth/signin',
  '/auth/error',
];

/**
 * メインミドルウェア関数
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);

  // 認証チェック
  const isProtectedPath = PROTECTED_PATHS.some(path =>
    url.pathname.startsWith(path)
  );
  const isAuthPath = AUTH_PATHS.some(path =>
    url.pathname.startsWith(path)
  );

  // セッショントークンを取得
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // 未認証で保護されたパスにアクセスした場合はサインインページへ
  if (isProtectedPath && !token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // 認証済みで認証ページにアクセスした場合はトップページへ
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // レート制限対象パスかチェック
  const isRateLimitedPath = RATE_LIMITED_PATHS.some(path =>
    url.pathname.startsWith(path)
  );

  // プロバイダー固有パスかチェック
  const isProviderSpecificPath = Object.keys(PROVIDER_SPECIFIC_PATHS).some(path =>
    url.pathname.startsWith(path)
  );

  // レート制限が不要なパスはスキップ
  if (!isRateLimitedPath && !isProviderSpecificPath) {
    return NextResponse.next();
  }

  // 識別子を取得
  const identifier = getIdentifier(request);

  // プロバイダーを取得
  const provider = await getProvider(request);

  if (!provider) {
    // プロバイダーが特定できない場合はデフォルト制限を適用
    console.warn(`[Middleware] Could not determine provider for ${url.pathname}`);
    return NextResponse.next();
  }

  // レート制限をチェック
  const limits = FREE_TIER_LIMITS[provider];
  const rateLimitResult = await checkRateLimit(provider, identifier, limits);

  // レート制限ヘッダーを追加
  const headers = getRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    console.warn(
      `[Rate Limit] Blocked request for ${provider} from ${identifier}. ` +
      `RPM: ${rateLimitResult.currentRpm}/${rateLimitResult.limitRpm}, ` +
      `RPD: ${rateLimitResult.currentRpd}/${rateLimitResult.limitRpd}`
    );
    return createRateLimitResponse(rateLimitResult);
  }

  // レート制限カウントを増加
  await incrementRateLimit(provider, identifier);

  // レスポンスにヘッダーを追加
  const response = NextResponse.next();

  // レート制限ヘッダーをレスポンスに追加
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * ミドルウェアを適用するパス設定
 */
export const config = {
  matcher: [
    // API Routes
    '/api/llm/:path*',
    '/api/meeting-notes/:path*',
    '/api/transcripts/:path*',
    '/api/schedules/:path*',
    '/api/research/:path*',
    // 静的ファイルは除外
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
