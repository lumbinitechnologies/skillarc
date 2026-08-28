-- Task 12: explicit, institution-scoped student portal access.
-- Invitation tokens and auth secrets remain exclusively in Supabase Auth.

CREATE TABLE IF NOT EXISTS public.student_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'NOT_INVITED'
    CHECK (status IN ('NOT_INVITED', 'INVITED', 'ACTIVE', 'DEACTIVATED')),
  invited_at timestamptz,
  activated_at timestamptz,
  deactivated_at timestamptz,
  last_invited_at timestamptz,
  invited_by uuid REFERENCES public.users(id),
  activated_by uuid REFERENCES public.users(id),
  deactivated_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_portal_access_student_institution_unique UNIQUE (student_id, institution_id)
);

CREATE INDEX IF NOT EXISTS student_portal_access_institution_status_idx
  ON public.student_portal_access(institution_id, status);
CREATE INDEX IF NOT EXISTS student_portal_access_auth_user_idx
  ON public.student_portal_access(auth_user_id);

CREATE OR REPLACE FUNCTION public.validate_student_portal_access_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE student_institution uuid; auth_institution uuid;
BEGIN
  SELECT institution_id INTO student_institution FROM public.students WHERE id = NEW.student_id;
  SELECT institution_id INTO auth_institution FROM public.users WHERE id = NEW.auth_user_id;
  IF student_institution IS NULL OR student_institution <> NEW.institution_id THEN
    RAISE EXCEPTION 'Student portal access is outside the student institution' USING ERRCODE = '23514';
  END IF;
  IF auth_institution IS NULL OR auth_institution <> NEW.institution_id THEN
    RAISE EXCEPTION 'Student portal auth user is outside the student institution' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS student_portal_access_scope_trigger ON public.student_portal_access;
CREATE TRIGGER student_portal_access_scope_trigger
  BEFORE INSERT OR UPDATE ON public.student_portal_access
  FOR EACH ROW EXECUTE FUNCTION public.validate_student_portal_access_scope();

CREATE OR REPLACE FUNCTION public.touch_student_portal_access()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$fn$;
DROP TRIGGER IF EXISTS student_portal_access_updated_at ON public.student_portal_access;
CREATE TRIGGER student_portal_access_updated_at
  BEFORE UPDATE ON public.student_portal_access
  FOR EACH ROW EXECUTE FUNCTION public.touch_student_portal_access();

ALTER TABLE public.student_portal_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_portal_access_scoped ON public.student_portal_access;
CREATE POLICY student_portal_access_scoped ON public.student_portal_access
  FOR SELECT TO authenticated USING (
    auth_user_id = (SELECT auth.uid()) OR EXISTS (
      SELECT 1 FROM public.users actor
      WHERE actor.id = (SELECT auth.uid())
        AND (actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN') OR actor.institution_id = student_portal_access.institution_id)
    )
  );

COMMENT ON TABLE public.student_portal_access IS
  'Institution-scoped portal lifecycle. Supabase Auth owns invitation tokens; this table stores status and audit references only.';
