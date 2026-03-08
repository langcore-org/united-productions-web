/**
 * Dev Bypass Authentication - Session Management
 *
 * This module provides session injection utilities for dev bypass mode.
 * It creates mock Supabase sessions from test user data.
 *
 * Architecture: Session Injection (not RLS bypass)
 * - Uses ANON key (not service role)
 * - RLS policies execute normally
 * - Provides identical behavior to production auth
 */

import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

/**
 * Fetch test user from database
 * Uses service role ONLY for initial user lookup
 */
export async function fetchTestUserFromDB(email: string): Promise<User | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error('[Bypass] Missing Supabase credentials');
    return null;
  }

  // Create service role client ONLY for fetching test user
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  try {
    // Fetch user from public.users
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      console.error('[Bypass] Test user not found:', email, error);
      return null;
    }

    // Convert to Supabase User format
    return {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.created_at,
      phone: '',
      created_at: user.created_at,
      updated_at: user.updated_at,
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
      user_metadata: {
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        is_system_admin: user.is_system_admin,
      },
      aud: 'authenticated',
      role: 'authenticated',
    } as User;
  } catch (error) {
    console.error('[Bypass] Error fetching test user:', error);
    return null;
  }
}

/**
 * Create a properly signed JWT token using jose library
 */
async function createMockJWT(user: User): Promise<string> {
  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ||
                     'super-secret-jwt-token-with-at-least-32-characters-long';

  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(JWT_SECRET);

  const jwt = await new SignJWT({
    email: user.email,
    role: 'authenticated',
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id) // auth.uid() reads this
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);

  return jwt;
}

/**
 * Create mock session structure
 */
export async function createMockSession(user: User): Promise<Session> {
  const now = Math.floor(Date.now() / 1000);

  const accessToken = await createMockJWT(user);
  const refreshToken = await createMockJWT(user);

  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: refreshToken,
    user,
  };
}

/**
 * Serialize session for storage
 */
export function serializeSession(session: Session): string {
  return JSON.stringify(session);
}

// Cache for deserialization
let deserializationCache: { data: string; parsed: Session } | null = null;

/**
 * Deserialize session from storage
 */
export function deserializeSession(data: string): Session | null {
  if (deserializationCache && deserializationCache.data === data) {
    return deserializationCache.parsed;
  }

  try {
    const parsed = JSON.parse(data) as Session;

    if (!parsed.user || !parsed.user.id || !parsed.user.email) {
      console.error('[Bypass] Invalid session structure');
      return null;
    }

    deserializationCache = { data, parsed };
    return parsed;
  } catch (error) {
    console.error('[Bypass] Failed to deserialize session:', error);
    return null;
  }
}

/**
 * Validate session is not expired
 */
export function isSessionValid(session: Session): boolean {
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at ? session.expires_at > now : true;
}
