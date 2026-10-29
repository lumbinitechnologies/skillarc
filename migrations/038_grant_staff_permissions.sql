-- Migration 038: Grant permissions on staff table to authenticated and service_role
-- Fixes PostgreSQL 42501 permission denied for table staff

GRANT ALL ON TABLE public.staff TO authenticated;
GRANT ALL ON TABLE public.staff TO service_role;
GRANT ALL ON TABLE public.staff TO postgres;
