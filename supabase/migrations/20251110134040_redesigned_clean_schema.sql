-- ============================================
-- United Production V1 - Redesigned Clean Schema
-- Generated: 2025-11-10
-- Updated: 2025-11-12 (Added document_sessions for Google ADK)
-- Purpose: Simplified schema with removed redundancies
-- Changes:
--   - ui_state deleted → integrated into user_preferences
--   - instance_tags/program_tags merged → unified tags table (tag_type column)
--   - execution_plans deleted
--   - document_versions merged → artifacts table
--   - chat_sessions removed (managed outside DB)
--   - files table removed (to be added later)
--   - Redundant columns removed (~30 columns)
--   - documents.program_ids → document_programs junction table
--   - document_refs: purpose extracted from metadata to dedicated column
--   - instance_members: invited_by/invited_at → invitation_id FK
--   - programs: added cover_image_url, audience_target, url
--   - artifacts: simplified (removed session_id, file_url, status, ai_model, approval workflow, iteration tracking)
--   - document_sessions: added for Google ADK session management (2025-11-12)
-- ============================================

-- ============================================
-- SECTION 1: Extensions
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Full-text search enhancement
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions

-- ============================================
-- SECTION 2: ENUM Types
-- ============================================

-- System and Authentication
CREATE TYPE system_role_enum AS ENUM ('system_admin', 'user');
CREATE TYPE sso_provider_enum AS ENUM ('email', 'google', 'azure', 'github');
CREATE TYPE language_enum AS ENUM ('ja', 'en');
CREATE TYPE notification_frequency_enum AS ENUM ('realtime', 'hourly', 'daily', 'never');

-- Instance Management
CREATE TYPE instance_role_enum AS ENUM ('instance_admin', 'instance_user');
CREATE TYPE member_status_enum AS ENUM ('active', 'inactive', 'invited');
CREATE TYPE contract_type_enum AS ENUM ('trial', 'basic', 'professional', 'enterprise');
CREATE TYPE invitation_status_enum AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');

-- Program Management
CREATE TYPE program_status_enum AS ENUM ('active', 'archived', 'completed');
CREATE TYPE program_role_enum AS ENUM ('owner', 'editor', 'member', 'viewer');

-- Document Management
CREATE TYPE document_type_enum AS ENUM ('file', 'text', 'link');
CREATE TYPE file_category_enum AS ENUM (
  'minutes_audio',
  'minutes_transcription',
  'research_report',
  'structure_report',
  'general'
);

-- Tag System
CREATE TYPE tag_type_enum AS ENUM ('instance', 'program');

-- ============================================
-- SECTION 3: Helper Functions
-- ============================================

-- Auto-update updated_at timestamp
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
  -- Primary Key (linked to auth.users)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,

  -- SSO Provider Tracking
  sso_provider sso_provider_enum,

  -- System Role (global role across all instances)
  system_role system_role_enum DEFAULT 'user',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_system_role ON users(system_role);
CREATE INDEX idx_users_sso_provider ON users(sso_provider);

-- RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE users IS 'User information (extends auth.users)';
COMMENT ON COLUMN users.system_role IS 'System role (system_admin/user)';

-- --------------------------------------------
-- 4.2 User Settings Table
-- --------------------------------------------

