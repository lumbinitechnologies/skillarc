CREATE TABLE IF NOT EXISTS query_log_document_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_log_id uuid NOT NULL REFERENCES query_logs(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL,
  filename text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS query_log_refs_tenant_time_idx
  ON query_log_document_references (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS query_log_refs_filename_idx
  ON query_log_document_references (institution_id, filename);

INSERT INTO query_log_document_references (query_log_id, institution_id, filename, created_at)
SELECT q.id, q.institution_id, value, q.created_at
FROM query_logs q
CROSS JOIN LATERAL jsonb_array_elements_text(q.referenced_documents) AS refs(value)
WHERE jsonb_typeof(q.referenced_documents) = 'array'
  AND NOT EXISTS (
    SELECT 1 FROM query_log_document_references r
    WHERE r.query_log_id = q.id AND r.filename = value
  );
