-- ============================================
-- T-Agent Database Schema
-- Migration: Initial Schema (Consolidated)
-- Generated: 2025-12-22
-- Purpose: TV production AI agent platform
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
  'research',
  'idea_finder',
  'planning',
  'structure',
  'custom'
);

-- Chat & Message Management
CREATE TYPE message_role_enum AS ENUM ('user', 'assistant', 'system');
CREATE TYPE session_status_enum AS ENUM ('active', 'archived', 'deleted');

-- File Reference Management
CREATE TYPE file_ref_type_enum AS ENUM ('file', 'folder');

-- Output/Artifact Management
CREATE TYPE output_status_enum AS ENUM ('draft', 'exported', 'deleted');

-- Todo Management
CREATE TYPE todo_status_enum AS ENUM ('pending', 'in_progress', 'completed');

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

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,

  is_system_admin BOOLEAN DEFAULT false,

  auth_provider auth_provider_enum DEFAULT 'email',
  auth_provider_id TEXT,

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

-- User Settings Table
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  darkmode TEXT NOT NULL DEFAULT 'system',
  theme TEXT NOT NULL DEFAULT 'default',

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

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,

  -- Google Drive OAuth (user-based)
  google_drive_connected BOOLEAN DEFAULT false,
  google_refresh_token TEXT,
  google_token_expires_at TIMESTAMPTZ,

  -- Google Service Account (workspace-level)
  google_service_account_encrypted BYTEA,
  drive_settings JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT slug_length CHECK (LENGTH(slug) BETWEEN 3 AND 30)
);

CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_google_drive_connected ON workspaces(google_drive_connected) WHERE google_drive_connected = true;

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workspaces IS 'Multi-tenant workspaces (production companies)';
COMMENT ON COLUMN workspaces.website_url IS 'Company or organization website URL';
COMMENT ON COLUMN workspaces.google_service_account_encrypted IS 'Encrypted Service Account JSON credentials using pgcrypto';
COMMENT ON COLUMN workspaces.drive_settings IS 'Drive configuration: { "rootFolderId": "...", "outputFolderId": "...", "syncEnabled": true }';

-- ============================================
-- SECTION 5.1: Service Account Encryption Functions
-- ============================================

