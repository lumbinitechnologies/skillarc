-- ============================================================
-- MIGRATION: Add institution_id to job_posts and companies
-- ============================================================
-- 
-- Run this script in your Supabase SQL Editor to enable 
-- campus placements and recruiters filtering by institution.
-- 

-- 1. Add the column referencing public.institutions(id) to job_posts
ALTER TABLE public.job_posts 
ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id);

CREATE INDEX IF NOT EXISTS idx_job_posts_institution ON public.job_posts(institution_id);

-- 2. Add the column referencing public.institutions(id) to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id);

CREATE INDEX IF NOT EXISTS idx_companies_institution ON public.companies(institution_id);

