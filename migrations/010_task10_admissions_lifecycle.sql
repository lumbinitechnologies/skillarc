-- Task 10: admissions configuration, document versions, and transactional lifecycle.
-- This migration is additive. Existing applications and offers are preserved.

ALTER TABLE public.admissions_applications
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id),
  ADD COLUMN IF NOT EXISTS intake_id uuid REFERENCES public.intakes(id),
  ADD COLUMN IF NOT EXISTS fee_configuration_id uuid,
  ADD COLUMN IF NOT EXISTS course_start_date date,
  ADD COLUMN IF NOT EXISTS course_end_date date,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- The previous application flow used OFFER_GENERATED. Normalize any legacy
-- rows before replacing the status constraint with the lifecycle vocabulary.
UPDATE public.admissions_applications
SET status = 'OFFER_SENT', updated_at = now()
WHERE status = 'OFFER_GENERATED';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.admissions_applications
    WHERE status NOT IN (
      'APPLIED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'OFFER_SENT',
      'OFFER_ACCEPTED', 'DECLINED', 'EXPIRED', 'ENROLLED'
    )
  ) THEN
    RAISE EXCEPTION 'Unsupported admissions application status remains after legacy normalization';
  END IF;
END $$;

ALTER TABLE public.admissions_applications DROP CONSTRAINT IF EXISTS admissions_applications_status_check;
ALTER TABLE public.admissions_applications ADD CONSTRAINT admissions_applications_status_check CHECK (status IN (
  'APPLIED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'OFFER_SENT',
  'OFFER_ACCEPTED', 'DECLINED', 'EXPIRED', 'ENROLLED'
));

CREATE TABLE IF NOT EXISTS public.admission_fee_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'AUD',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, program_id, intake_id, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS admission_one_active_fee
  ON public.admission_fee_configurations(institution_id, program_id, intake_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.admission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('OFFER', 'AGREEMENT')),
  version integer NOT NULL CHECK (version > 0),
  name text NOT NULL,
  body text NOT NULL,
  merge_fields text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, document_type, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS admission_one_active_template
  ON public.admission_templates(institution_id, document_type) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.admission_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.admissions_applications(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.users(id),
  prior_status text,
  new_status text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admission_documents_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.admissions_applications(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('OFFER', 'AGREEMENT')),
  version integer NOT NULL CHECK (version > 0),
  template_id uuid REFERENCES public.admission_templates(id),
  rendered_html text,
  storage_bucket text,
  storage_path text,
  status text NOT NULL DEFAULT 'GENERATED' CHECK (status IN ('GENERATED', 'UPLOADED', 'SIGNED', 'VOID')),
  source_data jsonb NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, document_type, version)
);

ALTER TABLE public.offer_letters
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.admission_templates(id),
  ADD COLUMN IF NOT EXISTS rendered_html text,
  ADD COLUMN IF NOT EXISTS acceptance_actor_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS acceptance_reference text,
  ADD COLUMN IF NOT EXISTS agreement_document_id uuid REFERENCES public.admission_documents_v2(id);

CREATE INDEX IF NOT EXISTS admission_status_history_application
  ON public.admission_status_history(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admission_documents_v2_application
  ON public.admission_documents_v2(application_id, document_type, version DESC);

ALTER TABLE public.admission_fee_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_documents_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admission_fee_configurations_scoped ON public.admission_fee_configurations;
CREATE POLICY admission_fee_configurations_scoped ON public.admission_fee_configurations
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid())
      AND (u.role IN ('SUPER_ADMIN','ORG_ADMIN') OR u.institution_id = admission_fee_configurations.institution_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid())
      AND (u.role IN ('SUPER_ADMIN','ORG_ADMIN') OR u.institution_id = admission_fee_configurations.institution_id))
  );
DROP POLICY IF EXISTS admission_templates_scoped ON public.admission_templates;
CREATE POLICY admission_templates_scoped ON public.admission_templates
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid())
      AND (u.role IN ('SUPER_ADMIN','ORG_ADMIN') OR u.institution_id = admission_templates.institution_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid())
      AND (u.role IN ('SUPER_ADMIN','ORG_ADMIN') OR u.institution_id = admission_templates.institution_id))
  );
DROP POLICY IF EXISTS admission_status_history_scoped ON public.admission_status_history;
CREATE POLICY admission_status_history_scoped ON public.admission_status_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid())
      AND (u.role IN ('SUPER_ADMIN','ORG_ADMIN') OR u.institution_id = admission_status_history.institution_id))
  );
DROP POLICY IF EXISTS admission_documents_v2_scoped ON public.admission_documents_v2;
CREATE POLICY admission_documents_v2_scoped ON public.admission_documents_v2
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid())
      AND (u.role IN ('SUPER_ADMIN','ORG_ADMIN') OR u.institution_id = admission_documents_v2.institution_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid())
      AND (u.role IN ('SUPER_ADMIN','ORG_ADMIN') OR u.institution_id = admission_documents_v2.institution_id))
  );

