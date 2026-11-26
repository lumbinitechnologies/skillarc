-- =============================================================
-- Fix: Notifications RLS + link column
-- Run this in the Supabase SQL editor
-- =============================================================

-- 1. Add link column to notifications (if it doesn't exist)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link text;

-- 2. Enable Row Level Security on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Drop any existing policies to start clean
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_service_role" ON public.notifications;

-- 4. Users can only SELECT their own notifications
CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Users can UPDATE (mark as read) their own notifications
CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 6. Service role (admin client) can INSERT notifications for any user
-- The service_role bypasses RLS by default, so no explicit INSERT policy is needed.
-- But adding this for clarity:
CREATE POLICY "notifications_insert_service_role"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- 7. Also allow authenticated users to insert (for client-side notification creation if needed)
-- NOTE: In production, remove this and only use service_role for inserts
-- DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;

-- =============================================================
-- Also enable RLS on notification_preferences (if not already)
-- =============================================================
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_prefs_select_own" ON public.notification_preferences;
DROP POLICY IF EXISTS "notif_prefs_upsert_own" ON public.notification_preferences;

CREATE POLICY "notif_prefs_select_own"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notif_prefs_upsert_own"
ON public.notification_preferences
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
