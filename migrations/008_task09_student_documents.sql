-- Task 09: student profile documents and evidence
--
-- This table owns documents attached to a student profile. Admissions
-- application documents remain in admission_documents because they belong to
-- an application before (and potentially without) a student record.

CREATE TABLE IF NOT EXISTS public.student_documents (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id         uuid NOT NULL,
  institution_id     uuid NOT NULL,
  category           text NOT NULL CHECK (category = ANY (ARRAY[
                       'PASSPORT',
                       'VISA',
                       'ENGLISH_EVIDENCE',
                       'ACADEMIC_DOCUMENT',
                       'SIGNED_APPLICATION',
                       'STUDENT_REQUEST_FORM',
                       'OTHER_SUPPORTING_EVIDENCE'
                     ])),
  title              text NOT NULL,
  storage_bucket     text NOT NULL,
  storage_path       text NOT NULL,
  original_filename  text NOT NULL,
  mime_type          text NOT NULL,
  size_bytes         bigint NOT NULL CHECK (size_bytes >= 0),
  checksum_sha256    text,
  version            integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status             text NOT NULL DEFAULT 'PENDING' CHECK (status = ANY (ARRAY[
                       'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'ARCHIVED'
                     ])),
  review_feedback    text,
  reviewed_by        uuid,
  reviewed_at        timestamptz,
  uploaded_by        uuid NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  archived_at        timestamptz,
  CONSTRAINT student_documents_pkey PRIMARY KEY (id),
  CONSTRAINT student_documents_student_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
  CONSTRAINT student_documents_institution_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE,
  CONSTRAINT student_documents_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.users(id),
  CONSTRAINT student_documents_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.users(id),
  CONSTRAINT student_documents_storage_path_scope_check
    CHECK (storage_path LIKE institution_id::text || '/' || student_id::text || '/%'),
  CONSTRAINT student_documents_storage_path_relative_check
    CHECK (storage_path !~ '(^/|^[A-Za-z]:|\\\\)')
);

-- The bucket is private; all reads go through short-lived signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('student-documents', 'student-documents', false, 20971520)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 20971520;

CREATE INDEX IF NOT EXISTS idx_student_documents_student
  ON public.student_documents(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_documents_institution_category
  ON public.student_documents(institution_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_documents_status
  ON public.student_documents(institution_id, status);

-- A document version is unique within a student/category/title lineage.
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_documents_version
  ON public.student_documents(student_id, category, title, version);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_documents_select_scoped ON public.student_documents;
CREATE POLICY student_documents_select_scoped ON public.student_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.students target ON target.id = student_documents.student_id
      WHERE actor.id = (SELECT auth.uid())
        AND target.institution_id = student_documents.institution_id
        AND (
          actor.id = student_documents.student_id
          OR actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
        )
    )
  );

DROP POLICY IF EXISTS student_documents_insert_scoped ON public.student_documents;
CREATE POLICY student_documents_insert_scoped ON public.student_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.users actor
      JOIN public.students target ON target.id = student_documents.student_id
      WHERE actor.id = (SELECT auth.uid())
        AND target.institution_id = student_documents.institution_id
        AND (
          actor.id = student_documents.student_id
          OR actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN')
          OR (actor.institution_id = student_documents.institution_id
              AND actor.role IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY'))
        )
    )
  );

DROP POLICY IF EXISTS student_documents_update_scoped ON public.student_documents;
CREATE POLICY student_documents_update_scoped ON public.student_documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users actor
      WHERE actor.id = (SELECT auth.uid())
        AND (
          actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN')
          OR (actor.institution_id = student_documents.institution_id
              AND actor.role IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY'))
        )
    )
  )
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.students target
    WHERE target.id = student_documents.student_id
      AND target.institution_id = student_documents.institution_id
  ));

COMMENT ON TABLE public.student_documents IS
  'Institution-scoped profile evidence; one immutable row per uploaded version.';