-- The allow-list is enforced at generation time; templates cannot introduce arbitrary
-- database columns through a merge expression.
CREATE OR REPLACE FUNCTION public.admissions_transition(
  p_application_id uuid,
  p_new_status text,
  p_actor_id uuid,
  p_reason text DEFAULT NULL
) RETURNS public.admissions_applications
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  current_app public.admissions_applications;
  actor public.users;
  allowed boolean := false;
BEGIN
  SELECT * INTO actor FROM public.users WHERE id = p_actor_id;
  IF actor.id IS NULL OR actor.role NOT IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN') THEN
    RAISE EXCEPTION 'Admissions transition is not authorized';
  END IF;
  SELECT * INTO current_app FROM public.admissions_applications WHERE id = p_application_id FOR UPDATE;
  IF current_app.id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF actor.role NOT IN ('SUPER_ADMIN', 'ORG_ADMIN') AND actor.institution_id <> current_app.institution_id THEN
    RAISE EXCEPTION 'Application is outside the actor institution';
  END IF;
  allowed := CASE current_app.status
    WHEN 'APPLIED' THEN p_new_status IN ('UNDER_REVIEW', 'REJECTED')
    WHEN 'UNDER_REVIEW' THEN p_new_status IN ('APPROVED', 'REJECTED')
    WHEN 'APPROVED' THEN p_new_status = 'OFFER_SENT'
    WHEN 'OFFER_SENT' THEN p_new_status IN ('OFFER_ACCEPTED', 'DECLINED', 'EXPIRED')
    WHEN 'OFFER_ACCEPTED' THEN p_new_status = 'ENROLLED'
    ELSE false
  END;
  IF NOT allowed THEN RAISE EXCEPTION 'Invalid admissions transition: % -> %', current_app.status, p_new_status; END IF;
  UPDATE public.admissions_applications SET status = p_new_status, updated_at = now() WHERE id = p_application_id RETURNING * INTO current_app;
  INSERT INTO public.admission_status_history(application_id, institution_id, actor_id, prior_status, new_status, reason)
    VALUES (p_application_id, current_app.institution_id, p_actor_id, (SELECT status FROM public.admissions_applications WHERE id = p_application_id), p_new_status, p_reason);
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
    VALUES (p_actor_id, 'ADMISSION_STATUS_CHANGED', 'ADMISSION_APPLICATION', p_application_id,
      jsonb_build_object('new_status', p_new_status, 'reason', p_reason));
  RETURN current_app;
END;
$$;

-- Fix prior_status capture without making callers manage a second write.
CREATE OR REPLACE FUNCTION public.admissions_transition(
  p_application_id uuid, p_new_status text, p_actor_id uuid, p_reason text DEFAULT NULL
) RETURNS public.admissions_applications
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $fn$
DECLARE a public.admissions_applications; actor public.users; old_status text; ok boolean;
BEGIN
  SELECT * INTO actor FROM public.users WHERE id = p_actor_id;
  IF actor.id IS NULL THEN RAISE EXCEPTION 'Admissions transition is not authorized'; END IF;
  SELECT * INTO a FROM public.admissions_applications WHERE id = p_application_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF actor.role NOT IN ('SUPER_ADMIN','ORG_ADMIN','INSTITUTION_ADMIN') AND NOT (a.student_id = actor.id AND p_new_status IN ('OFFER_ACCEPTED','DECLINED')) THEN RAISE EXCEPTION 'Admissions transition is not authorized'; END IF;
  IF actor.role IN ('SUPER_ADMIN','ORG_ADMIN','INSTITUTION_ADMIN') AND actor.role <> 'SUPER_ADMIN' AND actor.institution_id <> a.institution_id THEN RAISE EXCEPTION 'Application is outside the actor institution'; END IF;
  old_status := a.status;
  ok := CASE old_status WHEN 'APPLIED' THEN p_new_status IN ('UNDER_REVIEW','REJECTED') WHEN 'UNDER_REVIEW' THEN p_new_status IN ('APPROVED','REJECTED') WHEN 'APPROVED' THEN p_new_status = 'OFFER_SENT' WHEN 'OFFER_SENT' THEN p_new_status IN ('OFFER_ACCEPTED','DECLINED','EXPIRED') WHEN 'OFFER_ACCEPTED' THEN p_new_status = 'ENROLLED' ELSE false END;
  IF NOT ok THEN RAISE EXCEPTION 'Invalid admissions transition: % -> %', old_status, p_new_status; END IF;
  UPDATE public.admissions_applications SET status = p_new_status, updated_at = now() WHERE id = p_application_id RETURNING * INTO a;
  INSERT INTO public.admission_status_history(application_id,institution_id,actor_id,prior_status,new_status,reason) VALUES (a.id,a.institution_id,p_actor_id,old_status,p_new_status,p_reason);
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata) VALUES (p_actor_id,'ADMISSION_STATUS_CHANGED','ADMISSION_APPLICATION',a.id,jsonb_build_object('prior_status',old_status,'new_status',p_new_status,'reason',p_reason));
  RETURN a;
END;
$fn$;

