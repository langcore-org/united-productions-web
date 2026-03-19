-- Add program_id to chats for program selection persistence
-- 2026-03-19

ALTER TABLE chats ADD COLUMN program_id TEXT;