CREATE TABLE user_settings (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- UI Preferences
  darkmode TEXT NOT NULL DEFAULT 'system', -- light, dark, or system
  theme TEXT NOT NULL DEFAULT 'default', -- default, ocean, sunset, forest, lavender, rose, slate, amber
  language language_enum DEFAULT 'ja',
  timezone TEXT DEFAULT 'Asia/Tokyo',

  -- Notification Settings
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  notification_frequency notification_frequency_enum DEFAULT 'realtime',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- RLS
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_settings IS 'User personal settings';

-- ============================================
-- SECTION 5: Core Tables - Instance Management
-- ============================================

-- --------------------------------------------
-- 5.1 Instances Table
-- --------------------------------------------

CREATE TABLE instances (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT slug_length CHECK (LENGTH(slug) BETWEEN 3 AND 20)
);

-- Indexes
CREATE INDEX idx_instances_slug ON instances(slug);
CREATE INDEX idx_instances_created_at ON instances(created_at DESC);

-- RLS
ALTER TABLE instances DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_instances_updated_at
  BEFORE UPDATE ON instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE instances IS 'Multi-tenant workspaces';
COMMENT ON COLUMN instances.slug IS 'Subdomain slug (e.g., {domain}/{slug})';

-- --------------------------------------------
-- 5.2 Instance Members Table
-- --------------------------------------------

CREATE TABLE instance_members (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitation_id UUID, -- FK constraint added later after instance_invitations table is created

  -- Instance Role (role within workspace)
  instance_role instance_role_enum NOT NULL,

  -- Status
  status member_status_enum DEFAULT 'active',

  -- Membership date
  joined_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique Constraint
  UNIQUE(instance_id, user_id)
);

-- Indexes
CREATE INDEX idx_instance_members_instance_id ON instance_members(instance_id);
CREATE INDEX idx_instance_members_user_id ON instance_members(user_id);
CREATE INDEX idx_instance_members_invitation_id ON instance_members(invitation_id) WHERE invitation_id IS NOT NULL;
CREATE INDEX idx_instance_members_role ON instance_members(instance_role);
CREATE INDEX idx_instance_members_status ON instance_members(status);
CREATE INDEX idx_instance_members_instance_user ON instance_members(instance_id, user_id);

-- RLS
ALTER TABLE instance_members DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_instance_members_updated_at
  BEFORE UPDATE ON instance_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE instance_members IS 'Workspace members (users ↔ instances join table)';
COMMENT ON COLUMN instance_members.invitation_id IS 'References instance_invitations for audit trail (NULL for direct members like instance creator)';

-- --------------------------------------------
-- 5.3 Instance Settings Table
-- --------------------------------------------

CREATE TABLE instance_settings (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  instance_id UUID UNIQUE NOT NULL REFERENCES instances(id) ON DELETE CASCADE,

  -- Contract Info
  contract_type contract_type_enum DEFAULT 'trial',
  contract_start_date DATE,
  contract_end_date DATE,
  max_users INTEGER DEFAULT 5,
  max_storage_gb INTEGER DEFAULT 10,

  -- Feature Flags
  features JSONB DEFAULT '{
    "ai_transcription": true,
    "ai_minutes": true,
    "web_research": true,
    "custom_branding": true
  }'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_instance_settings_instance_id ON instance_settings(instance_id);
CREATE INDEX idx_instance_settings_features ON instance_settings USING GIN(features);

-- RLS
ALTER TABLE instance_settings DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_instance_settings_updated_at
  BEFORE UPDATE ON instance_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE instance_settings IS 'Workspace contract and feature settings';
COMMENT ON COLUMN instance_settings.features IS 'Feature flags (JSONB)';

-- --------------------------------------------
-- 5.4 Instance Invitations Table
-- --------------------------------------------

CREATE TABLE instance_invitations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL if user doesn't exist yet

  -- Invitation Details
  invited_email TEXT NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  instance_role instance_role_enum NOT NULL,

  -- Status and Lifecycle
  status invitation_status_enum NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_email_format
    CHECK (invited_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_expiration
    CHECK (expires_at > created_at)
);

-- Unique index: Only one pending invitation per email per instance
CREATE UNIQUE INDEX idx_unique_pending_invitation
  ON instance_invitations(instance_id, LOWER(invited_email))
  WHERE status = 'pending';

-- Indexes
CREATE INDEX idx_invitations_instance ON instance_invitations(instance_id);
CREATE INDEX idx_invitations_email ON instance_invitations(LOWER(invited_email))
  WHERE status = 'pending';
CREATE INDEX idx_invitations_token ON instance_invitations(invitation_token);
CREATE INDEX idx_invitations_expires ON instance_invitations(expires_at)
  WHERE status = 'pending';
CREATE INDEX idx_invitations_invited_by ON instance_invitations(invited_by);
CREATE INDEX idx_invitations_status ON instance_invitations(status);

-- RLS
ALTER TABLE instance_invitations DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_instance_invitations_updated_at
  BEFORE UPDATE ON instance_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE instance_invitations IS 'Workspace member invitations';

-- Add foreign key constraint to instance_members.invitation_id (created earlier)
ALTER TABLE instance_members
  ADD CONSTRAINT fk_instance_members_invitation
  FOREIGN KEY (invitation_id)
  REFERENCES instance_invitations(id)
  ON DELETE SET NULL;

-- --------------------------------------------
-- 5.5 User Preferences Table (UI State + Preferences)
-- --------------------------------------------

CREATE TABLE user_preferences (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,

  -- Preference Data (includes UI state from old ui_state table)
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_instance_preference UNIQUE(user_id, instance_id, preference_key)
);

-- Indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_instance_id ON user_preferences(instance_id);
CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key);
CREATE INDEX idx_user_preferences_user_instance ON user_preferences(user_id, instance_id);

