-- Local Hugging Face embedding profile and durable job publication.

ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS embedding_provider text,
  ADD COLUMN IF NOT EXISTS embedding_model text,
  ADD COLUMN IF NOT EXISTS embedding_revision text,
  ADD COLUMN IF NOT EXISTS embedding_dimensions integer,
  ADD COLUMN IF NOT EXISTS embedding_profile text;

ALTER TABLE public.knowledge_ingestion_jobs
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'knowledge_documents_embedding_dimensions_check'
      AND conrelid = 'public.knowledge_documents'::regclass
  ) THEN
    ALTER TABLE public.knowledge_documents
      ADD CONSTRAINT knowledge_documents_embedding_dimensions_check
      CHECK (embedding_dimensions IS NULL OR embedding_dimensions = 384);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS knowledge_documents_embedding_profile_idx
  ON public.knowledge_documents (embedding_profile, status)
  WHERE status = 'ready';

CREATE OR REPLACE FUNCTION public.claim_knowledge_ingestion_jobs(
  p_limit integer,
  p_worker_id text,
  p_lease_seconds integer DEFAULT 300
)
RETURNS SETOF public.knowledge_ingestion_jobs
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT id
    FROM public.knowledge_ingestion_jobs
    WHERE attempts < max_attempts
      AND (
        (status = 'queued' AND available_at <= now())
        OR (status = 'running' AND lease_expires_at < now())
      )
    ORDER BY available_at ASC, created_at ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 1), 1), 50)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.knowledge_ingestion_jobs AS job
  SET status = 'running',
      attempts = job.attempts + 1,
      locked_by = p_worker_id,
      locked_at = now(),
      lease_expires_at = now() + make_interval(secs => GREATEST(COALESCE(p_lease_seconds, 300), 30)),
      started_at = COALESCE(job.started_at, now()),
      updated_at = now()
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
$$;

CREATE OR REPLACE FUNCTION public.renew_knowledge_ingestion_job(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer DEFAULT 300
)
RETURNS public.knowledge_ingestion_jobs
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  renewed_job public.knowledge_ingestion_jobs;
BEGIN
  UPDATE public.knowledge_ingestion_jobs
  SET lease_expires_at = now() + make_interval(secs => GREATEST(COALESCE(p_lease_seconds, 300), 30)),
      updated_at = now()
  WHERE id = p_job_id
    AND status = 'running'
    AND locked_by = p_worker_id
  RETURNING * INTO renewed_job;

  IF renewed_job.id IS NULL THEN
    RAISE EXCEPTION 'knowledge ingestion job is not owned by worker';
  END IF;
  RETURN renewed_job;
END
$$;

CREATE OR REPLACE FUNCTION public.complete_knowledge_ingestion_job(
  p_job_id uuid,
  p_worker_id text
)
RETURNS public.knowledge_ingestion_jobs
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  completed_job public.knowledge_ingestion_jobs;
BEGIN
  UPDATE public.knowledge_ingestion_jobs
  SET status = 'completed',
      locked_by = NULL,
      locked_at = NULL,
      lease_expires_at = NULL,
      completed_at = now(),
      updated_at = now()
  WHERE id = p_job_id
    AND status = 'running'
    AND locked_by = p_worker_id
  RETURNING * INTO completed_job;

  IF completed_job.id IS NULL THEN
    RAISE EXCEPTION 'knowledge ingestion job is not owned by worker';
  END IF;
  RETURN completed_job;
END
$$;

