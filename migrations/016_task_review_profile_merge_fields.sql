-- Allow generated admission documents to reuse approved, non-binary profile
-- compliance fields without introducing VET/AVETMISS semantics.

CREATE OR REPLACE FUNCTION public.admissions_generate_offer(p_application_id uuid, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  a public.admissions_applications;
  actor public.users;
  fee public.admission_fee_configurations;
  offer_template public.admission_templates;
  agreement_template public.admission_templates;
  profile public.student_profile_details;
  offer public.offer_letters;
  agreement public.admission_documents_v2;
  data jsonb;
  html text;
  agreement_html text;
  field text;
  next_version integer;
BEGIN
  SELECT * INTO actor FROM public.users WHERE id = p_actor_id;
  SELECT * INTO a FROM public.admissions_applications WHERE id = p_application_id FOR UPDATE;
  IF actor.id IS NULL OR actor.role NOT IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN') THEN
    RAISE EXCEPTION 'Offer generation is not authorized';
  END IF;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF actor.role = 'INSTITUTION_ADMIN' AND actor.institution_id <> a.institution_id THEN
    RAISE EXCEPTION 'Application is outside the actor institution';
  END IF;
  IF a.status <> 'APPROVED' THEN RAISE EXCEPTION 'Application must be APPROVED before an offer is generated'; END IF;
  IF a.course_start_date IS NULL OR a.course_end_date IS NULL OR a.course_start_date >= a.course_end_date THEN
    RAISE EXCEPTION 'Valid course start and end dates are required';
  END IF;
  SELECT * INTO fee FROM public.admission_fee_configurations
  WHERE id = a.fee_configuration_id AND institution_id = a.institution_id AND is_active;
  IF fee.id IS NULL THEN RAISE EXCEPTION 'Active fee configuration is required'; END IF;
  SELECT * INTO offer_template FROM public.admission_templates
  WHERE institution_id = a.institution_id AND document_type = 'OFFER' AND is_active;
  SELECT * INTO agreement_template FROM public.admission_templates
  WHERE institution_id = a.institution_id AND document_type = 'AGREEMENT' AND is_active;
  IF offer_template.id IS NULL OR agreement_template.id IS NULL THEN
    RAISE EXCEPTION 'Active offer and agreement templates are required';
  END IF;
  IF a.student_id IS NOT NULL THEN
    SELECT * INTO profile FROM public.student_profile_details
    WHERE student_id = a.student_id AND institution_id = a.institution_id;
  END IF;
  data := jsonb_build_object(
    'student_name', trim(a.first_name || ' ' || a.last_name),
    'student_email', a.email,
    'student_phone', coalesce(a.phone, ''),
    'qualification', coalesce((SELECT name FROM public.programs WHERE id = a.program_id), ''),
    'intake_name', coalesce((SELECT name FROM public.intakes WHERE id = a.intake_id), ''),
    'intake_start_date', (SELECT start_date FROM public.intakes WHERE id = a.intake_id),
    'intake_end_date', (SELECT end_date FROM public.intakes WHERE id = a.intake_id),
    'course_start_date', a.course_start_date,
    'course_end_date', a.course_end_date,
    'fee_amount', fee.amount,
    'fee_currency', fee.currency,
    'citizenship', coalesce(profile.citizenship, ''),
    'country_of_birth', coalesce(profile.country_of_birth, ''),
    'passport_country', coalesce(profile.passport_country, ''),
    'passport_expiry', profile.passport_expiry,
    'visa_type', coalesce(profile.visa_type, ''),
    'visa_expiry', profile.visa_expiry,
    'english_evidence_type', coalesce(profile.english_evidence_type, '')
  );
  FOREACH field IN ARRAY offer_template.merge_fields LOOP
    IF NOT (data ? field) OR data->>field IS NULL OR data->>field = '' THEN
      RAISE EXCEPTION 'Missing required offer merge field: %', field;
    END IF;
  END LOOP;
  FOREACH field IN ARRAY agreement_template.merge_fields LOOP
    IF NOT (data ? field) OR data->>field IS NULL OR data->>field = '' THEN
      RAISE EXCEPTION 'Missing required agreement merge field: %', field;
    END IF;
  END LOOP;
  html := offer_template.body;
  FOREACH field IN ARRAY offer_template.merge_fields LOOP
    html := replace(html, '{{' || field || '}}', data->>field);
  END LOOP;
  agreement_html := agreement_template.body;
  FOREACH field IN ARRAY agreement_template.merge_fields LOOP
    agreement_html := replace(agreement_html, '{{' || field || '}}', data->>field);
  END LOOP;
  SELECT coalesce(max(version), 0) + 1 INTO next_version
  FROM public.offer_letters WHERE application_id = a.id;
  INSERT INTO public.offer_letters(application_id, course_fees, term_start, status, version, template_id, rendered_html)
  VALUES (a.id, fee.amount, a.course_start_date, 'SENT', next_version, offer_template.id, html)
  RETURNING * INTO offer;
  INSERT INTO public.admission_documents_v2(application_id, institution_id, document_type, version, template_id, rendered_html, source_data, created_by)
  VALUES (a.id, a.institution_id, 'AGREEMENT', next_version, agreement_template.id, agreement_html, data, p_actor_id)
  RETURNING * INTO agreement;
  UPDATE public.offer_letters SET agreement_document_id = agreement.id WHERE id = offer.id;
  UPDATE public.admissions_applications SET status = 'OFFER_SENT', updated_at = now() WHERE id = a.id RETURNING * INTO a;
  INSERT INTO public.admission_status_history(application_id, institution_id, actor_id, prior_status, new_status, reason)
  VALUES (a.id, a.institution_id, p_actor_id, 'APPROVED', 'OFFER_SENT', 'Offer and agreement generated');
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (p_actor_id, 'ADMISSION_OFFER_GENERATED', 'ADMISSION_APPLICATION', a.id,
    jsonb_build_object('offer_version', next_version, 'agreement_version', next_version));
  RETURN jsonb_build_object('application', a, 'offer', offer, 'agreement', agreement);
END;
$fn$;

REVOKE ALL ON FUNCTION public.admissions_generate_offer(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admissions_generate_offer(uuid, uuid) TO service_role;
