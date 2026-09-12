-- SkillArc AI Copilot storage
--
-- This migration intentionally keeps assistant persistence and knowledge
-- retrieval in Postgres. The server-side assistant service uses the
-- SUPABASE_SERVICE_ROLE_KEY only when effective-role impersonation requires
-- it; browser clients never receive that key.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.assistant_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  institution_id  uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id   uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  role            text NOT NULL,
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_threads_owner
  ON public.assistant_threads(user_id, institution_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id              text PRIMARY KEY,
  thread_id       uuid NOT NULL REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text NOT NULL DEFAULT '',
  message         jsonb NOT NULL,
  client_turn_id  uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_thread
  ON public.assistant_messages(thread_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assistant_messages_client_turn
  ON public.assistant_messages(thread_id, client_turn_id)
  WHERE client_turn_id IS NOT NULL AND role = 'user';

CREATE TABLE IF NOT EXISTS public.assistant_message_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      text NOT NULL REFERENCES public.assistant_messages(id) ON DELETE CASCADE,
  source_type     text NOT NULL CHECK (source_type IN ('dashboard', 'document', 'workflow')),
  title           text NOT NULL,
  href            text,
  snippet         text,
  document_id     uuid,
  chunk_index     integer,
  score           real,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_sources_message
  ON public.assistant_message_sources(message_id);

CREATE TABLE IF NOT EXISTS public.assistant_tool_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid NOT NULL REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
  message_id      text REFERENCES public.assistant_messages(id) ON DELETE SET NULL,
  tool_name       text NOT NULL,
  input_metadata  jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  latency_ms      integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_tool_runs_thread
  ON public.assistant_tool_runs(thread_id, created_at);

CREATE TABLE IF NOT EXISTS public.assistant_feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      text NOT NULL REFERENCES public.assistant_messages(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating          smallint NOT NULL CHECK (rating IN (-1, 1)),
  comment         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  institution_id  uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id   uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  subject_id      uuid,
  section_id      uuid,
  owner_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title           text NOT NULL,
  original_filename text NOT NULL,
  storage_bucket  text NOT NULL DEFAULT 'knowledge-documents',
  storage_path    text NOT NULL,
  visibility      text NOT NULL CHECK (visibility IN ('private', 'department', 'institution', 'organization')),
  allowed_roles   text[] NOT NULL DEFAULT '{}',
  document_version integer NOT NULL DEFAULT 1 CHECK (document_version > 0),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'archived')),
  failure_reason  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (storage_bucket, storage_path, document_version)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_scope
  ON public.knowledge_documents(institution_id, department_id, visibility, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_owner
  ON public.knowledge_documents(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  institution_id  uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id   uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  subject_id      uuid,
  section_id      uuid,
  owner_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  visibility      text NOT NULL CHECK (visibility IN ('private', 'department', 'institution', 'organization')),
  allowed_roles   text[] NOT NULL DEFAULT '{}',
  chunk_index     integer NOT NULL CHECK (chunk_index >= 0),
  content         text NOT NULL,
  embedding       vector(384),
  document_version integer NOT NULL CHECK (document_version > 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, document_version, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_scope
  ON public.knowledge_chunks(institution_id, department_id, visibility);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON public.knowledge_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS public.knowledge_ingestion_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  requested_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  attempts        integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at    timestamptz NOT NULL DEFAULT now(),
  locked_at       timestamptz,
  completed_at    timestamptz,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_jobs_queue
  ON public.knowledge_ingestion_jobs(status, available_at);

-- Relationship checks are kept in the database as defense in depth. The
-- assistant read service repeats the same checks before returning rows to the
-- model, including when an impersonated request uses the service key.
CREATE OR REPLACE FUNCTION public.assistant_knowledge_audience_allowed(
  p_department_id uuid,
  p_subject_id uuid,
  p_section_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users actor
    WHERE actor.id = (SELECT auth.uid())
      AND (
        actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
        OR (p_department_id IS NOT NULL AND actor.department_id = p_department_id)
        OR (p_department_id IS NULL AND p_subject_id IS NULL AND p_section_id IS NULL)
        OR EXISTS (
          SELECT 1
          FROM public.faculty_subjects faculty_subject
          WHERE faculty_subject.faculty_id = actor.id
            AND (
              (p_subject_id IS NOT NULL AND faculty_subject.subject_id = p_subject_id)
              OR (p_section_id IS NOT NULL AND faculty_subject.section_id = p_section_id)
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.students student
          WHERE student.id = actor.id
            AND (
              (p_section_id IS NOT NULL AND student.section_id = p_section_id)
              OR EXISTS (
                SELECT 1
                FROM public.subjects subject
                WHERE subject.id = p_subject_id
                  AND subject.program_id = student.program_id
                  AND (student.semester IS NULL OR subject.semester = student.semester)
              )
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.parent_student_relations relation
          JOIN public.students child ON child.id = relation.student_id
          WHERE relation.parent_id = actor.id
            AND (
              (p_section_id IS NOT NULL AND child.section_id = p_section_id)
              OR EXISTS (
                SELECT 1
                FROM public.subjects subject
                WHERE subject.id = p_subject_id
                  AND subject.program_id = child.program_id
                  AND (child.semester IS NULL OR subject.semester = child.semester)
              )
            )
        )
      )
  );
$$;

-- Assistant persistence is exposed only to the owning authenticated user.
-- The server service role bypasses these policies for effective-role access,
-- but every server query still applies explicit principal predicates.
ALTER TABLE public.assistant_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_message_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_tool_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assistant_threads_owner_select ON public.assistant_threads;
CREATE POLICY assistant_threads_owner_select ON public.assistant_threads
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS assistant_threads_owner_insert ON public.assistant_threads;
CREATE POLICY assistant_threads_owner_insert ON public.assistant_threads
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND actor_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS assistant_threads_owner_update ON public.assistant_threads;
CREATE POLICY assistant_threads_owner_update ON public.assistant_threads
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS assistant_threads_owner_delete ON public.assistant_threads;
CREATE POLICY assistant_threads_owner_delete ON public.assistant_threads
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS assistant_messages_owner_select ON public.assistant_messages;
CREATE POLICY assistant_messages_owner_select ON public.assistant_messages
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS assistant_messages_owner_insert ON public.assistant_messages;
CREATE POLICY assistant_messages_owner_insert ON public.assistant_messages
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS assistant_messages_owner_delete ON public.assistant_messages;
CREATE POLICY assistant_messages_owner_delete ON public.assistant_messages
  FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS assistant_sources_owner_select ON public.assistant_message_sources;
CREATE POLICY assistant_sources_owner_select ON public.assistant_message_sources
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.assistant_messages m JOIN public.assistant_threads t ON t.id = m.thread_id WHERE m.id = message_id AND t.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS assistant_sources_owner_insert ON public.assistant_message_sources;
CREATE POLICY assistant_sources_owner_insert ON public.assistant_message_sources
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.assistant_messages m JOIN public.assistant_threads t ON t.id = m.thread_id WHERE m.id = message_id AND t.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS assistant_tool_runs_owner_select ON public.assistant_tool_runs;
CREATE POLICY assistant_tool_runs_owner_select ON public.assistant_tool_runs
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS assistant_tool_runs_owner_insert ON public.assistant_tool_runs;
CREATE POLICY assistant_tool_runs_owner_insert ON public.assistant_tool_runs
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS assistant_feedback_owner_all ON public.assistant_feedback;
CREATE POLICY assistant_feedback_owner_all ON public.assistant_feedback
  FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistant_messages m
      JOIN public.assistant_threads t ON t.id = m.thread_id
      WHERE m.id = message_id AND t.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistant_messages m
      JOIN public.assistant_threads t ON t.id = m.thread_id
      WHERE m.id = message_id AND t.user_id = (SELECT auth.uid())
    )
  );

-- Knowledge tables are private by default. The authenticated policy is
-- intentionally explicit and read-only; ingestion writes use the server role.
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_ingestion_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS knowledge_documents_scoped_select ON public.knowledge_documents;
CREATE POLICY knowledge_documents_scoped_select ON public.knowledge_documents
  FOR SELECT TO authenticated USING (
    (
      owner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.users owner_user
        WHERE owner_user.id = (SELECT auth.uid())
          AND owner_user.organization_id IS NOT DISTINCT FROM knowledge_documents.organization_id
          AND (knowledge_documents.institution_id IS NULL OR owner_user.institution_id = knowledge_documents.institution_id)
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users actor
      WHERE actor.id = (SELECT auth.uid())
        AND actor.organization_id IS NOT DISTINCT FROM knowledge_documents.organization_id
        AND (knowledge_documents.institution_id IS NULL OR actor.institution_id = knowledge_documents.institution_id)
        AND (
          knowledge_documents.visibility = 'organization'
          OR (knowledge_documents.visibility = 'institution' AND actor.institution_id = knowledge_documents.institution_id)
          OR (knowledge_documents.visibility = 'department' AND actor.department_id = knowledge_documents.department_id)
          OR actor.role = ANY (knowledge_documents.allowed_roles)
        )
        AND public.assistant_knowledge_audience_allowed(
          knowledge_documents.department_id,
          knowledge_documents.subject_id,
          knowledge_documents.section_id
        )
    )
  );

DROP POLICY IF EXISTS knowledge_chunks_scoped_select ON public.knowledge_chunks;
CREATE POLICY knowledge_chunks_scoped_select ON public.knowledge_chunks
  FOR SELECT TO authenticated USING (
    (
      EXISTS (SELECT 1 FROM public.knowledge_documents d WHERE d.id = document_id)
      AND owner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.users owner_user
        WHERE owner_user.id = (SELECT auth.uid())
          AND owner_user.organization_id IS NOT DISTINCT FROM knowledge_chunks.organization_id
          AND (knowledge_chunks.institution_id IS NULL OR owner_user.institution_id = knowledge_chunks.institution_id)
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users actor
      WHERE actor.id = (SELECT auth.uid())
        AND actor.organization_id IS NOT DISTINCT FROM knowledge_chunks.organization_id
        AND (knowledge_chunks.institution_id IS NULL OR actor.institution_id = knowledge_chunks.institution_id)
          AND (
            knowledge_chunks.visibility = 'organization'
            OR (knowledge_chunks.visibility = 'institution' AND actor.institution_id = knowledge_chunks.institution_id)
            OR (knowledge_chunks.visibility = 'department' AND actor.department_id = knowledge_chunks.department_id)
            OR actor.role = ANY (knowledge_chunks.allowed_roles)
          )
          AND public.assistant_knowledge_audience_allowed(
            knowledge_chunks.department_id,
            knowledge_chunks.subject_id,
            knowledge_chunks.section_id
          )
      )
  );

DROP POLICY IF EXISTS knowledge_jobs_owner_select ON public.knowledge_ingestion_jobs;
CREATE POLICY knowledge_jobs_owner_select ON public.knowledge_ingestion_jobs
  FOR SELECT TO authenticated USING (requested_by = (SELECT auth.uid()));

-- Explicit Data API exposure for the server and authenticated dashboard client.
-- No anon access is granted; RLS remains the row-level tenant boundary.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.assistant_threads,
             public.assistant_messages,
             public.assistant_message_sources,
             public.assistant_tool_runs,
             public.assistant_feedback
  TO authenticated;

GRANT ALL PRIVILEGES
  ON TABLE public.assistant_threads,
             public.assistant_messages,
             public.assistant_message_sources,
             public.assistant_tool_runs,
             public.assistant_feedback,
             public.knowledge_documents,
             public.knowledge_chunks,
             public.knowledge_ingestion_jobs
  TO service_role;

GRANT SELECT
  ON TABLE public.knowledge_documents,
             public.knowledge_chunks,
             public.knowledge_ingestion_jobs
  TO authenticated;

-- Source files are held in this private bucket. No browser policy is granted;
-- signed URLs or server-side reads must be added through a separate audited
-- document-management workflow.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('knowledge-documents', 'knowledge-documents', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;
