-- ============================================
-- T-Agent Database Schema
-- Generated: 2025-12-18
-- Purpose: TV production AI agent platform
-- Based on: PRD v1.0
-- ============================================

-- ============================================
-- SECTION 1: Extensions
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- SECTION 2: ENUM Types
-- ============================================

-- Authentication
CREATE TYPE auth_provider_enum AS ENUM ('email', 'google', 'azure', 'github');

-- Notification
CREATE TYPE notification_frequency_enum AS ENUM ('realtime', 'hourly', 'daily', 'never');

-- Workspace & User Management
CREATE TYPE workspace_role_enum AS ENUM ('owner', 'admin', 'member');
CREATE TYPE member_status_enum AS ENUM ('active', 'inactive', 'invited');

-- Program Management
CREATE TYPE program_status_enum AS ENUM ('active', 'archived', 'completed');

-- Team & Agent Management
CREATE TYPE agent_type_enum AS ENUM (
  'research',           -- リサーチエージェント
  'idea_finder',        -- ネタ探しエージェント
  'planning',           -- 企画作家エージェント
  'structure',          -- 構成作家エージェント
  'custom'              -- カスタムエージェント
);

-- Chat & Message Management
CREATE TYPE message_role_enum AS ENUM ('user', 'assistant', 'system');
CREATE TYPE session_status_enum AS ENUM ('active', 'archived', 'deleted');

-- File Reference Management
CREATE TYPE file_ref_type_enum AS ENUM ('file', 'folder');

-- Output/Artifact Management
CREATE TYPE output_status_enum AS ENUM ('draft', 'exported', 'deleted');

-- ============================================
-- SECTION 3: Helper Functions
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECTION 4: Core Tables - User Management
-- ============================================

-- --------------------------------------------
-- 4.1 Users Table
-- --------------------------------------------

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,

  -- System Admin Flag
  is_system_admin BOOLEAN DEFAULT false,

  -- Auth Provider Tracking
  auth_provider auth_provider_enum DEFAULT 'email',
  auth_provider_id TEXT,                 -- Provider-specific user ID

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_system_admin ON users(is_system_admin) WHERE is_system_admin = true;
CREATE INDEX idx_users_auth_provider ON users(auth_provider);

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'User accounts (extends auth.users)';
COMMENT ON COLUMN users.is_system_admin IS 'Global system administrator flag';
COMMENT ON COLUMN users.auth_provider IS 'SSO provider used for authentication';

-- --------------------------------------------
-- 4.2 User Settings Table
-- --------------------------------------------

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- UI Settings
  darkmode TEXT NOT NULL DEFAULT 'system',   -- 'light', 'dark', 'system'
  theme TEXT NOT NULL DEFAULT 'default',     -- 'default', 'ocean', 'sunset', etc.

  -- Notification Settings
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  notification_frequency notification_frequency_enum DEFAULT 'realtime',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user ON user_settings(user_id);

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_settings IS 'User personal settings (UI, notifications)';

-- ============================================
-- SECTION 5: Workspace Management
-- ============================================

-- --------------------------------------------
-- 5.1 Workspaces Table (formerly instances)
-- --------------------------------------------

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,                      -- Company website

  -- Google Drive Integration (workspace-level OAuth)
  google_drive_connected BOOLEAN DEFAULT false,
  google_refresh_token TEXT,  -- Encrypted
  google_token_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT slug_length CHECK (LENGTH(slug) BETWEEN 3 AND 30)
);

CREATE INDEX idx_workspaces_slug ON workspaces(slug);

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workspaces IS 'Multi-tenant workspaces (production companies)';
COMMENT ON COLUMN workspaces.website_url IS 'Company or organization website URL';

-- --------------------------------------------
-- 5.2 Workspace Members Table
-- --------------------------------------------

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL if invited but not yet registered

  -- Invitation Info (for pending invitations)
  email TEXT,                            -- Email address (for invited members)
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,

  -- Membership Info
  role workspace_role_enum NOT NULL DEFAULT 'member',
  status member_status_enum DEFAULT 'active',
  joined_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Either user_id or email must be set
  CONSTRAINT user_or_email_required CHECK (user_id IS NOT NULL OR email IS NOT NULL),
  -- Unique per workspace (user_id or email)
  UNIQUE(workspace_id, user_id),
  UNIQUE(workspace_id, email)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_email ON workspace_members(email);
