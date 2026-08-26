-- Student document linkage and immutable version lineage.
-- Production storage policy remains external; this migration keeps the bucket private.

ALTER TABLE public.student_documents
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.admissions_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS application_document_id uuid REFERENCES public.admission_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.student_documents(id);

CREATE INDEX IF NOT EXISTS student_documents_application_idx
  ON public.student_documents(application_id, created_at DESC);

DROP POLICY IF EXISTS student_documents_select_scoped ON public.student_documents;
CREATE POLICY student_documents_select_scoped ON public.student_documents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users actor
    WHERE actor.id = (SELECT auth.uid())
      AND (
        actor.id = student_documents.student_id
        OR actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN')
        OR (actor.role = 'INSTITUTION_ADMIN' AND actor.institution_id = student_documents.institution_id)
      )
  ));

COMMENT ON COLUMN public.student_documents.application_id IS
  'Optional source admissions application; application history remains preserved.';
COMMENT ON COLUMN public.student_documents.superseded_by IS
  'Later version that superseded this immutable document row.';
