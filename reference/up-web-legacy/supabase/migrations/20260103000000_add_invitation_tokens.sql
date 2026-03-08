-- ============================================
-- Migration: Add Invitation Token System to workspace_members
-- Date: 2026-01-03
-- Description: Extends workspace_members table with token-based invitation system
-- ============================================

-- Add invitation token columns to workspace_members
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

-- Create index for fast token lookup (frequently queried during invitation acceptance)
CREATE INDEX IF NOT EXISTS idx_workspace_members_invitation_token
  ON workspace_members(invitation_token)
  WHERE invitation_token IS NOT NULL;

-- Create index for expiration-based queries (cleanup of expired invitations)
CREATE INDEX IF NOT EXISTS idx_workspace_members_invitation_expires
  ON workspace_members(invitation_expires_at)
  WHERE invitation_expires_at IS NOT NULL;

-- Add documentation comments
COMMENT ON COLUMN workspace_members.invitation_token IS 'UUID token for invitation link. Set to NULL after invitation is accepted.';
COMMENT ON COLUMN workspace_members.invitation_expires_at IS 'Invitation expiration timestamp. Typically 7 days from creation.';

-- Function to cleanup expired invitations (can be run periodically via cron or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Delete workspace_members where:
  -- 1. Status is 'invited' (pending invitation)
  -- 2. Expiration timestamp has passed
  DELETE FROM workspace_members
  WHERE status = 'invited'
    AND invitation_expires_at IS NOT NULL
    AND invitation_expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_invitations IS 'Deletes expired pending invitations. Returns the count of deleted records. Can be scheduled via pg_cron or called manually.';
