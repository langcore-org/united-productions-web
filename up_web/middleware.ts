import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "./lib/utils";
import {
  shouldApplyDevBypass,
  getDevTestUser,
  logDevBypass
} from "./lib/auth/bypass-middleware";
import {
  fetchTestUserFromDB,
  createMockSession,
  serializeSession
} from "./lib/auth/bypass-session";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if dev bypass should be applied
  const useDevBypass = shouldApplyDevBypass(pathname);

  // If dev bypass is active, inject mock session
  if (useDevBypass) {
    const testUser = getDevTestUser();

    if (testUser) {
      logDevBypass(pathname, testUser);

      // Fetch full user data from database
      const user = await fetchTestUserFromDB(testUser.email);

      if (!user) {
        console.error('[Bypass] Failed to fetch test user from database:', testUser.email);
        // Fall through to normal auth flow
      } else {
        // Create mock session with full user data
        const mockSession = await createMockSession(user);
        const serializedSession = serializeSession(mockSession);

        // Create response with injected session
        const response = NextResponse.next({ request });

        // Set session in headers for server-side consumption
        response.headers.set('x-bypass-session', serializedSession);
        response.headers.set('X-Dev-Bypass-Active', 'true');
        response.headers.set('X-Dev-User-Email', user.email || '');
        response.headers.set('X-Dev-User-Id', user.id);

        // Set session in cookie for client-side consumption
        response.cookies.set('bypass-session', serializedSession, {
          httpOnly: false, // Allow client JS to read
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 3600, // 1 hour
        });

        console.log('[Bypass] Mock session injected:', {
          userId: user.id,
          email: user.email,
        });

        return response;
      }
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip middleware check
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Get user claims
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/auth/login",
    "/auth/sign-up",
    "/auth/callback",
    "/auth/confirm",
    "/auth/error",
    "/auth/forgot-password",
    "/auth/update-password",
    "/auth/sign-up-success",
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(route)
  );

  // If no user and trying to access protected route, redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images in public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