CREATE INDEX idx_workspace_members_status ON workspace_members(status);
CREATE INDEX idx_workspace_members_invited_by ON workspace_members(invited_by);

CREATE TRIGGER update_workspace_members_updated_at
  BEFORE UPDATE ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workspace_members IS 'Workspace membership and invitations';
COMMENT ON COLUMN workspace_members.email IS 'Email for invited members (before registration)';
COMMENT ON COLUMN workspace_members.invited_by IS 'User who sent the invitation';
COMMENT ON COLUMN workspace_members.status IS 'active/inactive/invited';

-- ============================================
-- SECTION 6: Program Management (番組)
-- ============================================

-- --------------------------------------------
-- 6.1 Programs Table
-- --------------------------------------------

CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  status program_status_enum DEFAULT 'active',

  -- Google Drive Integration
  google_drive_root_id TEXT,          -- Drive folder ID
  google_drive_root_name TEXT,        -- Display name
  google_drive_root_url TEXT,         -- Direct link

  -- Program Details
  cover_image_url TEXT,

  -- Dates
  start_date DATE,
  end_date DATE,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_programs_workspace ON programs(workspace_id);
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_created_at ON programs(created_at DESC);

CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE programs IS 'TV programs/shows';
COMMENT ON COLUMN programs.google_drive_root_id IS 'Google Drive root folder ID for this program';

-- ============================================
-- SECTION 7: Team Management (チーム)
-- ============================================

-- --------------------------------------------
-- 7.1 Teams Table
-- --------------------------------------------

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Agent Configuration
  agent_type agent_type_enum NOT NULL DEFAULT 'custom',
  system_prompt TEXT,                    -- Custom system prompt
  output_format_template TEXT,           -- Output format template

  -- Google Drive Integration
  output_directory_id TEXT,              -- Output folder ID
  output_directory_name TEXT,            -- Display name
  output_directory_url TEXT,             -- Direct link

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_program ON teams(program_id);
CREATE INDEX idx_teams_agent_type ON teams(agent_type);

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE teams IS 'Work teams within programs (e.g., research team, planning team)';
COMMENT ON COLUMN teams.agent_type IS 'AI agent role: research, idea_finder, planning, structure, custom';
COMMENT ON COLUMN teams.system_prompt IS 'Custom system prompt for the team agent';

-- --------------------------------------------
-- 7.2 Team File References (参照可能ファイル/フォルダ)
-- --------------------------------------------

CREATE TABLE team_file_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Google Drive File/Folder Info
  ref_type file_ref_type_enum NOT NULL,
  drive_id TEXT NOT NULL,                -- Google Drive file/folder ID
  drive_name TEXT NOT NULL,              -- Display name
  drive_path TEXT,                       -- Full path from root
  drive_url TEXT,                        -- Direct link
  mime_type TEXT,                        -- MIME type (for files)

  -- Recursive folder reading
  include_subfolders BOOLEAN DEFAULT true,

  -- Order for display
  display_order INTEGER DEFAULT 0,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, drive_id)
);

CREATE INDEX idx_team_file_refs_team ON team_file_refs(team_id);
CREATE INDEX idx_team_file_refs_drive_id ON team_file_refs(drive_id);

COMMENT ON TABLE team_file_refs IS 'Files/folders accessible by team for @mention';
COMMENT ON COLUMN team_file_refs.include_subfolders IS 'If true, recursively read all subfolders';

-- ============================================
-- SECTION 8: Chat Session Management
-- ============================================

-- --------------------------------------------
-- 8.1 Chat Sessions Table
-- --------------------------------------------

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  title TEXT,                            -- Auto-generated or user-defined
  status session_status_enum DEFAULT 'active',

  -- Claude Agent SDK session tracking
  claude_session_id TEXT,                -- Claude session ID for continuity

  -- Metadata
  message_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_team ON chat_sessions(team_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_created_by ON chat_sessions(created_by);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE chat_sessions IS 'Chat conversation sessions per team';
COMMENT ON COLUMN chat_sessions.claude_session_id IS 'Claude Agent SDK session ID for conversation continuity';

-- --------------------------------------------
-- 8.2 Messages Table
-- --------------------------------------------

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,

  role message_role_enum NOT NULL,
  content TEXT NOT NULL,

  -- File attachments (from @mentions)
  file_attachments JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ drive_id, name, path, content_preview, mime_type }]

  -- Tool usage tracking
  tool_calls JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ tool_name, input, output }]

  -- AI metadata
  model TEXT,                            -- Claude model used
  token_usage JSONB,                     -- { input_tokens, output_tokens }

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_file_attachments ON messages USING GIN(file_attachments);

