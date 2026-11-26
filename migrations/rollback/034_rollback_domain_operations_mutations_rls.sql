-- ==============================================================================
-- Rollback for Migration 034: Domain Operations Mutations RLS Policies
-- ==============================================================================

DROP POLICY IF EXISTS "events_insert" ON public.events;
DROP POLICY IF EXISTS "events_update" ON public.events;
DROP POLICY IF EXISTS "events_delete" ON public.events;

DROP POLICY IF EXISTS "event_registrations_insert" ON public.event_registrations;
DROP POLICY IF EXISTS "event_registrations_delete" ON public.event_registrations;

DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;

DROP POLICY IF EXISTS "job_posts_insert" ON public.job_posts;
DROP POLICY IF EXISTS "job_posts_update" ON public.job_posts;

DROP POLICY IF EXISTS "applications_insert" ON public.applications;

DROP POLICY IF EXISTS "complaints_insert" ON public.complaints;
DROP POLICY IF EXISTS "leave_applications_insert" ON public.leave_applications;