REVOKE ALL ON FUNCTION public.admissions_transition(uuid,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admissions_transition(uuid,text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.admissions_generate_offer(p_application_id uuid, p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE a public.admissions_applications; actor public.users; fee public.admission_fee_configurations; ot public.admission_templates; agt public.admission_templates; offer public.offer_letters; agreement public.admission_documents_v2; data jsonb; html text; agreement_html text; field text; next_version integer;
BEGIN
  SELECT * INTO actor FROM public.users WHERE id=p_actor_id;
  SELECT * INTO a FROM public.admissions_applications WHERE id=p_application_id FOR UPDATE;
  IF actor.id IS NULL OR actor.role NOT IN ('SUPER_ADMIN','ORG_ADMIN','INSTITUTION_ADMIN') THEN RAISE EXCEPTION 'Offer generation is not authorized'; END IF;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF actor.role NOT IN ('SUPER_ADMIN','ORG_ADMIN') AND actor.institution_id <> a.institution_id THEN RAISE EXCEPTION 'Application is outside the actor institution'; END IF;
  IF a.status <> 'APPROVED' THEN RAISE EXCEPTION 'Application must be APPROVED before an offer is generated'; END IF;
  IF a.course_start_date IS NULL OR a.course_end_date IS NULL OR a.course_start_date >= a.course_end_date THEN RAISE EXCEPTION 'Valid course start and end dates are required'; END IF;
  SELECT * INTO fee FROM public.admission_fee_configurations WHERE id=a.fee_configuration_id AND institution_id=a.institution_id AND is_active;
  IF fee.id IS NULL THEN RAISE EXCEPTION 'Active fee configuration is required'; END IF;
  SELECT * INTO ot FROM public.admission_templates WHERE institution_id=a.institution_id AND document_type='OFFER' AND is_active;
  SELECT * INTO agt FROM public.admission_templates WHERE institution_id=a.institution_id AND document_type='AGREEMENT' AND is_active;
  IF ot.id IS NULL OR agt.id IS NULL THEN RAISE EXCEPTION 'Active offer and agreement templates are required'; END IF;
  data := jsonb_build_object('student_name',trim(a.first_name||' '||a.last_name),'student_email',a.email,'student_phone',coalesce(a.phone,''),'qualification',coalesce((SELECT name FROM programs WHERE id=a.program_id),''),'intake_name',coalesce((SELECT name FROM intakes WHERE id=a.intake_id),''),'intake_start_date',(SELECT start_date FROM intakes WHERE id=a.intake_id),'intake_end_date',(SELECT end_date FROM intakes WHERE id=a.intake_id),'course_start_date',a.course_start_date,'course_end_date',a.course_end_date,'fee_amount',fee.amount,'fee_currency',fee.currency);
  FOREACH field IN ARRAY ot.merge_fields LOOP IF NOT (data ? field) OR data->>field IS NULL OR data->>field='' THEN RAISE EXCEPTION 'Missing required offer merge field: %', field; END IF; END LOOP;
  FOREACH field IN ARRAY agt.merge_fields LOOP IF NOT (data ? field) OR data->>field IS NULL OR data->>field='' THEN RAISE EXCEPTION 'Missing required agreement merge field: %', field; END IF; END LOOP;
  html := ot.body; FOREACH field IN ARRAY ot.merge_fields LOOP html := replace(html, '{{'||field||'}}', data->>field); END LOOP;
  agreement_html := agt.body; FOREACH field IN ARRAY agt.merge_fields LOOP agreement_html := replace(agreement_html, '{{'||field||'}}', data->>field); END LOOP;
  SELECT coalesce(max(version),0)+1 INTO next_version FROM offer_letters WHERE application_id=a.id;
  INSERT INTO public.offer_letters(application_id,course_fees,term_start,status,version,template_id,rendered_html)
    VALUES(a.id,fee.amount,(a.course_start_date), 'SENT', next_version, ot.id, html) RETURNING * INTO offer;
  INSERT INTO public.admission_documents_v2(application_id,institution_id,document_type,version,template_id,rendered_html,source_data,created_by)
    VALUES(a.id,a.institution_id,'AGREEMENT',next_version,agt.id,agreement_html,data,p_actor_id) RETURNING * INTO agreement;
  UPDATE public.offer_letters SET agreement_document_id=agreement.id WHERE id=offer.id;
  UPDATE public.admissions_applications SET updated_at=now() WHERE id=a.id;
  INSERT INTO public.admission_status_history(application_id,institution_id,actor_id,prior_status,new_status,reason) VALUES(a.id,a.institution_id,p_actor_id,'APPROVED','OFFER_SENT','Offer and agreement generated');
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata) VALUES(p_actor_id,'ADMISSION_OFFER_GENERATED','ADMISSION_APPLICATION',a.id,jsonb_build_object('offer_version',next_version,'agreement_version',next_version));
  UPDATE public.admissions_applications SET status='OFFER_SENT', updated_at=now() WHERE id=a.id;
  RETURN jsonb_build_object('application',a,'offer',offer,'agreement',agreement);
END;
$fn$;

REVOKE ALL ON FUNCTION public.admissions_generate_offer(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admissions_generate_offer(uuid,uuid) TO service_role;
