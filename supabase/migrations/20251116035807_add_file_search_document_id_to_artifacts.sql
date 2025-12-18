-- Add file_search_document_id column to artifacts table
-- This column stores the Google File Search API document ID for RAG functionality

ALTER TABLE artifacts
ADD COLUMN file_search_document_id TEXT;

COMMENT ON COLUMN artifacts.file_search_document_id IS 'Google File Search API document ID for embedded document (e.g., fileSearchStores/.../documents/...)';
