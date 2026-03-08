/**
 * Next.js Middleware
 * シンプル版 - Vercel Edge互換
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// 認証が必要なパス
const PROTECTED_PATHS = [
  "/meeting-notes",
  "/transcripts",
  "/research",
  "/chat",
  // '/schedules', // 削除
  "/settings",
];

// 認証関連パス
const AUTH_PATHS = ["/auth/signin", "/auth/error"];

// Preview環境判定
const isPreviewEnv = process.env.VERCEL_ENV === "preview";

export function middleware(request: NextRequest): NextResponse {
  const url = new URL(request.url);
  const { pathname } = url;

  // Preview Loginページへのアクセス制御
  if (pathname.startsWith("/preview-login")) {
    // Preview環境でない場合はアクセスをブロック
    if (!isPreviewEnv) {
      // 404ページまたはトップページへリダイレクト
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 保護されたパスかチェック
  const isProtectedPath = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  // Preview環境では /preview-login も認証パスとして扱う
  const isAuthPath =
    AUTH_PATHS.some((path) => pathname.startsWith(path)) ||
    (isPreviewEnv && pathname.startsWith("/preview-login"));

  // セッションCookieの存在をチェック（簡易認証チェック）
  const sessionCookie =
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-next-auth.session-token");
  const isAuthenticated = !!sessionCookie;

  // 未認証で保護されたパスにアクセスした場合はサインインページへ
  if (isProtectedPath && !isAuthenticated) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // 認証済みで認証ページにアクセスした場合はトップページへ
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 通常のレスポンス
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/meeting-notes/:path*",
    "/transcripts/:path*",
    "/research/:path*",
    "/chat/:path*",
    // '/schedules/:path*', // 削除
    "/settings/:path*",
    "/auth/:path*",
    "/preview-login",
  ],
};
