/**
 * Dev Bypass Authentication - Client Wrapper
 *
 * This module wraps Supabase clients to inject mock sessions.
 * It intercepts auth.getUser() and auth.getSession() methods.
 *
 * Key Insight:
 * - We wrap the client, not bypass RLS
 * - RLS policies still execute (using anon key)
 * - auth.uid() in SQL returns the test user's UUID
 */

import { SupabaseClient, Session } from '@supabase/supabase-js';

/**
 * Wrap Supabase client to use mock session
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function wrapClientWithMockSession<T = any>(
  client: SupabaseClient<any>,
  mockSession: Session,
  skipSetSession = false
): Promise<SupabaseClient<any>> {
  if (isClientWrapped(client)) {
    return client;
  }

  const originalGetSession = client.auth.getSession.bind(client.auth);

  if (!skipSetSession) {
    try {
      const result = await client.auth.setSession(mockSession);
      if (result.error) {
        console.error('[Bypass] Error setting session:', result.error);
        throw new Error(`Failed to set session: ${result.error.message}`);
      }
      console.log('[Bypass] Session set in client');

      const verifyResult = await originalGetSession();
      console.log('[Bypass] Session verification:', {
        hasSession: !!verifyResult.data.session,
        userId: verifyResult.data.session?.user?.id,
      });
    } catch (error) {
      console.error('[Bypass] Exception while setting session:', error);
      throw error;
    }
  }

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

  // Intercept auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client.auth as any).getUser = async () => {
    return {
      data: { user: mockSession.user },
      error: null,
    };
  };

  // Intercept auth.getSession()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client.auth as any).getSession = async () => {
    return {
      data: { session: mockSession },
      error: null,
    };
  };

  // Intercept refreshSession
  client.auth.refreshSession = async () => {
    return {
      data: { session: mockSession, user: mockSession.user },
      error: null,
    };
  };

  console.log('[Bypass] Client wrapped with mock session:', {
    userId: mockSession.user.id,
    email: mockSession.user.email,
  });

  return client;
}

/**
 * Check if a client is already wrapped
 */
export function isClientWrapped(client: SupabaseClient): boolean {
  return client.auth.getUser.toString().includes('mock');
}
