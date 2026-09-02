-- Migration 018: Timetable & Session Management Enhancements
-- Adds support for Rooms, Delivery Modes, Online Meeting Links, 
-- Clash Detection Metadata, and Academic Calendar Events (Holidays/Term Breaks).

-- 1. Enhance timetable_slots with room, delivery_mode, meeting_link, notes, and audit timestamps
ALTER TABLE public.timetable_slots
  ADD COLUMN IF NOT EXISTS room text,
  ADD COLUMN IF NOT EXISTS delivery_mode text DEFAULT 'ON_CAMPUS',
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id);

-- Ensure delivery_mode check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timetable_slots_delivery_mode_check'
  ) THEN
    ALTER TABLE public.timetable_slots
      ADD CONSTRAINT timetable_slots_delivery_mode_check 
      CHECK (delivery_mode IN ('ON_CAMPUS', 'ONLINE', 'HYBRID'));
  END IF;
END $$;

-- 2. Upgrade legacy unique constraint to support multi-week & in-place updates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timetable_slots_unique_slot'
  ) THEN
    ALTER TABLE public.timetable_slots DROP CONSTRAINT timetable_slots_unique_slot;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS timetable_slots_unique_cell_idx 
  ON public.timetable_slots (institution_id, section_id, semester, day, period, COALESCE(week_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 3. Create academic_calendar_events table for Public Holidays, Term Breaks, and Academic Events
CREATE TABLE IF NOT EXISTS public.academic_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('PUBLIC_HOLIDAY', 'TERM_BREAK', 'EXAM_PERIOD', 'CAMPUS_EVENT', 'ORIENTATION')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  description text,
  affects_classes boolean DEFAULT true,
  color text DEFAULT '#6C63FF',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT academic_calendar_dates_check CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS academic_calendar_inst_dates_idx 
  ON public.academic_calendar_events(institution_id, start_date, end_date);

-- Enable RLS
ALTER TABLE public.academic_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academic_calendar_events_read ON public.academic_calendar_events;
CREATE POLICY academic_calendar_events_read ON public.academic_calendar_events
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS academic_calendar_events_admin_manage ON public.academic_calendar_events;
CREATE POLICY academic_calendar_events_admin_manage ON public.academic_calendar_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = (SELECT auth.uid()) 
      AND (u.role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN') OR u.institution_id = academic_calendar_events.institution_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = (SELECT auth.uid()) 
      AND (u.role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN') OR u.institution_id = academic_calendar_events.institution_id)
    )
  );
