ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS institution_id uuid;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS department_id uuid;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS subject_id uuid;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS section_id uuid;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by uuid;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_sha256 text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS visibility text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS allowed_roles text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'QUEUED';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid,
  role text,
  subject_id uuid,
  section_id uuid,
  granted_by uuid NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR role IS NOT NULL OR subject_id IS NOT NULL OR section_id IS NOT NULL)
);
