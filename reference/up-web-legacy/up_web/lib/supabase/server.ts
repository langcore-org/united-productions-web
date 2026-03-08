import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { isDevBypassEnabled } from "../auth/bypass-middleware";
import { wrapClientWithMockSession } from "../auth/bypass-client-wrapper";
import { deserializeSession } from "../auth/bypass-session";

/**
 * Create Supabase server client with bypass support
 *
 * Wrapped with React cache() for request-scoped memoization.
 * This prevents duplicate client creation within a single request.
 */
export const createClient = cache(async function createSupabaseClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  // Check bypass mode and get session
  let bypassSession: ReturnType<typeof deserializeSession> = null;
  if (isDevBypassEnabled()) {
    const headersList = await headers();
    const bypassSessionHeader = headersList.get('x-bypass-session');

    if (bypassSessionHeader) {
      bypassSession = deserializeSession(bypassSessionHeader);
    } else {
      const bypassCookie = cookieStore.get('bypass-session');
      if (bypassCookie) {
        bypassSession = deserializeSession(bypassCookie.value);
      }
    }
  }

  // Build client configuration
  const clientConfig: Parameters<typeof createServerClient>[2] = {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  };

  // Create client with configuration
  const client = createServerClient(supabaseUrl, supabaseKey, clientConfig);

  // Wrap client with mock session if in bypass mode
  if (bypassSession) {
    console.log('[Bypass] Wrapping client with mock session');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await wrapClientWithMockSession(client as any, bypassSession, true) as typeof client;
  }

  // Warn if bypass is enabled but no session found
  if (isDevBypassEnabled()) {
    console.warn('[Bypass] Bypass enabled but no session found');
  }

  return client;
});

/**
 * Create a Supabase client with service role key for admin operations
 * This bypasses RLS and should only be used in API routes after proper authentication checks
 */
export async function createServiceRoleClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return createServerClient(
    supabaseUrl,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignore cookie errors in API routes
          }
        },
      },
    },
  );
}
