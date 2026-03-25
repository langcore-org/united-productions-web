/**
 * Next.js Middleware
 * Supabase Auth でセッション更新・認証チェック
 */

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 認証不要パス（ログイン・コールバック・エラー・プレビュー専用）
const PUBLIC_PATHS = ["/auth/signin", "/auth/callback", "/auth/error", "/preview-login"];

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const { pathname } = url;

  // Preview Login は Preview 環境のみ許可
  if (pathname.startsWith("/preview-login")) {
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 静的・公開パスはスキップ
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // セッション更新してユーザー情報を取得
  const { supabaseResponse, user } = await updateSession(request);

  // デバッグログ（一時的）
  const cookies = request.cookies.getAll();
  const sbCookies = cookies.filter((c) => c.name.startsWith("sb-"));
  console.log(
    `[MW] path=${pathname} user=${user?.email ?? "null"} sb-cookies=${sbCookies.length} names=[${sbCookies.map((c) => c.name).join(",")}]`,
  );

  // 認証不要パスの処理
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    // 認証済みでサインインページに来た場合はトップへ
    if (user && (pathname.startsWith("/auth/signin") || pathname.startsWith("/auth/error"))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  // すべてのその他のパスは認証必須（ローカル開発時はスキップ可能）
  if (!user) {
    // ローカル開発用: SKIP_AUTH=true で認証をバイパス
    if (process.env.SKIP_AUTH === "true") {
      return supabaseResponse;
    }
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/chat",
    "/chat/:path*",
    "/meeting-notes/:path*",
    "/transcripts/:path*",
    "/research/:path*",
    "/settings/:path*",
    "/auth/:path*",
    "/preview-login",
  ],
};
