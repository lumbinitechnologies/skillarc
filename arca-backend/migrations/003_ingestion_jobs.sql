CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'QUEUED',
  attempt integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_owner text,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  progress smallint NOT NULL DEFAULT 0,
  last_error text,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS ingestion_claim_idx
  ON ingestion_jobs (state, available_at, lease_expires_at, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ingestion_active_document_idx
  ON ingestion_jobs (document_id)
  WHERE state IN ('QUEUED', 'EXTRACTING', 'CHUNKING', 'EMBEDDING');
