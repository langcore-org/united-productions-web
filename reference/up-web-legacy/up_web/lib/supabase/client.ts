import { createBrowserClient } from "@supabase/ssr";
import { deserializeSession } from "../auth/bypass-session";

/**
 * Check if we're in bypass mode
 */
function isBypassMode(): boolean {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';
}

/**
 * Get bypass session from cookies
 */
function getBypassSessionFromCookie(): ReturnType<typeof deserializeSession> {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split('; ');
  const bypassCookie = cookies.find(c => c.startsWith('bypass-session='));

  if (!bypassCookie) return null;

  const sessionData = bypassCookie.split('=')[1];
  if (!sessionData) return null;

  try {
    return deserializeSession(decodeURIComponent(sessionData));
  } catch (error) {
    console.error('[Bypass] Failed to parse bypass session from cookie:', error);
    return null;
  }
}

export function createClient() {
  const bypassMode = isBypassMode();

  // Create base browser client
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: !bypassMode,
        persistSession: !bypassMode,
        detectSessionInUrl: !bypassMode,
      },
    }
  );

  // Check if in bypass mode and wrap client if session exists
  if (bypassMode) {
    const bypassSession = getBypassSessionFromCookie();

    if (bypassSession) {
      console.log('[Bypass] Browser client using mock session from cookie');
      return wrapClientWithMockSessionSync(client, bypassSession);
    } else {
      console.warn('[Bypass] Bypass mode active but no session cookie found');
    }
  }

  return client;
}

/**
 * Synchronous wrapper for browser clients
 */
function wrapClientWithMockSessionSync(
  client: ReturnType<typeof createBrowserClient>,
  mockSession: ReturnType<typeof deserializeSession>
) {
  if (!mockSession) return client;

  // Set Authorization header for RLS
  if (mockSession.access_token) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const restClient = (client as any).rest;
      if (restClient?.headers) {
        restClient.headers['Authorization'] = `Bearer ${mockSession.access_token}`;
      }
    } catch (error) {
      console.error('[Bypass] Failed to set Authorization header:', error);
    }
  }

  // Intercept auth methods
  client.auth.getUser = async () => {
    return {
      data: { user: mockSession.user },
      error: null,
    };
  };

  client.auth.getSession = async () => {
    return {
      data: { session: mockSession },
      error: null,
    };
  };

  client.auth.onAuthStateChange = (callback: (event: string, session: typeof mockSession | null) => void) => {
    setTimeout(() => callback('SIGNED_IN', mockSession), 0);
    return {
      data: {
        subscription: {
          id: 'bypass-mock-subscription',
          callback,
          unsubscribe: () => {},
        },
      },
    };
  };

  client.auth.refreshSession = async () => {
    return {
      data: { session: mockSession, user: mockSession.user },
      error: null,
    };
  };

  return client;
}
