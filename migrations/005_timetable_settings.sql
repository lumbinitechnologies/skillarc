-- -------------------------------------------------------------
-- TIMETABLE SETTINGS
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.institution_timetable_settings (
  institution_id UUID PRIMARY KEY REFERENCES public.institutions(id) ON DELETE CASCADE,
  start_time TIME NOT NULL DEFAULT '08:45:00',
  end_time TIME NOT NULL DEFAULT '16:00:00',
  period_duration_minutes INTEGER NOT NULL DEFAULT 60,
  number_of_periods INTEGER NOT NULL DEFAULT 5,
  period_timings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.institution_timetable_settings ENABLE ROW LEVEL SECURITY;

-- Select policy: anyone authenticated can read timetable settings
CREATE POLICY select_settings ON public.institution_timetable_settings
  FOR SELECT TO authenticated USING (true);

-- Insert/Update/Delete policy: institution admins can manage settings
CREATE POLICY all_settings ON public.institution_timetable_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'INSTITUTION_ADMIN'
        AND users.institution_id = institution_timetable_settings.institution_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'INSTITUTION_ADMIN'
        AND users.institution_id = institution_timetable_settings.institution_id
    )
  );
