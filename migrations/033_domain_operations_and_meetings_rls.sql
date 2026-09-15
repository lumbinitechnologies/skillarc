-- ==============================================================================
-- Migration 033: Collaboration, Placement & Operations Domain RLS Hardening (Domain 4)
-- ==============================================================================
-- 1. Creates SECURITY DEFINER helpers for meeting participant/host checks to eliminate recursion.
-- 2. Replaces open "USING (true)" policies on meetings, participants, messages, files.
-- 3. Enables RLS on events, announcements, complaints, applications, job_posts, audit_logs.
-- ==============================================================================

-- -------------------------------------------------------------
-- 0. Non-recursive Meeting Security Definer Helpers
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_meeting_participant(p_meeting_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_participants
    WHERE meeting_id = p_meeting_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_meeting_host(p_meeting_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings
    WHERE id = p_meeting_id AND faculty_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_meeting_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_meeting_host(uuid, uuid) TO authenticated;

-- -------------------------------------------------------------
-- 1. Meetings, Participants & Messages
-- -------------------------------------------------------------
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meetings_all" ON public.meetings;
DROP POLICY IF EXISTS "meetings_scoped_select" ON public.meetings;
CREATE POLICY "meetings_scoped_select" ON public.meetings
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

DROP POLICY IF EXISTS "participants_all" ON public.meeting_participants;
DROP POLICY IF EXISTS "participants_scoped_select" ON public.meeting_participants;
CREATE POLICY "participants_scoped_select" ON public.meeting_participants
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_meeting_host(meeting_participants.meeting_id, (SELECT auth.uid()))
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() = 'INSTITUTION_ADMIN'
      AND EXISTS (
        SELECT 1 FROM public.meetings m
        WHERE m.id = meeting_participants.meeting_id
          AND m.institution_id = public.current_user_institution_id()
      )
    )
  );

DROP POLICY IF EXISTS "messages_all" ON public.meeting_messages;
DROP POLICY IF EXISTS "messages_scoped_select" ON public.meeting_messages;
CREATE POLICY "messages_scoped_select" ON public.meeting_messages
  FOR SELECT TO authenticated
  USING (
    public.is_meeting_participant(meeting_messages.meeting_id, (SELECT auth.uid()))
    OR public.is_meeting_host(meeting_messages.meeting_id, (SELECT auth.uid()))
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
  );

DROP POLICY IF EXISTS "messages_scoped_insert" ON public.meeting_messages;
CREATE POLICY "messages_scoped_insert" ON public.meeting_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND (
      public.is_meeting_participant(meeting_messages.meeting_id, (SELECT auth.uid()))
      OR public.is_meeting_host(meeting_messages.meeting_id, (SELECT auth.uid()))
    )
  );

-- -------------------------------------------------------------
-- 2. Files & Storage Metadata
-- -------------------------------------------------------------
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "files_all" ON public.files;
DROP POLICY IF EXISTS "files_scoped_select" ON public.files;
CREATE POLICY "files_scoped_select" ON public.files
  FOR SELECT TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      files.institution_id IS NOT NULL
      AND files.institution_id = public.current_user_institution_id()
    )
  );

-- -------------------------------------------------------------
-- 3. Events, Announcements, Complaints, Placements, Audit Logs
-- -------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select" ON public.events;
CREATE POLICY "events_select" ON public.events
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR events.institution_id = public.current_user_institution_id()
  );

DROP POLICY IF EXISTS "event_registrations_select" ON public.event_registrations;
CREATE POLICY "event_registrations_select" ON public.event_registrations
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.events ev
      WHERE ev.id = event_registrations.event_id
        AND ev.institution_id = public.current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR announcements.institution_id = public.current_user_institution_id()
  );

DROP POLICY IF EXISTS "companies_select" ON public.companies;
CREATE POLICY "companies_select" ON public.companies
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "job_posts_select" ON public.job_posts;
CREATE POLICY "job_posts_select" ON public.job_posts
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR job_posts.institution_id = public.current_user_institution_id()
  );

DROP POLICY IF EXISTS "applications_select" ON public.applications;
CREATE POLICY "applications_select" ON public.applications
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.job_posts jp
      WHERE jp.id = applications.job_post_id
        AND jp.institution_id = public.current_user_institution_id()
        AND public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD')
    )
  );

DROP POLICY IF EXISTS "complaints_select" ON public.complaints;
CREATE POLICY "complaints_select" ON public.complaints
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
      AND EXISTS (
        SELECT 1 FROM public.users complainer
        WHERE complainer.id = complaints.student_id
          AND complainer.institution_id = public.current_user_institution_id()
      )
    )
  );

DROP POLICY IF EXISTS "leave_applications_select" ON public.leave_applications;
CREATE POLICY "leave_applications_select" ON public.leave_applications
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR advisor_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      leave_applications.institution_id = public.current_user_institution_id()
      AND public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'FACULTY')
    )
  );

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs
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