CREATE OR REPLACE FUNCTION public.fail_knowledge_ingestion_job(
  p_job_id uuid,
  p_worker_id text,
  p_error text
)
RETURNS public.knowledge_ingestion_jobs
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  failed_job public.knowledge_ingestion_jobs;
BEGIN
  UPDATE public.knowledge_ingestion_jobs
  SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'queued' END,
      available_at = CASE
        WHEN attempts >= max_attempts THEN available_at
        ELSE now() + make_interval(secs => LEAST(3600, power(2, LEAST(attempts, 10))::integer))
      END,
      locked_by = NULL,
      locked_at = NULL,
      lease_expires_at = NULL,
      error_message = left(COALESCE(p_error, 'Unknown ingestion failure'), 2000),
      updated_at = now()
  WHERE id = p_job_id
    AND status = 'running'
    AND locked_by = p_worker_id
  RETURNING * INTO failed_job;

  IF failed_job.id IS NULL THEN
    RAISE EXCEPTION 'knowledge ingestion job is not owned by worker';
  END IF;
  RETURN failed_job;
END
$$;

CREATE OR REPLACE FUNCTION public.finalize_knowledge_ingestion_job(
  p_job_id uuid,
  p_worker_id text
)
RETURNS public.knowledge_ingestion_jobs
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  job_row public.knowledge_ingestion_jobs;
  document_row public.knowledge_documents;
BEGIN
  SELECT * INTO job_row
  FROM public.knowledge_ingestion_jobs
  WHERE id = p_job_id
    AND status = 'running'
    AND locked_by = p_worker_id
  FOR UPDATE;

  IF job_row.id IS NULL THEN
    RAISE EXCEPTION 'knowledge ingestion job is not owned by worker';
  END IF;

  SELECT * INTO document_row
  FROM public.knowledge_documents
  WHERE id = job_row.document_id
  FOR UPDATE;

  IF document_row.id IS NULL THEN
    RAISE EXCEPTION 'knowledge document does not exist';
  END IF;

  UPDATE public.knowledge_documents
  SET status = 'ready',
      failure_reason = NULL,
      updated_at = now()
  WHERE id = document_row.id;

  UPDATE public.knowledge_documents
  SET status = 'archived',
      updated_at = now()
  WHERE source_type = document_row.source_type
    AND source_id = document_row.source_id
    AND source_id IS NOT NULL
    AND id <> document_row.id
    AND document_version <= document_row.document_version
    AND status = 'ready';

  RETURN public.complete_knowledge_ingestion_job(p_job_id, p_worker_id);
