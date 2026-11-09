-- Reconcile #69 legacy SQL into the canonical forward-only history.
BEGIN;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_type text NOT NULL DEFAULT 'college'
  CHECK (org_type IN ('school', 'college'));
CREATE INDEX IF NOT EXISTS idx_organizations_org_type ON public.organizations (org_type);
COMMENT ON COLUMN public.organizations.org_type IS
  'Institution category: school (K-12) or college (higher education).';
-- Legacy 037 is already represented in the reconciled baseline (users.phone).
-- Do not copy legacy 038: its broad authenticated grant exposes the pre-existing
-- cross-organization staff policies. Service-role access already exists.
-- Migration 039: Add ON DELETE CASCADE to user-dependent tables (parent_student_relations, notifications)
-- Fixes foreign key constraint violations when deleting students, faculty, or parents

-- 1. parent_student_relations
ALTER TABLE public.parent_student_relations
  DROP CONSTRAINT IF EXISTS parent_student_relations_student_id_fkey,
  DROP CONSTRAINT IF EXISTS parent_student_relations_parent_id_fkey;

ALTER TABLE public.parent_student_relations
  ADD CONSTRAINT parent_student_relations_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT parent_student_relations_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. notifications & notification_preferences
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

COMMIT;
