-- ============================================
-- Deep Agent Migration: Agent Threads + Artifacts Enhancement
-- Generated: 2025-11-25
-- Purpose: Add agent_threads table and enhance artifacts/documents for Deep Agent UI
-- ============================================

-- ============================================
-- SECTION 1: New Table - agent_threads
-- ============================================

CREATE TABLE agent_threads (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- LangGraph Reference (from LangGraph Cloud)
  thread_id TEXT NOT NULL UNIQUE,

  -- Document Link (REQUIRED - every thread belongs to a document)
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Ownership & Context (denormalized for performance)
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Metadata
  title TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),

  -- Initial Input (Form data stored as JSON)
  initial_input JSONB,

  -- LangGraph State Sync (metadata cached for list display)
  last_message_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  has_interrupt BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_agent_threads_document ON agent_threads(document_id);
CREATE INDEX idx_agent_threads_instance ON agent_threads(instance_id);
CREATE INDEX idx_agent_threads_created_by ON agent_threads(created_by);
CREATE INDEX idx_agent_threads_status ON agent_threads(status);
CREATE INDEX idx_agent_threads_updated ON agent_threads(updated_at DESC);
CREATE INDEX idx_agent_threads_has_interrupt ON agent_threads(has_interrupt) WHERE has_interrupt = TRUE;

-- RLS Policies (disabled for pre-release, same pattern as other tables)
ALTER TABLE agent_threads DISABLE ROW LEVEL SECURITY;

-- Triggers
CREATE TRIGGER update_agent_threads_updated_at
  BEFORE UPDATE ON agent_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE agent_threads IS 'LangGraph thread metadata for Deep Agent UI (threads managed by LangGraph Cloud)';
COMMENT ON COLUMN agent_threads.thread_id IS 'LangGraph thread ID (external reference)';
COMMENT ON COLUMN agent_threads.document_id IS 'Document this thread belongs to (required)';
COMMENT ON COLUMN agent_threads.initial_input IS 'Initial form data: {title, instructions, context, ...}';
COMMENT ON COLUMN agent_threads.has_interrupt IS 'Whether thread has pending human interrupt (for badge display)';

-- ============================================
-- SECTION 2: Enhance artifacts table
-- ============================================

-- Add thread_id FK to link artifacts to agent_threads
ALTER TABLE artifacts
ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES agent_threads(id) ON DELETE SET NULL;

-- Add is_latest flag for quick queries
ALTER TABLE artifacts
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN NOT NULL DEFAULT TRUE;

-- Add parent_artifact_id for version chain tracking
ALTER TABLE artifacts
ADD COLUMN IF NOT EXISTS parent_artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL;

-- Add file_name for preserving original file name
ALTER TABLE artifacts
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Add file_type for MIME type tracking
ALTER TABLE artifacts
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_artifacts_thread_id ON artifacts(thread_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_is_latest ON artifacts(document_id, is_latest) WHERE is_latest = TRUE;
CREATE INDEX IF NOT EXISTS idx_artifacts_parent ON artifacts(parent_artifact_id);

-- Comments
COMMENT ON COLUMN artifacts.thread_id IS 'Agent thread that generated this artifact (NULL for manual uploads)';
COMMENT ON COLUMN artifacts.is_latest IS 'Whether this is the latest version for the document';
COMMENT ON COLUMN artifacts.parent_artifact_id IS 'Previous version in the artifact chain';
COMMENT ON COLUMN artifacts.file_name IS 'Original file name from agent output';
COMMENT ON COLUMN artifacts.file_type IS 'MIME type or file extension';

-- ============================================
-- SECTION 3: Function to manage artifact versioning
-- ============================================

-- Function to mark previous versions as not latest when new artifact is created
CREATE OR REPLACE FUNCTION update_artifact_latest()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_latest = TRUE THEN
    UPDATE artifacts
    SET is_latest = FALSE
    WHERE document_id = NEW.document_id
      AND id != NEW.id
      AND is_latest = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop if exists first to avoid conflict)
DROP TRIGGER IF EXISTS artifact_latest_trigger ON artifacts;
CREATE TRIGGER artifact_latest_trigger
  AFTER INSERT ON artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_artifact_latest();

-- ============================================
-- SECTION 4: Enhance documents table
-- ============================================

-- Add version tracking
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- Add forked_from for document lineage
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS forked_from UUID REFERENCES documents(id) ON DELETE SET NULL;

-- Add latest_artifact_id for quick access to current artifact
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS latest_artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL;

-- Comments
COMMENT ON COLUMN documents.version IS 'Document version number (increments on save)';
COMMENT ON COLUMN documents.forked_from IS 'Original document if this was forked';
COMMENT ON COLUMN documents.latest_artifact_id IS 'Quick reference to the latest artifact';

-- ============================================
-- SECTION 5: Storage Bucket for agent artifacts
-- ============================================

-- Create agent-artifacts bucket for Deep Agent outputs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-artifacts',
  'agent-artifacts',
  false,
  104857600, -- 100MB
  ARRAY['text/markdown', 'text/plain', 'application/json', 'application/pdf', 'text/html', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for agent-artifacts bucket
-- Drop policies if they exist (for idempotent migration)
DROP POLICY IF EXISTS "agent_artifacts_members_select" ON storage.objects;
DROP POLICY IF EXISTS "agent_artifacts_members_insert" ON storage.objects;
DROP POLICY IF EXISTS "agent_artifacts_members_update" ON storage.objects;
DROP POLICY IF EXISTS "agent_artifacts_members_delete" ON storage.objects;

CREATE POLICY "agent_artifacts_members_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agent-artifacts'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT instance_id FROM instance_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "agent_artifacts_members_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agent-artifacts'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT instance_id FROM instance_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "agent_artifacts_members_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'agent-artifacts'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT instance_id FROM instance_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "agent_artifacts_members_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'agent-artifacts'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT instance_id FROM instance_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Summary:
-- - agent_threads: New table for LangGraph thread metadata
-- - artifacts: Added thread_id, is_latest, parent_artifact_id, file_name, file_type
-- - documents: Added version, forked_from, latest_artifact_id
-- - storage: New agent-artifacts bucket with RLS policies
-- ============================================
