-- Minimal synthetic dependencies on isolated PostgreSQL 17. No hosted records.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE TABLE public.institutions (
  id uuid PRIMARY KEY, name text, domain text, organization_id uuid NOT NULL
);
CREATE TABLE public.users (
  id uuid PRIMARY KEY, role text NOT NULL, is_active boolean,
  institution_id uuid, organization_id uuid
);
CREATE TABLE public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id), action text NOT NULL,
  entity_type text NOT NULL, entity_id uuid, metadata jsonb,
  created_at timestamp without time zone DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Match the relevant baseline exposure: institution RLS disabled, audit RLS on.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