COMMENT ON TABLE messages IS 'Individual chat messages';
COMMENT ON COLUMN messages.file_attachments IS '@mentioned files attached to this message';
COMMENT ON COLUMN messages.tool_calls IS 'Claude tool calls made during this message';

-- Update session message_count trigger
CREATE OR REPLACE FUNCTION update_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chat_sessions
    SET message_count = message_count + 1,
        updated_at = NOW()
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chat_sessions
    SET message_count = GREATEST(0, message_count - 1),
        updated_at = NOW()
    WHERE id = OLD.session_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_count
  AFTER INSERT OR DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_message_count();

-- ============================================
-- SECTION 9: Output/Artifact Management
-- ============================================

-- --------------------------------------------
-- 9.1 Session Outputs Table (成果物)
-- --------------------------------------------

CREATE TABLE session_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  content TEXT NOT NULL,                 -- Generated content

  status output_status_enum DEFAULT 'draft',

  -- Google Drive export info
  exported_drive_id TEXT,                -- Google Doc ID after export
  exported_drive_url TEXT,               -- Google Doc URL
  exported_at TIMESTAMPTZ,

  -- Metadata
  output_type TEXT,                      -- 'report', 'plan', 'script', etc.

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_outputs_session ON session_outputs(session_id);
CREATE INDEX idx_session_outputs_status ON session_outputs(status);
CREATE INDEX idx_session_outputs_created_at ON session_outputs(created_at DESC);

CREATE TRIGGER update_session_outputs_updated_at
  BEFORE UPDATE ON session_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE session_outputs IS 'Generated outputs/artifacts from chat sessions';
COMMENT ON COLUMN session_outputs.exported_drive_id IS 'Google Doc ID after export to Drive';

-- ============================================
-- SECTION 10: Google Drive File Cache
-- ============================================

-- --------------------------------------------
-- 10.1 Drive File Cache Table
-- --------------------------------------------

CREATE TABLE drive_file_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  drive_id TEXT NOT NULL,                -- Google Drive file/folder ID
  parent_id TEXT,                        -- Parent folder ID

  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  is_folder BOOLEAN NOT NULL,

  -- File metadata
  size_bytes BIGINT,
  web_view_link TEXT,
  icon_link TEXT,

  -- Content cache (for text files)
  content_hash TEXT,                     -- Hash for change detection
  content_cached_at TIMESTAMPTZ,

  -- Sync tracking
  drive_modified_at TIMESTAMPTZ,         -- Last modified in Drive
  synced_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(workspace_id, drive_id)
);

CREATE INDEX idx_drive_cache_workspace ON drive_file_cache(workspace_id);
CREATE INDEX idx_drive_cache_parent ON drive_file_cache(parent_id);
CREATE INDEX idx_drive_cache_drive_id ON drive_file_cache(drive_id);
CREATE INDEX idx_drive_cache_is_folder ON drive_file_cache(is_folder);

COMMENT ON TABLE drive_file_cache IS 'Cached Google Drive file metadata for fast @mention lookup';
COMMENT ON COLUMN drive_file_cache.content_hash IS 'MD5 hash for detecting content changes';

-- ============================================
-- SECTION 11: Row Level Security (Disabled for dev)
-- ============================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_file_refs DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_outputs DISABLE ROW LEVEL SECURITY;
ALTER TABLE drive_file_cache DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Schema Summary
-- ============================================
-- Total Tables: 11
--
-- User Management: 2
--   - users (with is_system_admin, auth_provider)
--   - user_settings (UI, notifications)
--
-- Workspace Management: 2
--   - workspaces (with website_url)
--   - workspace_members (with invitation support)
--
-- Program Management: 1
--   - programs
--
-- Team Management: 2
--   - teams
--   - team_file_refs
--
-- Chat/Session Management: 3
--   - chat_sessions
--   - messages
--   - session_outputs
--
-- Caching: 1
--   - drive_file_cache
--
-- Note: Agent presets are managed in code, not in DB
-- ============================================
