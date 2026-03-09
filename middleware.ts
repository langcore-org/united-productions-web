/**
 * Next.js Middleware
 * Supabase Auth でセッション更新・認証チェック
 */

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/", "/auth/signin", "/auth/error", "/preview-login"];

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
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const { supabaseResponse, user } = await updateSession(request);
    // 認証済みでサインインページに来た場合はトップへ
    if (user && (pathname.startsWith("/auth/signin") || pathname.startsWith("/auth/error"))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  // 保護パス: セッション更新して認証チェック
  const { supabaseResponse, user } = await updateSession(request);

  const isProtectedPath = [
    "/meeting-notes",
    "/transcripts",
    "/research",
    "/chat",
    "/settings",
  ].some((p) => pathname.startsWith(p));

  if (isProtectedPath && !user) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/meeting-notes/:path*",
    "/transcripts/:path*",
    "/research/:path*",
    "/chat/:path*",
    "/settings/:path*",
    "/auth/:path*",
    "/preview-login",
  ],
};
