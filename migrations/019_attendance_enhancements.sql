-- Migration 019: Attendance Enhancements
-- Adds support for 'APPROVED_ABSENCE', per-student notes, per-session notes,
-- and persistent attendance warning letter logging.

-- 1. Upgrade status check constraint on attendance_records if present
DO $$
BEGIN
  -- Drop existing check constraint if named standardly
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_records_status_check'
  ) THEN
    ALTER TABLE public.attendance_records DROP CONSTRAINT attendance_records_status_check;
  END IF;
END $$;

-- 2. Add notes column to attendance_records
ALTER TABLE public.attendance_records 
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. Add session_notes column to attendance_sessions
ALTER TABLE public.attendance_sessions 
  ADD COLUMN IF NOT EXISTS session_notes text;

-- 4. Create attendance_warning_letters table
CREATE TABLE IF NOT EXISTS public.attendance_warning_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  warning_level text NOT NULL, -- 'FIRST_WARNING', 'SECOND_WARNING', 'FINAL_BREACH_NOTICE'
  attendance_percentage numeric NOT NULL,
  total_sessions integer DEFAULT 0,
  missed_sessions integer DEFAULT 0,
  intervention_date date,
  rendered_letter_html text NOT NULL,
  issued_by uuid REFERENCES public.users(id),
  issued_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'ISSUED'
);

-- Enable RLS
ALTER TABLE public.attendance_warning_letters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_authenticated_all_attendance_warnings'
  ) THEN
    CREATE POLICY allow_authenticated_all_attendance_warnings 
      ON public.attendance_warning_letters 
      FOR ALL 
      TO authenticated 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;
