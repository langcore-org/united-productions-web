/**
 * Dev-Mode Authentication Bypass
 *
 * This module provides authentication bypass functionality for development and testing.
 *
 * SECURITY WARNING: This ONLY works when NEXT_PUBLIC_DEV_BYPASS_AUTH=true
 * Production builds should NEVER have this enabled.
 *
 * Usage:
 * 1. Create .env (normal auth):
 *    # NEXT_PUBLIC_DEV_BYPASS_AUTH not set or false
 *
 * 2. Create .env.bypass (bypass mode):
 *    NEXT_PUBLIC_DEV_BYPASS_AUTH=true
 *    DEV_TEST_USER_EMAIL=test-admin@example.com
 *
 * 3. Run development servers:
 *    npm run dev          (normal auth)
 *    npm run dev:bypass   (bypass mode with .env.bypass)
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Dev-mode test user configuration
 */
export interface DevTestUser {
  id: string;
  email: string;
  displayName: string;
  isSystemAdmin: boolean;
}

/**
 * Check if dev-mode bypass is enabled
 */
export function isDevBypassEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';
}

/**
 * Get dev test user configuration from environment
 */
export function getDevTestUser(): DevTestUser | null {
  if (!isDevBypassEnabled()) {
    return null;
  }

  const email = process.env.DEV_TEST_USER_EMAIL;

  if (!email) {
    console.warn('[DEV_BYPASS] Missing DEV_TEST_USER_EMAIL environment variable');
    return null;
  }

  // Map email to actual database user ID
  // NOTE: For online bypass mode, user IDs are fetched from production database
  // These mappings are fallbacks for local development only
  const userMap: Record<string, DevTestUser> = {
    // ============================================
    // Local Test Users (from seed.sql)
    // ============================================
    // System Admin - Primary test account for bypass mode (local)
    'admin@actraise.org': {
      id: '10000000-0000-0000-0000-000000000001',
      email: 'admin@actraise.org',
      displayName: 'Admin',
      isSystemAdmin: true,
    },
    // Workspace Admin - Test admin account
    'test-admin@example.com': {
      id: '10000000-0000-0000-0000-000000000002',
      email: 'test-admin@example.com',
      displayName: 'Test Admin',
      isSystemAdmin: false,
    },
    // Workspace Member - Test user account
    'test-user@example.com': {
      id: '10000000-0000-0000-0000-000000000003',
      email: 'test-user@example.com',
      displayName: 'Test User',
      isSystemAdmin: false,
    },
    // ============================================
    // Production Users (for online bypass mode)
    // IDs are placeholders - actual IDs fetched from production DB
    // ============================================
    'yeesytopic@gmail.com': {
      id: '00000000-0000-0000-0000-000000000000', // Will be fetched from DB
      email: 'yeesytopic@gmail.com',
      displayName: 'Yeesy',
      isSystemAdmin: false,
    },
    'bibimsoba@gmail.com': {
      id: '00000000-0000-0000-0000-000000000000', // Will be fetched from DB
      email: 'bibimsoba@gmail.com',
      displayName: 'Bibim',
      isSystemAdmin: false,
    },
  };

  return userMap[email] || null;
}

/**
 * Check if dev bypass should be applied for this request
 */
export function shouldApplyDevBypass(pathname: string): boolean {
  if (!isDevBypassEnabled()) {
    return false;
  }

  const testUser = getDevTestUser();
  if (!testUser) {
    return false;
  }

  // Don't bypass auth routes (let them work normally)
  const authRoutes = ['/auth/login', '/auth/sign-up', '/auth/callback'];
  if (authRoutes.some(route => pathname.startsWith(route))) {
    return false;
  }

  return true;
}

/**
 * Log dev bypass activity
 */
export function logDevBypass(pathname: string, testUser: DevTestUser) {
  console.log('[DEV_BYPASS] 🔓 Auth bypassed:', {
    pathname,
    user: testUser.email,
    isSystemAdmin: testUser.isSystemAdmin,
  });
}

/**
 * Get dev bypass user ID for Supabase queries
 */
export function getDevBypassUserId(): string | null {
  const testUser = getDevTestUser();
  return testUser?.id || null;
}
