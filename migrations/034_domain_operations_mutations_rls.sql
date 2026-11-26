-- ==============================================================================
-- Migration 034: Domain Operations & Meeting Mutations RLS Policies
-- ==============================================================================
-- Provides scoped INSERT, UPDATE, DELETE policies for operations tables:
-- 1. events
-- 2. event_registrations
-- 3. announcements
-- 4. job_posts & applications
-- 5. complaints & leave_applications
-- ==============================================================================

-- -------------------------------------------------------------
-- 1. Events
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
      AND events.institution_id = public.current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS "events_update" ON public.events;
CREATE POLICY "events_update" ON public.events
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      events.institution_id = public.current_user_institution_id()
      AND (
        events.created_by = (SELECT auth.uid())
        OR public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
      )
    )
  );

DROP POLICY IF EXISTS "events_delete" ON public.events;
CREATE POLICY "events_delete" ON public.events
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      events.institution_id = public.current_user_institution_id()
      AND (
        events.created_by = (SELECT auth.uid())
        OR public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
      )
    )
  );

-- -------------------------------------------------------------
-- 2. Event Registrations
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "event_registrations_insert" ON public.event_registrations;
CREATE POLICY "event_registrations_insert" ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
  );

DROP POLICY IF EXISTS "event_registrations_delete" ON public.event_registrations;
CREATE POLICY "event_registrations_delete" ON public.event_registrations
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
  );

-- -------------------------------------------------------------
-- 3. Announcements
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
CREATE POLICY "announcements_insert" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
      AND announcements.institution_id = public.current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
CREATE POLICY "announcements_update" ON public.announcements
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      announcements.institution_id = public.current_user_institution_id()
      AND public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
    )
  );

DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;
CREATE POLICY "announcements_delete" ON public.announcements
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      announcements.institution_id = public.current_user_institution_id()
      AND public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
    )
  );

-- -------------------------------------------------------------
-- 4. Job Posts & Applications
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "job_posts_insert" ON public.job_posts;
CREATE POLICY "job_posts_insert" ON public.job_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
      AND job_posts.institution_id = public.current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS "job_posts_update" ON public.job_posts;
CREATE POLICY "job_posts_update" ON public.job_posts
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      job_posts.institution_id = public.current_user_institution_id()
      AND public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
    )
  );

DROP POLICY IF EXISTS "applications_insert" ON public.applications;
CREATE POLICY "applications_insert" ON public.applications
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
  );

-- -------------------------------------------------------------
-- 5. Complaints & Leave Applications
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "complaints_insert" ON public.complaints;
CREATE POLICY "complaints_insert" ON public.complaints
  FOR INSERT TO authenticated
  WITH CHECK (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "leave_applications_insert" ON public.leave_applications;
CREATE POLICY "leave_applications_insert" ON public.leave_applications
  FOR INSERT TO authenticated
  WITH CHECK (student_id = (SELECT auth.uid()));