-- RLS
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_preferences IS 'User preferences and UI state per instance (merged from ui_state)';
COMMENT ON COLUMN user_preferences.preference_key IS 'e.g., "file_tree_expanded", "sidebar_width", "panel_states"';
COMMENT ON COLUMN user_preferences.preference_value IS 'JSONB value for the preference';

-- ============================================
-- SECTION 6: Core Tables - Program Management
-- ============================================

-- --------------------------------------------
-- 6.1 Programs Table
-- --------------------------------------------

CREATE TABLE programs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  status program_status_enum DEFAULT 'active',

  -- Program Details
  cover_image_url TEXT,
  audience_target TEXT,
  url TEXT,

  -- Relationships
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Dates
  start_date DATE,
  end_date DATE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_programs_instance_id ON programs(instance_id);
CREATE INDEX idx_programs_created_by ON programs(created_by);
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_created_at ON programs(created_at DESC);

-- RLS
ALTER TABLE programs DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE programs IS 'Broadcast programs/podcasts';
COMMENT ON COLUMN programs.cover_image_url IS 'Program cover image URL';
COMMENT ON COLUMN programs.audience_target IS 'Target audience description';
COMMENT ON COLUMN programs.url IS 'Program website or streaming URL';

-- --------------------------------------------
-- 6.2 Program Members Table
-- --------------------------------------------

CREATE TABLE program_members (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Program Role (role within program)
  program_role program_role_enum DEFAULT 'member',

  -- Assignment Info
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique Constraint
  UNIQUE(program_id, user_id)
);

-- Indexes
CREATE INDEX idx_program_members_program_id ON program_members(program_id);
CREATE INDEX idx_program_members_user_id ON program_members(user_id);
CREATE INDEX idx_program_members_role ON program_members(program_role);
CREATE INDEX idx_program_members_program_user ON program_members(program_id, user_id);

-- RLS
ALTER TABLE program_members DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_program_members_updated_at
  BEFORE UPDATE ON program_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE program_members IS 'Program members (users ↔ programs join table)';

-- ============================================
-- SECTION 7: Core Tables - Document Management
-- ============================================

-- --------------------------------------------
-- 7.1 Documents Table (Simplified)
-- --------------------------------------------

CREATE TABLE documents (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,

  -- Category (unified from type + file_category)
  category file_category_enum NOT NULL,

  -- Relationships
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documents_instance_id ON documents(instance_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- RLS
ALTER TABLE documents DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE documents IS 'Document metadata (simplified - no file info, managed in artifacts)';
COMMENT ON COLUMN documents.category IS 'Document category (minutes_audio, research_report, etc.)';

-- --------------------------------------------
-- 7.2 Document Programs Junction Table (NEW)
-- --------------------------------------------

CREATE TABLE document_programs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique Constraint
  UNIQUE(document_id, program_id)
);

-- Indexes
CREATE INDEX idx_document_programs_document_id ON document_programs(document_id);
CREATE INDEX idx_document_programs_program_id ON document_programs(program_id);

-- RLS
ALTER TABLE document_programs DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Comments
COMMENT ON TABLE document_programs IS 'Many-to-many: documents ↔ programs (replaces program_ids array)';

-- --------------------------------------------
-- 7.3 Document References Table (Polymorphic)
-- --------------------------------------------

CREATE TABLE document_refs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source Document
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Polymorphic Reference
  ref_type TEXT NOT NULL CHECK (ref_type IN ('document', 'url')),
  referenced_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

  -- Selection State
  is_selected BOOLEAN NOT NULL DEFAULT true,

  -- Purpose
  purpose TEXT,

  -- Metadata (stores URL for url type, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Type-specific constraints
  CHECK (
    (ref_type = 'document' AND referenced_document_id IS NOT NULL) OR
    (ref_type = 'url' AND referenced_document_id IS NULL AND metadata ? 'url')
  ),

  -- Prevent duplicates
  UNIQUE(document_id, ref_type, referenced_document_id)
);

-- Indexes
CREATE INDEX idx_document_refs_document ON document_refs(document_id);
CREATE INDEX idx_document_refs_ref_type ON document_refs(ref_type);
CREATE INDEX idx_document_refs_referenced_document ON document_refs(referenced_document_id);
CREATE INDEX idx_document_refs_selected ON document_refs(is_selected);
CREATE INDEX idx_document_refs_created_at ON document_refs(created_at DESC);
CREATE INDEX idx_document_refs_metadata ON document_refs USING GIN(metadata);

-- RLS
ALTER TABLE document_refs DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_document_refs_updated_at
  BEFORE UPDATE ON document_refs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE document_refs IS 'Polymorphic references: documents → documents/URLs';
COMMENT ON COLUMN document_refs.purpose IS 'Reference purpose (research, background, citation, etc.)';
COMMENT ON COLUMN document_refs.metadata IS 'Stores url and additional metadata';

-- --------------------------------------------
-- 7.4 Document Sessions Table (Google ADK Integration)
-- --------------------------------------------

CREATE TABLE document_sessions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Google ADK Session
  session_id TEXT NOT NULL,

  -- Session metadata
  title TEXT, -- Optional session title/description

  -- Active session tracking
  is_active BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT session_id_not_empty CHECK (LENGTH(session_id) > 0)
);

