-- ============================================
-- T-Agent Seed Data
-- ============================================
-- Purpose: Inject sample test data for local development
-- This file runs AFTER all migrations are applied
-- Automatically executed by: supabase db reset
--
-- Test Users (all with password 'password'):
-- 1. admin@actraise.org (system_admin, owner)
-- 2. test-admin@example.com (workspace_admin)
-- 3. test-user@example.com (workspace_member)
--
-- Test Workspace: test-corp
-- Test Programs: Sample broadcast programs
-- ============================================

BEGIN;

-- ============================================
-- SECTION 1: Test Workspace
-- ============================================

INSERT INTO workspaces (
  id,
  slug,
  name,
  description,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'united-production',
  'United Production',
  'United Production Workspace',
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

-- 2.1 System Admin (admin@actraise.org)
-- This is the main admin account for bypass mode

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
  'admin@actraise.org',
  crypt('password', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Admin"}'::jsonb,
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
  is_system_admin,
  auth_provider,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000001'::uuid,
  'admin@actraise.org',
  'Admin',
  NULL,
  true,
  'email'::auth_provider_enum,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2.2 Test Admin (test-admin@example.com)

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
  '{"display_name":"Test Admin"}'::jsonb,
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
  is_system_admin,
  auth_provider,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000002'::uuid,
  'test-admin@example.com',
  'Test Admin',
  NULL,
  false,
  'email'::auth_provider_enum,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2.3 Test User (test-user@example.com)

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
  '{"display_name":"Test User"}'::jsonb,
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
  is_system_admin,
  auth_provider,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000003'::uuid,
  'test-user@example.com',
  'Test User',
  NULL,
  false,
  'email'::auth_provider_enum,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 3: User Settings
-- ============================================

INSERT INTO user_settings (
  id,
  user_id,
  darkmode,
  theme,
  email_notifications,
  push_notifications,
  notification_frequency,
  created_at,
  updated_at
) VALUES
(
  '40000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  'system',
  'default',
  true,
  true,
  'realtime',
  NOW(),
  NOW()
),
(
  '40000000-0000-0000-0000-000000000002'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'system',
  'default',
  true,
  true,
  'realtime',
  NOW(),
  NOW()
),
(
  '40000000-0000-0000-0000-000000000003'::uuid,
  '10000000-0000-0000-0000-000000000003'::uuid,
  'system',
  'default',
  true,
  true,
  'realtime',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- SECTION 4: Workspace Memberships
-- ============================================

INSERT INTO workspace_members (
  id,
  workspace_id,
  user_id,
  role,
  status,
  joined_at,
  created_at,
  updated_at
) VALUES
(
  '20000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  'owner',
  'active',
  NOW(),
  NOW(),
  NOW()
),
(
  '20000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'admin',
  'active',
  NOW(),
  NOW(),
  NOW()
),
(
  '20000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000003'::uuid,
  'member',
  'active',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- ============================================
-- SECTION 5: Test Programs
-- ============================================

INSERT INTO programs (
  id,
  workspace_id,
  name,
  description,
  status,
  start_date,
  end_date,
  created_by,
  created_at,
  updated_at
) VALUES
(
  '30000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '神業チャレンジ',
  '神業チャレンジの番組',
  'active',
  '2024-01-01'::date,
  NULL,
  '10000000-0000-0000-0000-000000000001'::uuid,
  NOW(),
  NOW()
),
(
  '30000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '熱狂マニアさん',
  '熱狂マニアさんの熱狂を語る番組',
  'active',
  '2024-02-01'::date,
  NULL,
  '10000000-0000-0000-0000-000000000001'::uuid,
  NOW(),
  NOW()
),
(
  '30000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'ビジネス洞察',
  'ビジネス戦略と市場分析の番組',
  'active',
  '2024-03-01'::date,
  NULL,
  '10000000-0000-0000-0000-000000000002'::uuid,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 6: Test Teams
-- ============================================

INSERT INTO teams (
  id,
  program_id,
  name,
  description,
  agent_type,
  system_prompt,
  created_by,
  created_at,
  updated_at
) VALUES
(
  '50000000-0000-0000-0000-000000000001'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  'Research Team',
  'Research and fact-checking team',
  'research',
  'You are a research assistant for a news program. Help find and verify facts.',
  '10000000-0000-0000-0000-000000000001'::uuid,
  NOW(),
  NOW()
),
(
  '50000000-0000-0000-0000-000000000002'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  'Planning Team',
  'Content planning and scriptwriting',
  'planning',
  'You are a content planner for a news program. Help create engaging stories.',
  '10000000-0000-0000-0000-000000000001'::uuid,
  NOW(),
  NOW()
),
(
  '50000000-0000-0000-0000-000000000003'::uuid,
  '30000000-0000-0000-0000-000000000002'::uuid,
  'Idea Finder',
  'Find trending tech topics',
  'idea_finder',
  'You are an idea finder for a tech podcast. Find interesting tech topics and trends.',
  '10000000-0000-0000-0000-000000000001'::uuid,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================
-- SEED DATA SUMMARY
-- ============================================
-- Seeded: 1 workspace (test-corp)
-- Seeded: 3 users (admin@actraise.org, test-admin@example.com, test-user@example.com)
-- Seeded: 3 user settings
-- Seeded: 3 workspace memberships
-- Seeded: 3 programs
-- Seeded: 3 teams
--
-- Test URLs (local development):
-- http://localhost:3100/test-corp/dashboard
-- http://localhost:3100/test-corp/programs
--
-- Test Credentials:
-- Email: admin@actraise.org | Password: password | Role: system_admin + owner
-- Email: test-admin@example.com | Password: password | Role: workspace_admin
-- Email: test-user@example.com | Password: password | Role: workspace_member
--
-- Bypass Mode Test Users:
-- For local: admin@actraise.org, test-admin@example.com, test-user@example.com
-- For online: yeesytopic@gmail.com, bibimsoba@gmail.com (from production DB)
-- ============================================
