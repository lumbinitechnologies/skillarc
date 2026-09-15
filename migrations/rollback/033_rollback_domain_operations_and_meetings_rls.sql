-- ==============================================================================
-- Safe Rollback for Migration 033: Collaboration, Placement & Operations Domain RLS
-- ==============================================================================
-- Fail-Closed Strategy: Strictly scopes meetings and files to participants/owners
-- and events/job posts to same-institution users. Never re-creates open policies.
-- ==============================================================================

-- 1. meetings
DROP POLICY IF EXISTS "meetings_scoped_select" ON public.meetings;
DROP POLICY IF EXISTS "meetings_rollback_safe" ON public.meetings;
CREATE POLICY "meetings_rollback_safe" ON public.meetings
  FOR SELECT TO authenticated
  USING (
    faculty_id = (SELECT auth.uid())
    OR public.is_meeting_participant(meetings.id, (SELECT auth.uid()))
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() = 'INSTITUTION_ADMIN'
      AND meetings.institution_id = public.current_user_institution_id()
    )
  );

-- 2. files
DROP POLICY IF EXISTS "files_scoped_select" ON public.files;
DROP POLICY IF EXISTS "files_rollback_safe" ON public.files;
CREATE POLICY "files_rollback_safe" ON public.files
  FOR SELECT TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      files.institution_id IS NOT NULL
      AND files.institution_id = public.current_user_institution_id()
    )
  );

-- 3. events, announcements, job_posts
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'events', 'announcements', 'job_posts'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_rollback_safe ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY %I_rollback_safe ON public.%I FOR SELECT TO authenticated
      USING (
        public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
        OR %I.institution_id = public.current_user_institution_id()
      )
    $p$, t, t, t);
  END LOOP;
END $$;

-- 4. applications
DROP POLICY IF EXISTS "applications_select" ON public.applications;
DROP POLICY IF EXISTS "applications_rollback_safe" ON public.applications;
CREATE POLICY "applications_rollback_safe" ON public.applications
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.job_posts jp
      WHERE jp.id = applications.job_post_id
        AND jp.institution_id = public.current_user_institution_id()
    )
  );

-- 5. complaints
DROP POLICY IF EXISTS "complaints_select" ON public.complaints;
DROP POLICY IF EXISTS "complaints_rollback_safe" ON public.complaints;
CREATE POLICY "complaints_rollback_safe" ON public.complaints
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
      AND EXISTS (
        SELECT 1 FROM public.users c
        WHERE c.id = complaints.student_id
          AND c.institution_id = public.current_user_institution_id()
      )
    )
  );

-- 6. audit_logs
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_rollback_safe" ON public.audit_logs;
CREATE POLICY "audit_logs_rollback_safe" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() = 'INSTITUTION_ADMIN'
      AND EXISTS (
        SELECT 1 FROM public.users actor
        WHERE actor.id = audit_logs.user_id
          AND actor.institution_id = public.current_user_institution_id()
      )
    )
  );
