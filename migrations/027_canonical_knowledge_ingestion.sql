-- Canonical Next.js/Supabase knowledge ingestion foundation.
--
-- The worker uses the service role through server-only code. These functions
-- remain SECURITY INVOKER so they do not create a second authorization path;
-- the search function receives the already-resolved effective principal and
-- is exposed only to the service role.

ALTER TABLE public.knowledge_documents
  ALTER COLUMN storage_path DROP NOT NULL;

ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS mime_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'knowledge_documents_source_type_check'
      AND conrelid = 'public.knowledge_documents'::regclass
  ) THEN
    ALTER TABLE public.knowledge_documents
      ADD CONSTRAINT knowledge_documents_source_type_check
      CHECK (source_type IN ('upload', 'assignment', 'legacy'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_documents_source_version_uidx
  ON public.knowledge_documents(source_type, source_id, document_version)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS knowledge_documents_content_hash_idx
  ON public.knowledge_documents(source_type, source_id, content_hash)
  WHERE source_id IS NOT NULL AND content_hash IS NOT NULL;

ALTER TABLE public.knowledge_ingestion_jobs
  ADD COLUMN IF NOT EXISTS locked_by text,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'knowledge_ingestion_jobs_max_attempts_check'
      AND conrelid = 'public.knowledge_ingestion_jobs'::regclass
  ) THEN
    ALTER TABLE public.knowledge_ingestion_jobs
      ADD CONSTRAINT knowledge_ingestion_jobs_max_attempts_check
      CHECK (max_attempts > 0);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS knowledge_ingestion_jobs_claim_idx
  ON public.knowledge_ingestion_jobs(status, available_at, created_at)
  WHERE status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS knowledge_chunks_document_version_idx
  ON public.knowledge_chunks(document_id, document_version, chunk_index);

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
      lease_expires_at = now() + make_interval(secs => GREATEST(COALESCE(p_lease_seconds, 300), 30)),
      started_at = COALESCE(job.started_at, now()),
      updated_at = now()
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
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
  p_section_ids uuid[] DEFAULT '{}'
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

REVOKE ALL ON FUNCTION public.claim_knowledge_ingestion_jobs(integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_knowledge_ingestion_job(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_knowledge_ingestion_job(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_knowledge_chunks(vector(384), double precision, integer, uuid, uuid, uuid, uuid, text, uuid[], uuid[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_knowledge_ingestion_jobs(integer, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_knowledge_ingestion_job(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_knowledge_ingestion_job(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector(384), double precision, integer, uuid, uuid, uuid, uuid, text, uuid[], uuid[]) TO service_role;
