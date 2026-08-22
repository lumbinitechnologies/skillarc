-- Storage and vector metadata hardening for Task 03.
-- Operational Postgres stores the document record; Supabase remains the
-- authority for the referenced organization, institution and relationships.

UPDATE documents
SET storage_path = organization_id::text || '/' || institution_id::text || '/' ||
  id::text || '.' || lower(regexp_replace(file_type, '^\\.', ''))
WHERE storage_path IS NULL OR storage_path = ''
   OR storage_path !~ ('^' || organization_id::text || '/' || institution_id::text || '/');

ALTER TABLE documents ALTER COLUMN storage_path SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_storage_path_scope_check') THEN
    ALTER TABLE documents ADD CONSTRAINT documents_storage_path_scope_check
      CHECK (storage_path LIKE organization_id::text || '/' || institution_id::text || '/%');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_storage_path_no_absolute_check') THEN
    ALTER TABLE documents ADD CONSTRAINT documents_storage_path_no_absolute_check
      CHECK (storage_path !~ '(^/|^[A-Za-z]:|\\\\)');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_shares_expiry_check') THEN
    ALTER TABLE document_shares ADD CONSTRAINT document_shares_expiry_check
      CHECK (expires_at IS NULL OR expires_at > created_at);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS documents_owner_visibility_idx
  ON documents (institution_id, owner_id, visibility)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS document_shares_document_audience_idx
  ON document_shares (document_id, user_id, role, subject_id, section_id)
  WHERE revoked_at IS NULL;
