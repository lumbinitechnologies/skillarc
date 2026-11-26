-- Task 08: institution-scoped student profile storage.
CREATE TABLE IF NOT EXISTS public.education_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_profile_details (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  citizenship text,
  country_of_birth text,
  passport_number text,
  passport_country text,
  passport_expiry date,
  visa_type text,
  visa_number text,
  visa_expiry date,
  english_evidence_type text,
  english_evidence_reference text,
  english_evidence_date date,
  usi text,
  other_identifiers jsonb,
  education_agent_id uuid REFERENCES public.education_agents(id),
  marketing_staff_id uuid REFERENCES public.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('RESIDENTIAL', 'POSTAL')),
  address_line_1 text NOT NULL,
  address_line_2 text,
  locality text NOT NULL,
  state_province text,
  postal_code text NOT NULL,
  country text NOT NULL,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS student_addresses_one_current
  ON public.student_addresses(student_id, type) WHERE is_current;

CREATE TABLE IF NOT EXISTS public.student_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  email text,
  phone text,
  address text,
  priority integer NOT NULL DEFAULT 1 CHECK (priority > 0),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS student_emergency_one_primary
  ON public.student_emergency_contacts(student_id) WHERE is_primary;

CREATE TABLE IF NOT EXISTS public.student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.student_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.users(id),
  summary text NOT NULL,
  channel text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS student_profile_details_institution
  ON public.student_profile_details(institution_id);
CREATE INDEX IF NOT EXISTS student_addresses_student
  ON public.student_addresses(student_id, type);
CREATE INDEX IF NOT EXISTS student_emergency_contacts_student
  ON public.student_emergency_contacts(student_id, priority);
CREATE INDEX IF NOT EXISTS student_notes_student
  ON public.student_notes(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS student_communications_student
  ON public.student_communications(student_id, occurred_at DESC);

ALTER TABLE public.student_profile_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_communications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'student_profile_details', 'student_addresses',
    'student_emergency_contacts', 'student_notes', 'student_communications'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_scoped ON public.%I', table_name, table_name);
    EXECUTE format($policy$
      CREATE POLICY %I_select_scoped ON public.%I FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.users actor
        JOIN public.students target ON target.id = %I.student_id
        WHERE actor.id = auth.uid()
          AND target.institution_id = %I.institution_id
          AND (actor.id = %I.student_id OR actor.institution_id = %I.institution_id
               OR actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN'))
      ))
    $policy$, table_name, table_name, table_name, table_name, table_name, table_name);
  END LOOP;
END $$;