-- Encrypt Service Account JSON
CREATE OR REPLACE FUNCTION encrypt_service_account(
  service_account_json TEXT,
  encryption_key TEXT
)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(service_account_json, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt Service Account JSON
CREATE OR REPLACE FUNCTION decrypt_service_account(
  encrypted_data BYTEA,
  encryption_key TEXT
)
RETURNS TEXT AS $$
BEGIN
  IF encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(encrypted_data, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Decryption failed: Invalid key or corrupted data';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set workspace service account
CREATE OR REPLACE FUNCTION set_workspace_service_account(
  p_workspace_id UUID,
  p_service_account_json TEXT,
  p_encryption_key TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE workspaces
  SET
    google_service_account_encrypted = encrypt_service_account(p_service_account_json, p_encryption_key),
    google_drive_connected = true,
    updated_at = NOW()
  WHERE id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get workspace service account
CREATE OR REPLACE FUNCTION get_workspace_service_account(
  p_workspace_id UUID,
  p_encryption_key TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_encrypted BYTEA;
BEGIN
  SELECT google_service_account_encrypted
  INTO v_encrypted
  FROM workspaces
  WHERE id = p_workspace_id;

  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN decrypt_service_account(v_encrypted, p_encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workspace Members Table
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  email TEXT,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,

  role workspace_role_enum NOT NULL DEFAULT 'member',
  status member_status_enum DEFAULT 'active',
  joined_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT user_or_email_required CHECK (user_id IS NOT NULL OR email IS NOT NULL),
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
-- SECTION 6: Program Management
-- ============================================

CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  status program_status_enum DEFAULT 'active',

  google_drive_root_id TEXT,
  google_drive_root_name TEXT,
  google_drive_root_url TEXT,

  cover_image_url TEXT,

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
-- SECTION 7: Team Management
-- ============================================

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  agent_type agent_type_enum NOT NULL DEFAULT 'custom',
  system_prompt TEXT,
  output_format_template TEXT,

  output_directory_id TEXT,
  output_directory_name TEXT,
  output_directory_url TEXT,

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

-- Team File References
CREATE TABLE team_file_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  ref_type file_ref_type_enum NOT NULL,
  drive_id TEXT NOT NULL,
  drive_name TEXT NOT NULL,
  drive_path TEXT,
  drive_url TEXT,
  mime_type TEXT,

  include_subfolders BOOLEAN DEFAULT true,

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
-- SECTION 7.1: Team Expanded Files Cache
-- ============================================

-- Expanded files cache table (flattened view of team_file_refs with subfolders)
CREATE TABLE team_expanded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  ref_type file_ref_type_enum NOT NULL,
  drive_id TEXT NOT NULL,
  drive_name TEXT NOT NULL,
  drive_path TEXT,
  mime_type TEXT,

  source_ref_id UUID REFERENCES team_file_refs(id) ON DELETE CASCADE,

  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, drive_id)
);

-- Cache metadata table
CREATE TABLE team_file_cache_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  team_id UUID UNIQUE NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  last_refreshed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_refreshing BOOLEAN DEFAULT false,
  refresh_started_at TIMESTAMPTZ,

  total_files INTEGER DEFAULT 0,
  total_folders INTEGER DEFAULT 0,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_expanded_files_team ON team_expanded_files(team_id);
CREATE INDEX idx_team_expanded_files_source ON team_expanded_files(source_ref_id);
CREATE INDEX idx_team_file_cache_meta_expires ON team_file_cache_meta(expires_at);

CREATE TRIGGER update_team_file_cache_meta_updated_at
  BEFORE UPDATE ON team_file_cache_meta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE team_expanded_files IS 'Pre-expanded file list for @mentions (cache)';
COMMENT ON TABLE team_file_cache_meta IS 'Cache metadata and refresh status';

-- RPC: Get expanded files (with cache check)
CREATE OR REPLACE FUNCTION get_team_expanded_files(
  p_team_id UUID,
  p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS TABLE(
  cache_valid BOOLEAN,
  files JSONB,
  last_refreshed_at TIMESTAMPTZ,
  is_stale BOOLEAN
) AS $$
DECLARE
  v_meta team_file_cache_meta%ROWTYPE;
  v_files JSONB;
BEGIN
  SELECT * INTO v_meta
  FROM team_file_cache_meta
  WHERE team_id = p_team_id;

  IF NOT FOUND THEN
    INSERT INTO team_file_cache_meta (team_id)
    VALUES (p_team_id)
    ON CONFLICT (team_id) DO NOTHING;

    RETURN QUERY SELECT false, '[]'::JSONB, NULL::TIMESTAMPTZ, true;
    RETURN;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'ref_type', ref_type,
      'drive_id', drive_id,
      'drive_name', drive_name,
      'drive_path', drive_path,
      'mime_type', mime_type,
      'display_order', display_order
    ) ORDER BY display_order, drive_path, drive_name
  )
  INTO v_files
  FROM team_expanded_files
  WHERE team_id = p_team_id;

  IF v_meta.expires_at IS NOT NULL AND v_meta.expires_at > NOW() THEN
    RETURN QUERY SELECT true, COALESCE(v_files, '[]'::JSONB), v_meta.last_refreshed_at, false;
  ELSE
    RETURN QUERY SELECT
      COALESCE(v_files, '[]'::JSONB) != '[]'::JSONB,
      COALESCE(v_files, '[]'::JSONB),
      v_meta.last_refreshed_at,
      true;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- RPC: Lock cache for refresh
CREATE OR REPLACE FUNCTION lock_team_file_cache(
  p_team_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_lock_timeout INTERVAL := INTERVAL '2 minutes';
BEGIN
  UPDATE team_file_cache_meta
  SET is_refreshing = true, refresh_started_at = NOW()
  WHERE team_id = p_team_id
    AND (
      is_refreshing = false
      OR refresh_started_at < NOW() - v_lock_timeout
    );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- RPC: Update expanded files cache
CREATE OR REPLACE FUNCTION update_team_expanded_files(
  p_team_id UUID,
  p_files JSONB,
  p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM team_expanded_files WHERE team_id = p_team_id;

  INSERT INTO team_expanded_files (
    team_id, ref_type, drive_id, drive_name, drive_path, mime_type, display_order
  )
  SELECT
    p_team_id,
    (f->>'ref_type')::file_ref_type_enum,
    f->>'drive_id',
    f->>'drive_name',
    f->>'drive_path',
    f->>'mime_type',
    COALESCE((f->>'display_order')::INTEGER, 0)
  FROM jsonb_array_elements(p_files) AS f
  ON CONFLICT (team_id, drive_id) DO UPDATE
  SET
    ref_type = EXCLUDED.ref_type,
    drive_name = EXCLUDED.drive_name,
    drive_path = EXCLUDED.drive_path,
    mime_type = EXCLUDED.mime_type,
    display_order = EXCLUDED.display_order;

  INSERT INTO team_file_cache_meta (
    team_id, last_refreshed_at, expires_at, is_refreshing, total_files, total_folders
  )
  VALUES (
    p_team_id,
    NOW(),
    NOW() + (p_ttl_seconds || ' seconds')::INTERVAL,
    false,
    (SELECT COUNT(*) FROM jsonb_array_elements(p_files) AS f WHERE f->>'ref_type' = 'file'),
    (SELECT COUNT(*) FROM jsonb_array_elements(p_files) AS f WHERE f->>'ref_type' = 'folder')
  )
  ON CONFLICT (team_id) DO UPDATE
  SET
    last_refreshed_at = NOW(),
    expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL,
    is_refreshing = false,
    refresh_started_at = NULL,
    total_files = EXCLUDED.total_files,
    total_folders = EXCLUDED.total_folders,
    error_message = NULL,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- RPC: Release cache lock on error
CREATE OR REPLACE FUNCTION release_team_file_cache_lock(
  p_team_id UUID,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE team_file_cache_meta
  SET
    is_refreshing = false,
    refresh_started_at = NULL,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE team_id = p_team_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_team_expanded_files IS 'Get cached expanded files with staleness check';
COMMENT ON FUNCTION update_team_expanded_files IS 'Update expanded files cache';

-- ============================================
-- SECTION 8: Chat Session Management
-- ============================================

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  title TEXT,
  status session_status_enum DEFAULT 'active',
  mode TEXT DEFAULT 'default',

  claude_session_id TEXT,

  message_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_team ON chat_sessions(team_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_mode ON chat_sessions(mode);
CREATE INDEX idx_chat_sessions_created_by ON chat_sessions(created_by);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE chat_sessions IS 'Chat conversation sessions per team';
COMMENT ON COLUMN chat_sessions.claude_session_id IS 'Claude Agent SDK session ID for conversation continuity';
COMMENT ON COLUMN chat_sessions.mode IS 'Agent mode used for this session (e.g., default, deep-research, neta-researcher)';

-- Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  role message_role_enum NOT NULL,
  content TEXT NOT NULL,

  file_attachments JSONB DEFAULT '[]'::jsonb,
  tool_calls JSONB DEFAULT '[]'::jsonb,

  model TEXT,
  token_usage JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_file_attachments ON messages USING GIN(file_attachments);

COMMENT ON TABLE messages IS 'Individual chat messages';
COMMENT ON COLUMN messages.user_id IS 'The user who sent this message (null for assistant messages)';
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
-- SECTION 8.1: Session Todos
-- ============================================

CREATE TABLE session_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  status todo_status_enum NOT NULL DEFAULT 'pending',
  active_form TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_todos_session ON session_todos(session_id);
CREATE INDEX idx_session_todos_status ON session_todos(status);
CREATE INDEX idx_session_todos_sort_order ON session_todos(session_id, sort_order);

CREATE TRIGGER update_session_todos_updated_at
  BEFORE UPDATE ON session_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE session_todos IS 'Task list items per chat session (Claude Code TodoWrite)';
COMMENT ON COLUMN session_todos.content IS 'Task description text';
COMMENT ON COLUMN session_todos.status IS 'Task status: pending, in_progress, completed';
COMMENT ON COLUMN session_todos.active_form IS 'Present tense description shown during execution';
COMMENT ON COLUMN session_todos.sort_order IS 'Display order of tasks';

-- ============================================
-- SECTION 8.2: Session Generated Files
-- ============================================

CREATE TABLE session_generated_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,

  file_path TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,

  storage_path TEXT,
  storage_bucket TEXT,

  -- Google Drive info
  drive_id TEXT,
  drive_url TEXT,
  upload_status TEXT DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, file_path)
);

CREATE INDEX idx_session_generated_files_session ON session_generated_files(session_id);
CREATE INDEX idx_session_generated_files_created_at ON session_generated_files(session_id, created_at);
CREATE INDEX idx_session_generated_files_drive_id ON session_generated_files(drive_id) WHERE drive_id IS NOT NULL;

COMMENT ON TABLE session_generated_files IS 'Files created during chat sessions (Claude Code file_created events)';
COMMENT ON COLUMN session_generated_files.file_path IS 'Original file path from Claude Code';
COMMENT ON COLUMN session_generated_files.file_name IS 'Extracted filename';
COMMENT ON COLUMN session_generated_files.file_type IS 'File extension/type (md, png, pdf, etc)';
COMMENT ON COLUMN session_generated_files.storage_path IS 'Path in Supabase Storage (if uploaded)';
COMMENT ON COLUMN session_generated_files.storage_bucket IS 'Supabase Storage bucket name';
COMMENT ON COLUMN session_generated_files.drive_id IS 'Google Drive file ID';
COMMENT ON COLUMN session_generated_files.drive_url IS 'Google Drive webViewLink URL';
COMMENT ON COLUMN session_generated_files.upload_status IS 'Upload status: pending, uploading, completed, error';

-- ============================================
-- SECTION 9: Output/Artifact Management
-- ============================================

CREATE TABLE session_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  content TEXT NOT NULL,

  status output_status_enum DEFAULT 'draft',

  exported_drive_id TEXT,
  exported_drive_url TEXT,
  exported_at TIMESTAMPTZ,

  output_type TEXT,

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

CREATE TABLE drive_file_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  drive_id TEXT NOT NULL,
  parent_id TEXT,

  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  is_folder BOOLEAN NOT NULL,

  size_bytes BIGINT,
  web_view_link TEXT,
  icon_link TEXT,

  content_hash TEXT,
  content_cached_at TIMESTAMPTZ,

  drive_modified_at TIMESTAMPTZ,
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
-- SECTION 10.1: Drive Folder Cache (TTL-based)
-- ============================================

CREATE TABLE drive_folder_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,

  children_json JSONB NOT NULL DEFAULT '{"folders":[],"files":[]}'::jsonb,
  folder_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(COALESCE(children_json->'folders', '[]'::jsonb))) STORED,
  file_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(COALESCE(children_json->'files', '[]'::jsonb))) STORED,

  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 seconds'),

  is_refreshing BOOLEAN DEFAULT false,
  refresh_started_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(workspace_id, folder_id)
);

CREATE INDEX idx_folder_cache_lookup ON drive_folder_cache(workspace_id, folder_id);
CREATE INDEX idx_folder_cache_expires ON drive_folder_cache(expires_at);
CREATE INDEX idx_folder_cache_refreshing ON drive_folder_cache(is_refreshing) WHERE is_refreshing = true;

CREATE TRIGGER update_drive_folder_cache_updated_at
  BEFORE UPDATE ON drive_folder_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE drive_folder_cache IS 'TTL-based cache for Google Drive folder listings with concurrency control';
COMMENT ON COLUMN drive_folder_cache.children_json IS 'Cached folder contents: {folders: DriveFolder[], files: DriveFile[]}';
COMMENT ON COLUMN drive_folder_cache.expires_at IS 'Cache expiration time (default 30s TTL)';
COMMENT ON COLUMN drive_folder_cache.is_refreshing IS 'Lock flag to prevent thundering herd problem';

-- RPC: Get or lock folder cache
CREATE OR REPLACE FUNCTION get_or_lock_folder_cache(
  p_workspace_id UUID,
  p_folder_id TEXT,
  p_ttl_seconds INTEGER DEFAULT 30
)
RETURNS TABLE(
  cache_hit BOOLEAN,
  is_locked BOOLEAN,
  children_json JSONB,
  cached_at TIMESTAMPTZ
) AS $$
DECLARE
  v_cache drive_folder_cache%ROWTYPE;
  v_lock_timeout INTERVAL := INTERVAL '30 seconds';
BEGIN
  SELECT * INTO v_cache
  FROM drive_folder_cache
  WHERE workspace_id = p_workspace_id AND folder_id = p_folder_id
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO drive_folder_cache (workspace_id, folder_id, is_refreshing, refresh_started_at, children_json)
      VALUES (p_workspace_id, p_folder_id, true, NOW(), '{"folders":[],"files":[]}'::jsonb)
      RETURNING * INTO v_cache;

      RETURN QUERY SELECT false, true, NULL::JSONB, NULL::TIMESTAMPTZ;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      SELECT * INTO v_cache
      FROM drive_folder_cache
      WHERE workspace_id = p_workspace_id AND folder_id = p_folder_id;
    END;
  END IF;

  IF v_cache.expires_at > NOW() AND NOT v_cache.is_refreshing THEN
    RETURN QUERY SELECT true, false, v_cache.children_json, v_cache.cached_at;
    RETURN;
  END IF;

  IF v_cache.is_refreshing AND v_cache.refresh_started_at > NOW() - v_lock_timeout THEN
    IF v_cache.children_json IS NOT NULL AND
       jsonb_array_length(COALESCE(v_cache.children_json->'folders', '[]'::jsonb)) > 0 OR
       jsonb_array_length(COALESCE(v_cache.children_json->'files', '[]'::jsonb)) > 0 THEN
      RETURN QUERY SELECT true, false, v_cache.children_json, v_cache.cached_at;
    ELSE
      RETURN QUERY SELECT false, false, NULL::JSONB, NULL::TIMESTAMPTZ;
    END IF;
    RETURN;
  END IF;

  UPDATE drive_folder_cache
  SET is_refreshing = true, refresh_started_at = NOW()
  WHERE workspace_id = p_workspace_id AND folder_id = p_folder_id;

  RETURN QUERY SELECT
    CASE WHEN v_cache.children_json IS NOT NULL THEN true ELSE false END,
    true,
    v_cache.children_json,
    v_cache.cached_at;
END;
$$ LANGUAGE plpgsql;

-- RPC: Update folder cache
CREATE OR REPLACE FUNCTION update_folder_cache(
  p_workspace_id UUID,
  p_folder_id TEXT,
  p_children_json JSONB,
  p_ttl_seconds INTEGER DEFAULT 30
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO drive_folder_cache (
    workspace_id, folder_id, children_json,
    cached_at, expires_at,
    is_refreshing, refresh_started_at
  )
  VALUES (
    p_workspace_id, p_folder_id, p_children_json,
    NOW(), NOW() + (p_ttl_seconds || ' seconds')::INTERVAL,
    false, NULL
  )
  ON CONFLICT (workspace_id, folder_id) DO UPDATE
  SET
    children_json = EXCLUDED.children_json,
    cached_at = NOW(),
    expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL,
    is_refreshing = false,
    refresh_started_at = NULL,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- RPC: Invalidate folder cache
CREATE OR REPLACE FUNCTION invalidate_folder_cache(
  p_workspace_id UUID,
  p_folder_id TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_folder_id IS NOT NULL THEN
    DELETE FROM drive_folder_cache
    WHERE workspace_id = p_workspace_id AND folder_id = p_folder_id;
  ELSE
    DELETE FROM drive_folder_cache
    WHERE workspace_id = p_workspace_id;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- RPC: Cleanup stale locks
CREATE OR REPLACE FUNCTION cleanup_stale_folder_locks()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE drive_folder_cache
  SET is_refreshing = false, refresh_started_at = NULL
  WHERE is_refreshing = true
    AND refresh_started_at < NOW() - INTERVAL '30 seconds';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_or_lock_folder_cache IS 'Get cached data or acquire lock for refresh (stale-while-revalidate)';
COMMENT ON FUNCTION update_folder_cache IS 'Update cache data and release lock';
COMMENT ON FUNCTION invalidate_folder_cache IS 'Invalidate cache for folder or workspace';
COMMENT ON FUNCTION cleanup_stale_folder_locks IS 'Release stale locks from crashed processes';

-- ============================================
-- SECTION 11: Storage Buckets
-- ============================================

-- Avatars bucket for user profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Workspace logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-logos',
  'workspace-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Program cover images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'program-covers',
  'program-covers',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Attachments bucket for chat message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown', 'application/json']
) ON CONFLICT (id) DO NOTHING;

-- Exports bucket for generated outputs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  false,
  104857600,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/markdown', 'application/json']
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 12: Storage RLS Policies
-- ============================================

-- Avatars
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth write avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Workspace logos
CREATE POLICY "Public read workspace-logos" ON storage.objects FOR SELECT USING (bucket_id = 'workspace-logos');
CREATE POLICY "Auth write workspace-logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'workspace-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update workspace-logos" ON storage.objects FOR UPDATE USING (bucket_id = 'workspace-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete workspace-logos" ON storage.objects FOR DELETE USING (bucket_id = 'workspace-logos' AND auth.role() = 'authenticated');

-- Program covers
CREATE POLICY "Public read program-covers" ON storage.objects FOR SELECT USING (bucket_id = 'program-covers');
CREATE POLICY "Auth write program-covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'program-covers' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update program-covers" ON storage.objects FOR UPDATE USING (bucket_id = 'program-covers' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete program-covers" ON storage.objects FOR DELETE USING (bucket_id = 'program-covers' AND auth.role() = 'authenticated');

-- Attachments
CREATE POLICY "Public read attachments" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
CREATE POLICY "Auth write attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete attachments" ON storage.objects FOR DELETE USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');

-- Exports
CREATE POLICY "Public read exports" ON storage.objects FOR SELECT USING (bucket_id = 'exports');
CREATE POLICY "Auth write exports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exports' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete exports" ON storage.objects FOR DELETE USING (bucket_id = 'exports' AND auth.role() = 'authenticated');

-- ============================================
-- SECTION 13: Row Level Security (Not enabled for dev)
-- ============================================
-- RLS is intentionally NOT enabled for local development
-- All tables remain accessible without RLS policies
-- For production, enable RLS and add appropriate policies

-- Note: Tables are created without RLS enabled by default
-- To enable RLS in production, uncomment and modify the following:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE team_file_refs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE team_expanded_files ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE team_file_cache_meta ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_todos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_generated_files ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_outputs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE drive_file_cache ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE drive_folder_cache ENABLE ROW LEVEL SECURITY;
