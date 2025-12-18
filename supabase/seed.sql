-- ============================================
-- Supabase Seed Data
-- ============================================
-- Purpose: Inject sample test data for local development
-- This file runs AFTER all migrations are applied
-- Automatically executed by: supabase start (if config.toml has [db.seed] enabled)
--
-- Test Users (all with password 'password'):
-- 1. test-sysadmin@example.com (system_admin)
-- 2. test-admin@example.com (instance_admin)
-- 3. test-user@example.com (instance_user)
--
-- Test Instance: test-corp
-- Test Programs: 10 sample broadcast programs
-- ============================================

BEGIN;

-- ============================================
-- SECTION 1: Test Instance
-- ============================================

INSERT INTO instances (
  id,
  slug,
  name,
  description,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'test-corp',
  'Test Corporation',
  'Development test instance for local testing',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      updated_at = NOW();

-- ============================================
-- SECTION 2: Test Users
-- Password: 'password' for all test users
-- ============================================

-- 2.1 System Admin (test-sysadmin@example.com)
-- System-wide admin access to all instances

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'test-sysadmin@example.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Test System Admin"}'::jsonb,
  NOW(),
  NOW(),
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO users (
  id,
  email,
  display_name,
  avatar_url,
  sso_provider,
  system_role,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000001'::uuid,
  'test-sysadmin@example.com',
  'Test System Admin',
  NULL,
  'email'::sso_provider_enum,
  'system_admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2.2 Instance Admin (test-admin@example.com)
-- Admin access to test-corp instance only

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'authenticated',
  'authenticated',
  'test-admin@example.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Test Instance Admin"}'::jsonb,
  NOW(),
  NOW(),
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO users (
  id,
  email,
  display_name,
  avatar_url,
  sso_provider,
  system_role,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000002'::uuid,
  'test-admin@example.com',
  'Test Instance Admin',
  NULL,
  'email'::sso_provider_enum,
  'user',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2.3 Instance User (test-user@example.com)
-- Regular user access to test-corp instance

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '10000000-0000-0000-0000-000000000003'::uuid,
  'authenticated',
  'authenticated',
  'test-user@example.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Test Instance User"}'::jsonb,
  NOW(),
  NOW(),
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO users (
  id,
  email,
  display_name,
  avatar_url,
  sso_provider,
  system_role,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000003'::uuid,
  'test-user@example.com',
  'Test Instance User',
  NULL,
  'email'::sso_provider_enum,
  'user',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 3: Instance Memberships
-- ============================================

INSERT INTO instance_members (
  id,
  instance_id,
  user_id,
  instance_role,
  status,
  joined_at,
  created_at,
  updated_at
) VALUES
(
  '20000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  'instance_admin',
  'active',
  NOW(),
  NOW(),
  NOW()
),
(
  '20000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'instance_admin',
  'active',
  NOW(),
  NOW(),
  NOW()
),
(
  '20000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000003'::uuid,
  'instance_user',
  'active',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (instance_id, user_id) DO NOTHING;

-- ============================================
-- SECTION 4: Test Programs (10 programs)
-- All programs owned by test-admin@example.com
-- ============================================

INSERT INTO programs (
  id,
  instance_id,
  name,
  description,
  status,
  start_date,
  end_date,
  created_at,
  updated_at
) VALUES
(
  '30000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Morning News Show',
  'Daily morning news and current affairs program',
  'active',
  '2024-01-01'::date,
  NULL,
  NOW(),
  NOW()
),
(
  '30000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Tech Talk Podcast',
  'Weekly technology and innovation discussions',
  'active',
  '2024-02-01'::date,
  NULL,
  NOW(),
  NOW()
),
(
  '30000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Business Insights',
  'Business strategy and market analysis show',
  'active',
  '2024-03-01'::date,
  NULL,
  NOW(),
  NOW()
),
(
  '30000000-0000-0000-0000-000000000004'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Culture & Arts',
  'Exploring arts, culture, and entertainment',
  'active',
  '2024-04-01'::date,
  NULL,
  NOW(),
  NOW()
),
(
  '30000000-0000-0000-0000-000000000005'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Health & Wellness',
  'Medical advice and healthy lifestyle tips',
  'active',
  '2024-05-01'::date,
  NULL,
  NOW(),
  NOW()
),
(
  '30000000-0000-0000-0000-000000000006'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Sports Talk',
  'Latest sports news and game analysis',
  'active',
  '2024-06-01'::date,
  NULL,
  NOW(),
  NOW()
),
(
  '30000000-0000-0000-0000-000000000007'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Educational Series',
  'Learning and education content for all ages',
  'active',
  '2024-07-01'::date,
  NULL,
  NOW(),
  NOW()
),
(
  '30000000-0000-0000-0000-000000000008'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Food & Travel',
  'Culinary adventures and travel destinations',
  'active',
  '2024-08-01'::date,
  NULL,
  NOW(),
  NOW()
),
(
  '30000000-0000-0000-0000-000000000009'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Science Discovery',
  'Exploring scientific breakthroughs and research',
  'active',
  '2024-09-01'::date,
  NULL,
  NOW(),
  NOW()
),
(
  '30000000-0000-0000-0000-000000000010'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Evening Entertainment',
  'Variety show with music, comedy, and special guests',
  'active',
  '2024-10-01'::date,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 5: Program Members
-- Link test-admin to all programs as owner
-- ============================================

INSERT INTO program_members (
  id,
  program_id,
  user_id,
  program_role,
  created_at,
  updated_at
) VALUES
(
  '31000000-0000-0000-0000-000000000001'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'owner',
  NOW(),
  NOW()
),
(
  '31000000-0000-0000-0000-000000000002'::uuid,
  '30000000-0000-0000-0000-000000000002'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'owner',
  NOW(),
  NOW()
),
(
  '31000000-0000-0000-0000-000000000003'::uuid,
  '30000000-0000-0000-0000-000000000003'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'owner',
  NOW(),
  NOW()
),
(
  '31000000-0000-0000-0000-000000000004'::uuid,
  '30000000-0000-0000-0000-000000000004'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'owner',
  NOW(),
  NOW()
),
(
  '31000000-0000-0000-0000-000000000005'::uuid,
  '30000000-0000-0000-0000-000000000005'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'owner',
  NOW(),
  NOW()
),
(
  '31000000-0000-0000-0000-000000000006'::uuid,
  '30000000-0000-0000-0000-000000000006'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'owner',
  NOW(),
  NOW()
),
(
  '31000000-0000-0000-0000-000000000007'::uuid,
  '30000000-0000-0000-0000-000000000007'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'owner',
  NOW(),
  NOW()
),
(
  '31000000-0000-0000-0000-000000000008'::uuid,
  '30000000-0000-0000-0000-000000000008'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'owner',
  NOW(),
  NOW()
),
(
  '31000000-0000-0000-0000-000000000009'::uuid,
  '30000000-0000-0000-0000-000000000009'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'owner',
  NOW(),
  NOW()
),
(
  '31000000-0000-0000-0000-000000000010'::uuid,
  '30000000-0000-0000-0000-000000000010'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'owner',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================
-- SEED DATA SUMMARY
-- ============================================
-- ✅ Seeded: 1 instance
-- ✅ Seeded: 3 users with roles
-- ✅ Seeded: 3 instance memberships
-- ✅ Seeded: 10 broadcast programs
-- ✅ Seeded: 10 program memberships
--
-- Test URLs (local development):
-- http://localhost:3000/test-corp/dashboard
-- http://localhost:3000/test-corp/programs
-- http://localhost:3000/mypage
--
-- Test Credentials:
-- Email: test-sysadmin@example.com | Password: password | Role: system_admin
-- Email: test-admin@example.com | Password: password | Role: instance_admin
-- Email: test-user@example.com | Password: password | Role: instance_user
-- ============================================
