-- Migration 021: Add demographic and compliance fields to admissions_applications

ALTER TABLE public.admissions_applications
  ADD COLUMN IF NOT EXISTS date_of_birth text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS country_of_birth text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS usi text,
  ADD COLUMN IF NOT EXISTS passport_number text,
  ADD COLUMN IF NOT EXISTS passport_expiry text,
  ADD COLUMN IF NOT EXISTS visa_type text,
  ADD COLUMN IF NOT EXISTS visa_expiry text,
  ADD COLUMN IF NOT EXISTS english_evidence text,
  ADD COLUMN IF NOT EXISTS application_data jsonb DEFAULT '{}'::jsonb;