-- Standard indexes
CREATE INDEX idx_document_sessions_document_id ON document_sessions(document_id);
CREATE INDEX idx_document_sessions_user_id ON document_sessions(user_id);
CREATE INDEX idx_document_sessions_session_id ON document_sessions(session_id);
CREATE INDEX idx_document_sessions_created_by ON document_sessions(created_by);
CREATE INDEX idx_document_sessions_last_used_at ON document_sessions(last_used_at DESC);
CREATE INDEX idx_document_sessions_created_at ON document_sessions(created_at DESC);
CREATE INDEX idx_document_sessions_document_user ON document_sessions(document_id, user_id);

-- CRITICAL: Only ONE active session per (document + user) combination
-- UNIQUE PARTIAL INDEX ensures is_active = true exists only once per document-user pair
CREATE UNIQUE INDEX idx_document_sessions_active_per_document_user
  ON document_sessions(document_id, user_id)
  WHERE is_active = true;

-- RLS
ALTER TABLE document_sessions DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_document_sessions_updated_at
  BEFORE UPDATE ON document_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-deactivate other sessions when a session is activated
CREATE OR REPLACE FUNCTION deactivate_other_document_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- If this session is being activated (is_active = true)
  IF NEW.is_active = true THEN
    -- Deactivate all other sessions for this document-user pair
    UPDATE document_sessions
    SET is_active = false
    WHERE document_id = NEW.document_id
      AND user_id = NEW.user_id
      AND id != NEW.id
      AND is_active = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deactivate_other_sessions_trigger
  BEFORE INSERT OR UPDATE OF is_active ON document_sessions
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_other_document_sessions();

-- Comments
COMMENT ON TABLE document_sessions IS 'Google ADK sessions for documents (multiple sessions per document-user pair)';
COMMENT ON COLUMN document_sessions.user_id IS 'User who owns this session (session_id linked to user_id in ADK)';
COMMENT ON COLUMN document_sessions.session_id IS 'Google ADK session ID for session restoration';
COMMENT ON COLUMN document_sessions.is_active IS 'Only one active session per (document + user) pair (enforced by UNIQUE INDEX)';
COMMENT ON COLUMN document_sessions.last_used_at IS 'Track when session was last accessed';
COMMENT ON COLUMN document_sessions.title IS 'Optional session title/description';

-- ============================================
-- SECTION 8: Core Tables - Tag System (Unified)
-- ============================================

-- --------------------------------------------
-- 8.1 Tags Table (Unified - instance + program)
-- --------------------------------------------