END
$$;

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(384),
  match_threshold double precision,
  match_count integer,
  p_user_id uuid,
  p_organization_id uuid,
  p_institution_id uuid,
  p_department_id uuid,
  p_role text,
  p_subject_ids uuid[] DEFAULT '{}',
  p_section_ids uuid[] DEFAULT '{}',
  p_embedding_profile text DEFAULT 'huggingface-local:Xenova/all-MiniLM-L6-v2:751bff3:384:v2'
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  owner_id uuid,
  institution_id uuid,
  department_id uuid,
  subject_id uuid,
  section_id uuid,
  visibility text,
  allowed_roles text[],
  title text,
  original_filename text,
  document_status text,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    chunk.id,
    chunk.document_id,
    chunk.chunk_index,
    chunk.content,
    chunk.owner_id,
    chunk.institution_id,
    chunk.department_id,
    chunk.subject_id,
    chunk.section_id,
    chunk.visibility,
    chunk.allowed_roles,
    document.title,
    document.original_filename,
    document.status,
    1 - (chunk.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks AS chunk
  JOIN public.knowledge_documents AS document
    ON document.id = chunk.document_id
   AND document.document_version = chunk.document_version
  WHERE chunk.embedding IS NOT NULL
    AND document.status = 'ready'
    AND document.embedding_profile = p_embedding_profile
    AND chunk.organization_id = p_organization_id
    AND (chunk.institution_id = p_institution_id OR chunk.institution_id IS NULL)
    AND 1 - (chunk.embedding <=> query_embedding) >= COALESCE(match_threshold, 0.25)
    AND (
      p_role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
      OR chunk.owner_id = p_user_id
      OR chunk.visibility = 'organization'
      OR (chunk.visibility = 'institution' AND chunk.institution_id = p_institution_id)
      OR (chunk.visibility = 'department' AND chunk.department_id = p_department_id)
    )
    AND (
      cardinality(COALESCE(chunk.allowed_roles, '{}')) = 0
      OR p_role = ANY(chunk.allowed_roles)
    )
    AND (
      p_role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
      OR chunk.owner_id = p_user_id
      OR (chunk.department_id IS NULL AND chunk.subject_id IS NULL AND chunk.section_id IS NULL)
      OR chunk.department_id = p_department_id
      OR (
        (chunk.subject_id IS NULL OR chunk.subject_id = ANY(COALESCE(p_subject_ids, '{}')))
        AND (chunk.section_id IS NULL OR chunk.section_id = ANY(COALESCE(p_section_ids, '{}')))
      )
    )
  ORDER BY chunk.embedding <=> query_embedding ASC
  LIMIT LEAST(GREATEST(COALESCE(match_count, 1), 1), 20);
$$;

CREATE OR REPLACE FUNCTION public.knowledge_ingestion_readiness()
RETURNS TABLE (
  queued bigint,
  running bigint,
  stale_running_jobs bigint,
  failed bigint,
  ready_without_chunks bigint,
  ready_missing_embeddings bigint,
  ready_noncanonical_profile bigint,
  orphaned_or_stale_chunks bigint,
  unscoped_ready_documents bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.knowledge_ingestion_jobs WHERE status = 'queued'),
    (SELECT count(*) FROM public.knowledge_ingestion_jobs WHERE status = 'running'),
    (SELECT count(*)
     FROM public.knowledge_ingestion_jobs
     WHERE status = 'running' AND lease_expires_at < now()),
    (SELECT count(*) FROM public.knowledge_ingestion_jobs WHERE status = 'failed'),
    (SELECT count(*)
     FROM public.knowledge_documents d
     WHERE d.status = 'ready'
       AND NOT EXISTS (
         SELECT 1 FROM public.knowledge_chunks c
         WHERE c.document_id = d.id AND c.document_version = d.document_version
       )),
    (SELECT count(*)
     FROM public.knowledge_chunks c
     JOIN public.knowledge_documents d ON d.id = c.document_id AND d.document_version = c.document_version
     WHERE d.status = 'ready' AND c.embedding IS NULL),
    (SELECT count(*)
     FROM public.knowledge_documents
     WHERE status = 'ready'
       AND embedding_profile IS DISTINCT FROM 'huggingface-local:Xenova/all-MiniLM-L6-v2:751bff3:384:v2'),
    (SELECT count(*)
     FROM public.knowledge_chunks c
     LEFT JOIN public.knowledge_documents d ON d.id = c.document_id AND d.document_version = c.document_version
     WHERE d.id IS NULL),
    (SELECT count(*)
     FROM public.knowledge_documents
     WHERE status = 'ready' AND (organization_id IS NULL OR institution_id IS NULL));
$$;

REVOKE ALL ON FUNCTION public.claim_knowledge_ingestion_jobs(integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renew_knowledge_ingestion_job(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_knowledge_ingestion_job(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_knowledge_ingestion_job(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_knowledge_ingestion_job(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_knowledge_chunks(vector(384), double precision, integer, uuid, uuid, uuid, uuid, text, uuid[], uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_knowledge_chunks(vector(384), double precision, integer, uuid, uuid, uuid, uuid, text, uuid[], uuid[], text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.knowledge_ingestion_readiness() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_knowledge_ingestion_jobs(integer, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_knowledge_ingestion_job(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_knowledge_ingestion_job(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_knowledge_ingestion_job(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_knowledge_ingestion_job(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector(384), double precision, integer, uuid, uuid, uuid, uuid, text, uuid[], uuid[], text) TO service_role;
GRANT EXECUTE ON FUNCTION public.knowledge_ingestion_readiness() TO service_role;
