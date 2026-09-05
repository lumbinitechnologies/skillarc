-- Migration 020: Add reference_number to admissions_applications

ALTER TABLE public.admissions_applications
  ADD COLUMN IF NOT EXISTS reference_number text;

CREATE INDEX IF NOT EXISTS idx_admissions_applications_ref
  ON public.admissions_applications(reference_number);

-- Populate existing applications with friendly reference codes
UPDATE public.admissions_applications
SET reference_number = 'APP-' || EXTRACT(YEAR FROM COALESCE(created_at, now()))::text || '-' || UPPER(SUBSTRING(id::text, 1, 4))
WHERE reference_number IS NULL;
