-- Focused security hardening for the student profile/document APIs.
-- Broader pre-existing public-table RLS findings are intentionally out of scope.

ALTER TABLE public.student_profile_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'student_profile_details',
    'student_addresses',
    'student_emergency_contacts',
    'student_notes',
    'student_communications'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_scoped ON public.%I', table_name, table_name);
    EXECUTE format($policy$
      CREATE POLICY %I_select_scoped ON public.%I
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1
        FROM public.users actor
        WHERE actor.id = (SELECT auth.uid())
          AND (
            actor.id = %I.student_id
            OR actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN')
            OR (
              actor.role = 'INSTITUTION_ADMIN'
              AND actor.institution_id = %I.institution_id
            )
          )
      ))
    $policy$, table_name, table_name, table_name, table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS student_documents_select_scoped ON public.student_documents;
CREATE POLICY student_documents_select_scoped ON public.student_documents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.users actor
    WHERE actor.id = (SELECT auth.uid())
      AND (
        actor.id = student_documents.student_id
        OR actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN')
        OR (
          actor.role = 'INSTITUTION_ADMIN'
          AND actor.institution_id = student_documents.institution_id
        )
      )
  ));

DROP POLICY IF EXISTS student_documents_insert_scoped ON public.student_documents;
CREATE POLICY student_documents_insert_scoped ON public.student_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.users actor
      WHERE actor.id = (SELECT auth.uid())
        AND (
          actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN')
          OR (
            actor.role = 'INSTITUTION_ADMIN'
            AND actor.institution_id = student_documents.institution_id
          )
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.students target
      WHERE target.id = student_documents.student_id
        AND target.institution_id = student_documents.institution_id
    )
  );

DROP POLICY IF EXISTS student_documents_update_scoped ON public.student_documents;
CREATE POLICY student_documents_update_scoped ON public.student_documents
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.users actor
    WHERE actor.id = (SELECT auth.uid())
      AND (
        actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN')
        OR (
          actor.role = 'INSTITUTION_ADMIN'
          AND actor.institution_id = student_documents.institution_id
        )
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.students target
    WHERE target.id = student_documents.student_id
      AND target.institution_id = student_documents.institution_id
  ));