CREATE TABLE tags (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tag Type: instance (workspace-wide) or program (program-specific)
  tag_type tag_type_enum NOT NULL,

  -- Relationships
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',

  -- Audit
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT tags_tag_type_program_check CHECK (
    (tag_type = 'instance' AND program_id IS NULL) OR
    (tag_type = 'program' AND program_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_tags_instance ON tags(instance_id);
CREATE INDEX idx_tags_program ON tags(program_id) WHERE program_id IS NOT NULL;
CREATE INDEX idx_tags_tag_type ON tags(tag_type);
CREATE INDEX idx_tags_created_at ON tags(created_at DESC);

-- Unique constraints (case-insensitive)
CREATE UNIQUE INDEX idx_tags_instance_name
  ON tags(instance_id, LOWER(name))
  WHERE tag_type = 'instance';

CREATE UNIQUE INDEX idx_tags_program_name
  ON tags(program_id, LOWER(name))
  WHERE tag_type = 'program';

-- RLS
ALTER TABLE tags DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE tags IS 'Unified tag system: instance-level and program-level (merged from instance_tags/program_tags)';
COMMENT ON COLUMN tags.tag_type IS 'Tag type: instance (workspace-wide) or program (program-specific)';
COMMENT ON COLUMN tags.program_id IS 'NULL for instance tags, set for program tags';

-- --------------------------------------------
-- 8.2 Document Tags Junction (Simplified)
-- --------------------------------------------

CREATE TABLE document_tags (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

  -- Program context: NULL for instance tags, program_id for program tags
  program_context UUID REFERENCES programs(id) ON DELETE CASCADE,

  -- Audit
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique: Same tag can't be applied twice to same document in same context
  UNIQUE(document_id, tag_id, program_context)
);

-- Indexes
CREATE INDEX idx_document_tags_document ON document_tags(document_id);
CREATE INDEX idx_document_tags_tag ON document_tags(tag_id);
CREATE INDEX idx_document_tags_context ON document_tags(program_context);
CREATE INDEX idx_document_tags_doc_context ON document_tags(document_id, program_context);

-- RLS
ALTER TABLE document_tags DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Comments
COMMENT ON TABLE document_tags IS 'Many-to-many: documents ↔ tags (simplified from XOR constraint)';
COMMENT ON COLUMN document_tags.program_context IS 'Program context: NULL = instance tag, UUID = program tag';

-- ============================================
-- SECTION 9: Agent V2 Tables (Simplified)
-- ============================================

-- --------------------------------------------
-- 9.1 Artifacts Table (Merged with document_versions)
-- --------------------------------------------

CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Artifact metadata
  title TEXT NOT NULL,
  artifact_type TEXT NOT NULL, -- 'report', 'analysis', 'plan', 'minutes', 'research', 'document_version'
  version TEXT NOT NULL, -- V1_step1, V1_step2, V2_step1, OR version_1, version_2 for document versions

  -- Content and storage (merged from document_versions)
  content JSONB NOT NULL, -- For AI artifacts: { markdown, metadata }, For versions: { text, metadata }
  storage_path TEXT, -- Supabase Storage path (generate signed URL dynamically from this)
  file_size_bytes INT,

  -- AI generation metadata (from document_versions)
  prompt_summary TEXT,
  purpose TEXT,
  reference_snapshot JSONB, -- References used for generation

  -- Flags
  manually_edited BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,

  -- Creation metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_artifacts_instance_id ON artifacts(instance_id);
CREATE INDEX idx_artifacts_document_id ON artifacts(document_id);
CREATE INDEX idx_artifacts_artifact_type ON artifacts(artifact_type);
CREATE INDEX idx_artifacts_version ON artifacts(version);
CREATE INDEX idx_artifacts_created_by ON artifacts(created_by);
CREATE INDEX idx_artifacts_created_at ON artifacts(created_at DESC);
CREATE INDEX idx_artifacts_active ON artifacts(document_id) WHERE is_deleted = false;

-- RLS
ALTER TABLE artifacts DISABLE ROW LEVEL SECURITY; -- Disabled for pre-release

-- Triggers
CREATE TRIGGER trigger_artifacts_updated_at
  BEFORE UPDATE ON artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE artifacts IS 'Generated artifacts with versioning (merged with document_versions)';
COMMENT ON COLUMN artifacts.artifact_type IS 'report/analysis/plan/minutes/research/document_version';
COMMENT ON COLUMN artifacts.version IS 'V{iteration}_step{step_number} or version_{number}';
COMMENT ON COLUMN artifacts.content IS 'JSONB: AI artifacts or document version content';

-- ============================================
-- SECTION 10: Validation Functions
-- ============================================

-- Validate document-tag context matching
CREATE OR REPLACE FUNCTION validate_document_tag_context()
RETURNS TRIGGER AS $$
DECLARE
  tag_tag_type tag_type_enum;
  tag_program_id UUID;
BEGIN
  -- Get tag info
  SELECT tag_type, program_id INTO tag_tag_type, tag_program_id
  FROM tags
  WHERE id = NEW.tag_id;

  -- Rule 1: Instance tags MUST have NULL program_context
  IF tag_tag_type = 'instance' AND NEW.program_context IS NOT NULL THEN
    RAISE EXCEPTION 'Instance tags cannot have program_context (got %)',
      NEW.program_context;
  END IF;

  -- Rule 2: Program tags MUST have program_context matching tag.program_id
  IF tag_tag_type = 'program' AND NEW.program_context != tag_program_id THEN
    RAISE EXCEPTION 'Program tag context (%) must match tag.program_id (%)',
      NEW.program_context, tag_program_id;
  END IF;

  -- Rule 3: Document must belong to program for program tags
  IF tag_tag_type = 'program' THEN
    IF NOT EXISTS (
      SELECT 1 FROM document_programs
      WHERE document_id = NEW.document_id
        AND program_id = NEW.program_context
    ) THEN
      RAISE EXCEPTION 'Document not in program (%) - cannot use its tags',
        NEW.program_context;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to document_tags
CREATE TRIGGER validate_document_tag_context_trigger
  BEFORE INSERT OR UPDATE ON document_tags
  FOR EACH ROW
  EXECUTE FUNCTION validate_document_tag_context();

-- ============================================
-- SECTION 11: Storage Buckets
-- ============================================

-- --------------------------------------------
-- 11.1 Create Storage Buckets
-- --------------------------------------------

-- User profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-profiles',
  'user-profiles',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Instance profile images (logos, covers)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'instance-profiles',
  'instance-profiles',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Generated artifacts (reports, markdown files, document uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artifacts',
  'artifacts',
  false,
  52428800, -- 50MB
  ARRAY['text/markdown', 'text/plain', 'application/pdf', 'text/html']
)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------
-- 11.2 Storage RLS Policies (Simple for pre-release)
-- --------------------------------------------

-- User profiles: anyone can view, owners can upload
CREATE POLICY "user_profiles_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-profiles');

CREATE POLICY "user_profiles_owner_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "user_profiles_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "user_profiles_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Instance profiles: anyone can view, instance members can upload
CREATE POLICY "instance_profiles_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'instance-profiles');

CREATE POLICY "instance_profiles_members_write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'instance-profiles'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT instance_id FROM instance_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "instance_profiles_members_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'instance-profiles'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT instance_id FROM instance_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "instance_profiles_members_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'instance-profiles'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT instance_id FROM instance_members WHERE user_id = auth.uid()
    )
  );

-- Artifacts: instance members only (includes document files)
CREATE POLICY "artifacts_members_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'artifacts'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT instance_id FROM instance_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "artifacts_members_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'artifacts'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT instance_id FROM instance_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "artifacts_members_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'artifacts'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT instance_id FROM instance_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "artifacts_members_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'artifacts'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT instance_id FROM instance_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Table Count Summary
-- ============================================
-- Total Tables: 19 (down from 25)
--
-- User Management: 3 tables (-1)
--   - users, user_settings, user_preferences
--   REMOVED: ui_state (merged into user_preferences)
--
-- Instance Management: 4 tables
--   - instances, instance_members, instance_settings, instance_invitations
--
-- Program Management: 2 tables
--   - programs, program_members
--
-- Document Management: 4 tables (+2)
--   - documents, document_refs, document_sessions
--   - document_programs (NEW junction table)
--   ADDED: document_sessions (NEW for Google ADK)
--   REMOVED: document_versions (merged into artifacts)
--   REMOVED: files (to be added later)
--
-- Tag System: 2 tables (-1)
--   - tags (unified), document_tags
--   REMOVED: instance_tags, program_tags (merged into tags)
--
-- Agent V2: 1 table (-2)
--   - artifacts (merged with document_versions)
--   REMOVED: execution_plans
--   REMOVED: chat_sessions (managed outside DB)
--
-- ============================================
-- Column Reduction Summary
-- ============================================
-- Removed columns:
--   users: -2 (metadata, sso_provider_id)
--   user_settings: -1 (custom_settings)
--   documents: -5 (file_url, file_name, file_size, file_type, program_ids array)
--   instance_settings: -7 (company_*, ui_settings, custom_settings)
--   programs: -1 (metadata)
--   document_refs: -1 (referenced_file_id removed, purpose extracted from metadata)
--   artifacts: -11 (session_id, file_url, status, ai_model, evaluation, selected_refs, approved_by, approved_at, approval_notes, previous_version_id, iteration_count)
--   instance_members: -2 (invited_by, invited_at replaced with invitation_id)
--
-- Total: ~30 columns removed
-- ============================================
