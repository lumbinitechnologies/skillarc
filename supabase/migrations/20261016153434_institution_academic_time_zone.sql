-- Nullable by design: no guessed timezone and no conversion of existing records.
ALTER TABLE public.institutions ADD COLUMN academic_time_zone text;
COMMENT ON COLUMN public.institutions.academic_time_zone IS
  'Explicit institution-owned IANA timezone. NULL means academic time is not configured; never inherit a user preference.';

-- The reconciled baseline has ineffective institution RLS. Protect this new
-- field without broadening grants or changing unrelated institution behavior.
CREATE FUNCTION public.guard_institution_academic_time_zone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.academic_time_zone IS NOT DISTINCT FROM OLD.academic_time_zone THEN
      RETURN NEW;
    END IF;
  ELSIF NEW.academic_time_zone IS NULL THEN
    RETURN NEW;
  END IF;

  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'Academic timezone must be configured through the authorized server path'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.academic_time_zone IS NOT NULL AND (
    length(NEW.academic_time_zone) > 100 OR
    (NEW.academic_time_zone <> 'UTC' AND
      NEW.academic_time_zone !~ '^[A-Za-z_+-]+(/[A-Za-z0-9_+.-]+)+$') OR
    NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = NEW.academic_time_zone)
  ) THEN
    RAISE EXCEPTION 'Unsupported academic timezone' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_institution_academic_time_zone() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_institution_academic_time_zone
BEFORE INSERT OR UPDATE OF academic_time_zone ON public.institutions
FOR EACH ROW EXECUTE FUNCTION public.guard_institution_academic_time_zone();

-- Invoker privileges only. Callable by the trusted server, not Data API users.
-- Verify scope again in the transaction and make the audit inseparable from it.
CREATE FUNCTION public.set_institution_academic_time_zone(
  p_actor_id uuid,
  p_institution_id uuid,
  p_organization_id uuid,
  p_academic_time_zone text
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  previous_zone text;
BEGIN
  PERFORM 1 FROM public.users
    WHERE id = p_actor_id AND is_active IS TRUE AND role = 'INSTITUTION_ADMIN'
      AND institution_id = p_institution_id AND organization_id = p_organization_id
    FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT academic_time_zone INTO previous_zone
    FROM public.institutions
    WHERE id = p_institution_id AND organization_id = p_organization_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  -- No audit duplication on a retry/no-op. No user preference is consulted.
  IF previous_zone IS NOT DISTINCT FROM p_academic_time_zone THEN
    RETURN previous_zone;
  END IF;
  UPDATE public.institutions SET academic_time_zone = p_academic_time_zone
    WHERE id = p_institution_id AND organization_id = p_organization_id;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (p_actor_id, 'ACADEMIC_TIME_ZONE_UPDATED', 'INSTITUTION', p_institution_id,
    jsonb_build_object('previous', previous_zone, 'current', p_academic_time_zone));
  RETURN p_academic_time_zone;
END;
$$;
REVOKE ALL ON FUNCTION public.set_institution_academic_time_zone(uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_institution_academic_time_zone(uuid, uuid, uuid, text)
  TO service_role;
