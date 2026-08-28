-- Review hardening: preserve configured offer currency and align global-admin
-- transition access with the application authorization matrix.

ALTER TABLE public.offer_letters
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'AUD';

CREATE OR REPLACE FUNCTION public.sync_offer_letter_currency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.currency IS NULL OR NEW.currency = 'AUD' THEN
    SELECT COALESCE(f.currency, 'AUD') INTO NEW.currency
    FROM public.admissions_applications a
    LEFT JOIN public.admission_fee_configurations f
      ON f.id = a.fee_configuration_id
    WHERE a.id = NEW.application_id;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS offer_letters_currency_sync ON public.offer_letters;
CREATE TRIGGER offer_letters_currency_sync
  BEFORE INSERT ON public.offer_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_offer_letter_currency();

CREATE OR REPLACE FUNCTION public.admissions_transition(
  p_application_id uuid,
  p_new_status text,
  p_actor_id uuid,
  p_reason text DEFAULT NULL
) RETURNS public.admissions_applications
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn$
DECLARE
  application_row public.admissions_applications;
  actor public.users;
  prior_status text;
  allowed boolean;
BEGIN
  SELECT * INTO actor FROM public.users WHERE id = p_actor_id;
  IF actor.id IS NULL THEN
    RAISE EXCEPTION 'Admissions transition is not authorized';
  END IF;

  SELECT * INTO application_row
  FROM public.admissions_applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF application_row.id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF actor.role = 'STUDENT' THEN
    IF application_row.student_id <> actor.id
       OR application_row.institution_id <> actor.institution_id
       OR p_new_status NOT IN ('OFFER_ACCEPTED', 'DECLINED') THEN
      RAISE EXCEPTION 'Admissions transition is not authorized';
    END IF;
  ELSIF actor.role NOT IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN') THEN
    RAISE EXCEPTION 'Admissions transition is not authorized';
  ELSIF actor.role = 'INSTITUTION_ADMIN'
        AND actor.institution_id <> application_row.institution_id THEN
    RAISE EXCEPTION 'Application is outside the actor institution';
  END IF;

  prior_status := application_row.status;
  allowed := CASE prior_status
    WHEN 'APPLIED' THEN p_new_status IN ('UNDER_REVIEW', 'REJECTED')
    WHEN 'UNDER_REVIEW' THEN p_new_status IN ('APPROVED', 'REJECTED')
    WHEN 'APPROVED' THEN p_new_status = 'OFFER_SENT'
    WHEN 'OFFER_SENT' THEN p_new_status IN ('OFFER_ACCEPTED', 'DECLINED', 'EXPIRED')
    WHEN 'OFFER_ACCEPTED' THEN p_new_status = 'ENROLLED'
    ELSE false
  END;
  IF NOT allowed THEN
    RAISE EXCEPTION 'Invalid admissions transition: % -> %', prior_status, p_new_status;
  END IF;

  UPDATE public.admissions_applications
  SET status = p_new_status, updated_at = now()
  WHERE id = p_application_id
  RETURNING * INTO application_row;

  INSERT INTO public.admission_status_history(
    application_id, institution_id, actor_id, prior_status, new_status, reason
  ) VALUES (
    application_row.id, application_row.institution_id, p_actor_id,
    prior_status, p_new_status, p_reason
  );
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_actor_id, 'ADMISSION_STATUS_CHANGED', 'ADMISSION_APPLICATION',
    application_row.id,
    jsonb_build_object('prior_status', prior_status, 'new_status', p_new_status, 'reason', p_reason)
  );
  RETURN application_row;
END;
$fn$;

REVOKE ALL ON FUNCTION public.admissions_transition(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admissions_transition(uuid, text, uuid, text) TO service_role;

COMMENT ON COLUMN public.offer_letters.currency IS
  'ISO 4217-style three-letter currency copied from the application fee configuration.';
