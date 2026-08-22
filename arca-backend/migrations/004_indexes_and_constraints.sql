CREATE INDEX IF NOT EXISTS chat_sessions_owner_idx ON chat_sessions (owner_user_id, institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages (session_id, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_turn_idx ON chat_messages (session_id, client_turn_id)
  WHERE client_turn_id IS NOT NULL AND role = 'user';
CREATE INDEX IF NOT EXISTS query_logs_tenant_time_idx ON query_logs (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS documents_tenant_status_idx ON documents (institution_id, status, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS documents_audience_idx ON documents (institution_id, visibility, department_id, subject_id, section_id);
CREATE INDEX IF NOT EXISTS document_shares_user_idx ON document_shares (user_id, expires_at, revoked_at);

ALTER TABLE documents ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN institution_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN uploaded_by SET NOT NULL;
ALTER TABLE documents ALTER COLUMN visibility SET NOT NULL;

ALTER TABLE documents ADD CONSTRAINT documents_visibility_check
  CHECK (visibility IN ('institution', 'department', 'private'));
ALTER TABLE documents ADD CONSTRAINT documents_scope_check
  CHECK (visibility <> 'department' OR department_id IS NOT NULL);
ALTER TABLE documents ADD CONSTRAINT documents_scope_ids_check
  CHECK (institution_id IS NOT NULL AND owner_id IS NOT NULL);
