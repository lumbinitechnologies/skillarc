-- Task 11: qualification enrolment and academic allocation.
-- The conversion RPC is the only write path used by the admissions API. It
-- locks the source application, validates the complete academic package, and
-- commits all related records in one transaction.

ALTER TABLE public.enrolments
  ADD COLUMN IF NOT EXISTS source_application_id uuid REFERENCES public.admissions_applications(id),
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id),
  ADD COLUMN IF NOT EXISTS trainer_id uuid REFERENCES public.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS enrolments_source_application_unique
  ON public.enrolments(source_application_id) WHERE source_application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS enrolments_student_institution_idx
  ON public.enrolments(student_id, institution_id);

ALTER TABLE public.payment_plans
  ADD COLUMN IF NOT EXISTS source_application_id uuid REFERENCES public.admissions_applications(id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_plans_source_application_unique
  ON public.payment_plans(source_application_id) WHERE source_application_id IS NOT NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS source_application_id uuid REFERENCES public.admissions_applications(id),
  ADD COLUMN IF NOT EXISTS installment_no integer;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_source_installment_unique
  ON public.invoices(source_application_id, installment_no)
  WHERE source_application_id IS NOT NULL AND installment_no IS NOT NULL;

ALTER TABLE public.admission_documents
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id);
ALTER TABLE public.admission_documents_v2
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id);

CREATE TABLE IF NOT EXISTS public.enrolment_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_id uuid NOT NULL REFERENCES public.enrolments(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id),
  planned_start date NOT NULL,
  planned_end date NOT NULL,
  status text NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','WITHDRAWN')),
  trainer_id uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrolment_units_dates_check CHECK (planned_start < planned_end),
  CONSTRAINT enrolment_units_unique_subject UNIQUE (enrolment_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.enrolment_timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_id uuid NOT NULL REFERENCES public.enrolments(id) ON DELETE CASCADE,
  enrolment_unit_id uuid NOT NULL REFERENCES public.enrolment_units(id) ON DELETE CASCADE,
  timetable_slot_id uuid NOT NULL REFERENCES public.timetable_slots(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES public.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrolment_timetable_slots_unique_assignment
    UNIQUE (enrolment_id, enrolment_unit_id, timetable_slot_id)
);

CREATE INDEX IF NOT EXISTS enrolment_units_enrolment_idx ON public.enrolment_units(enrolment_id);
CREATE INDEX IF NOT EXISTS enrolment_timetable_slots_enrolment_idx ON public.enrolment_timetable_slots(enrolment_id);

ALTER TABLE public.enrolment_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrolment_timetable_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enrolment_units_scoped ON public.enrolment_units;
CREATE POLICY enrolment_units_scoped ON public.enrolment_units FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrolments e JOIN public.users u ON u.id=(SELECT auth.uid())
    WHERE e.id=enrolment_units.enrolment_id AND (u.role IN ('SUPER_ADMIN','ORG_ADMIN') OR u.institution_id=e.institution_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.enrolments e JOIN public.users u ON u.id=(SELECT auth.uid())
    WHERE e.id=enrolment_units.enrolment_id AND (u.role IN ('SUPER_ADMIN','ORG_ADMIN') OR u.institution_id=e.institution_id)));
DROP POLICY IF EXISTS enrolment_timetable_slots_scoped ON public.enrolment_timetable_slots;
CREATE POLICY enrolment_timetable_slots_scoped ON public.enrolment_timetable_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrolments e JOIN public.users u ON u.id=(SELECT auth.uid())
    WHERE e.id=enrolment_timetable_slots.enrolment_id AND (u.role IN ('SUPER_ADMIN','ORG_ADMIN') OR u.institution_id=e.institution_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.enrolments e JOIN public.users u ON u.id=(SELECT auth.uid())
    WHERE e.id=enrolment_timetable_slots.enrolment_id AND (u.role IN ('SUPER_ADMIN','ORG_ADMIN') OR u.institution_id=e.institution_id)));

CREATE OR REPLACE FUNCTION public.admissions_convert_to_enrolment(
  p_application_id uuid,
  p_actor_id uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  a public.admissions_applications;
  actor public.users;
  student public.students;
  existing_user public.users;
  program public.programs;
  intake public.intakes;
  section public.sections;
  trainer public.users;
  fee public.admission_fee_configurations;
  offer public.offer_letters;
  e public.enrolments;
  pp public.payment_plans;
  unit jsonb;
  assignment jsonb;
  subject public.subjects;
  slot public.timetable_slots;
  eu public.enrolment_units;
  required_count integer;
  supplied_count integer;
  assignment_count integer;
  installment_amount numeric;
  i integer;
  requested_program uuid;
  requested_intake uuid;
  requested_section uuid;
  requested_trainer uuid;
  start_date date;
  end_date date;
  semester_no integer;
  student_name text;
  v_student_id uuid;
BEGIN
  SELECT * INTO actor FROM public.users WHERE id=p_actor_id FOR SHARE;
  IF actor.id IS NULL OR actor.role NOT IN ('SUPER_ADMIN','ORG_ADMIN','INSTITUTION_ADMIN') THEN
    RAISE EXCEPTION 'Enrolment conversion is not authorized' USING ERRCODE='42501';
  END IF;
  SELECT * INTO a FROM public.admissions_applications WHERE id=p_application_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Application not found' USING ERRCODE='P0002'; END IF;
  IF actor.role NOT IN ('SUPER_ADMIN','ORG_ADMIN') AND actor.institution_id <> a.institution_id THEN
    RAISE EXCEPTION 'Application is outside the actor institution' USING ERRCODE='42501';
  END IF;
  SELECT * INTO e FROM public.enrolments WHERE source_application_id=p_application_id FOR UPDATE;
  IF e.id IS NOT NULL THEN
    RETURN jsonb_build_object('enrolment',to_jsonb(e),'idempotent',true);
  END IF;
  IF a.status <> 'OFFER_ACCEPTED' THEN
    RAISE EXCEPTION 'Only an OFFER_ACCEPTED application can be enrolled' USING ERRCODE='22023';
  END IF;

  requested_program := NULLIF(p_payload->>'program_id','')::uuid;
  requested_intake := NULLIF(p_payload->>'intake_id','')::uuid;
  requested_section := NULLIF(p_payload->>'section_id','')::uuid;
  requested_trainer := NULLIF(p_payload->>'trainer_id','')::uuid;
  start_date := NULLIF(p_payload->>'course_start','')::date;
  end_date := NULLIF(p_payload->>'course_end','')::date;
  semester_no := NULLIF(p_payload->>'semester','')::integer;
  IF requested_program IS NULL OR requested_intake IS NULL OR requested_section IS NULL OR requested_trainer IS NULL
     OR start_date IS NULL OR end_date IS NULL OR start_date >= end_date THEN
    RAISE EXCEPTION 'Program, intake, dates, section, and trainer are required' USING ERRCODE='22023';
  END IF;
  IF requested_program <> a.program_id OR requested_intake <> a.intake_id THEN
    RAISE EXCEPTION 'Enrolment program and intake must match the application' USING ERRCODE='22023';
  END IF;
  SELECT * INTO program FROM public.programs WHERE id=requested_program AND institution_id=a.institution_id;
  SELECT * INTO intake FROM public.intakes WHERE id=requested_intake AND institution_id=a.institution_id;
  SELECT * INTO section FROM public.sections WHERE id=requested_section AND institution_id=a.institution_id AND program_id=requested_program;
  SELECT * INTO trainer FROM public.users WHERE id=requested_trainer AND institution_id=a.institution_id AND role='FACULTY' AND is_active;
  IF program.id IS NULL OR intake.id IS NULL OR section.id IS NULL OR trainer.id IS NULL THEN
    RAISE EXCEPTION 'Program, intake, section, and active faculty trainer must be institution-scoped' USING ERRCODE='22023';
  END IF;
  IF start_date < intake.start_date OR end_date > intake.end_date THEN
    RAISE EXCEPTION 'Course dates must be within the selected intake' USING ERRCODE='22023';
  END IF;
  IF semester_no IS NULL THEN semester_no := section.semester; END IF;
  IF semester_no <> section.semester THEN RAISE EXCEPTION 'Section semester does not match enrolment semester' USING ERRCODE='22023'; END IF;

  SELECT count(*) INTO required_count FROM public.subjects WHERE program_id=requested_program AND institution_id=a.institution_id;
  SELECT count(DISTINCT (value->>'subject_id')::uuid) INTO supplied_count
    FROM jsonb_array_elements(COALESCE(p_payload->'units','[]'::jsonb)) value;
  SELECT count(*) INTO i FROM public.subjects s
    WHERE s.program_id=requested_program AND s.institution_id=a.institution_id
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p_payload->'units','[]'::jsonb)) value
                  WHERE (value->>'subject_id')::uuid=s.id);
  IF required_count = 0 OR supplied_count <> required_count OR i <> required_count THEN
    RAISE EXCEPTION 'The complete program unit catalog is required' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO assignment_count FROM jsonb_array_elements(COALESCE(p_payload->'timetable','[]'::jsonb));
  IF assignment_count <> required_count THEN RAISE EXCEPTION 'One timetable assignment is required for every unit' USING ERRCODE='22023'; END IF;

  v_student_id := a.student_id;
  IF v_student_id IS NULL THEN
    SELECT * INTO existing_user FROM public.users WHERE institution_id=a.institution_id AND lower(email)=lower(a.email) FOR UPDATE;
    IF existing_user.id IS NOT NULL THEN
      SELECT count(*) INTO i FROM public.users WHERE institution_id=a.institution_id AND lower(email)=lower(a.email);
      IF i > 1 THEN RAISE EXCEPTION 'Multiple student matches exist for this email' USING ERRCODE='23505'; END IF;
      v_student_id := existing_user.id;
    ELSE
      v_student_id := gen_random_uuid();
      student_name := trim(a.first_name||' '||a.last_name);
      INSERT INTO public.users(id,institution_id,organization_id,name,email,role,is_active) VALUES
        (v_student_id,a.institution_id,actor.organization_id,student_name,lower(a.email),'STUDENT',true);
    END IF;
  END IF;
  INSERT INTO public.students(id,institution_id,program_id,section_id,intake_id,semester,admission_year)
    VALUES(v_student_id,a.institution_id,requested_program,requested_section,requested_intake,semester_no,extract(year from start_date)::integer)
    ON CONFLICT (id) DO UPDATE SET institution_id=EXCLUDED.institution_id,program_id=EXCLUDED.program_id,section_id=EXCLUDED.section_id,intake_id=EXCLUDED.intake_id,semester=EXCLUDED.semester;
  UPDATE public.admissions_applications app SET student_id=v_student_id,intake_id=requested_intake,course_start_date=start_date,course_end_date=end_date,updated_at=now() WHERE app.id=a.id;

  INSERT INTO public.enrolments(student_id,institution_id,program_id,intake_id,status,started_at,ended_at,source_application_id,section_id,trainer_id)
    VALUES(v_student_id,a.institution_id,requested_program,requested_intake,'ENROLLED',start_date,end_date,a.id,requested_section,requested_trainer)
    ON CONFLICT (source_application_id) DO NOTHING RETURNING * INTO e;
  IF e.id IS NULL THEN SELECT * INTO e FROM public.enrolments WHERE source_application_id=a.id FOR UPDATE; RETURN jsonb_build_object('enrolment',to_jsonb(e),'idempotent',true); END IF;

  FOR unit IN SELECT value FROM jsonb_array_elements(p_payload->'units') LOOP
    SELECT * INTO subject FROM public.subjects WHERE id=(unit->>'subject_id')::uuid AND program_id=requested_program AND institution_id=a.institution_id;
    IF subject.id IS NULL OR (unit->>'planned_start')::date >= (unit->>'planned_end')::date THEN RAISE EXCEPTION 'Invalid unit or planned dates' USING ERRCODE='22023'; END IF;
    INSERT INTO public.enrolment_units(enrolment_id,subject_id,planned_start,planned_end,trainer_id)
      VALUES(e.id,subject.id,(unit->>'planned_start')::date,(unit->>'planned_end')::date,COALESCE(NULLIF(unit->>'trainer_id','')::uuid,requested_trainer)) RETURNING * INTO eu;
    SELECT * INTO slot FROM public.timetable_slots WHERE id=(SELECT value->>'slot_id' FROM jsonb_array_elements(p_payload->'timetable') value WHERE (value->>'subject_id')::uuid=subject.id LIMIT 1)
      AND section_id=requested_section AND subject_id=subject.id AND faculty_id=requested_trainer AND (institution_id=a.institution_id OR institution_id IS NULL);
    IF slot.id IS NULL THEN RAISE EXCEPTION 'Timetable slot is invalid for unit, section, or trainer' USING ERRCODE='22023'; END IF;
    INSERT INTO public.enrolment_timetable_slots(enrolment_id,enrolment_unit_id,timetable_slot_id,assigned_by) VALUES(e.id,eu.id,slot.id,p_actor_id);
  END LOOP;

  SELECT * INTO fee FROM public.admission_fee_configurations WHERE id=a.fee_configuration_id AND institution_id=a.institution_id AND program_id=requested_program AND intake_id=requested_intake AND is_active;
  SELECT * INTO offer FROM public.offer_letters WHERE application_id=a.id AND status IN ('ACCEPTED','SENT') ORDER BY version DESC LIMIT 1;
  IF fee.id IS NULL OR offer.id IS NULL THEN RAISE EXCEPTION 'Accepted offer fee configuration is required' USING ERRCODE='22023'; END IF;
  INSERT INTO public.payment_plans(student_id,institution_id,total_amount,source_application_id) VALUES(v_student_id,a.institution_id,fee.amount,a.id)
    ON CONFLICT (source_application_id) DO UPDATE SET total_amount=EXCLUDED.total_amount RETURNING * INTO pp;
  IF pp.id IS NULL THEN SELECT * INTO pp FROM public.payment_plans WHERE source_application_id=a.id; END IF;
  installment_amount := round((fee.amount/3)::numeric,2);
  FOR i IN 1..3 LOOP
    INSERT INTO public.invoices(payment_plan_id,amount_due,due_date,status,source_application_id,installment_no)
      VALUES(pp.id,CASE WHEN i=3 THEN fee.amount-installment_amount*2 ELSE installment_amount END,start_date + ((i-1)*30),'UNPAID',a.id,i)
      ON CONFLICT (source_application_id,installment_no) DO NOTHING;
  END LOOP;
  UPDATE public.admission_documents d SET student_id=v_student_id WHERE d.application_id=a.id AND d.student_id IS NULL;
  UPDATE public.admission_documents_v2 d SET student_id=v_student_id WHERE d.application_id=a.id AND d.student_id IS NULL;
  UPDATE public.admissions_applications SET status='ENROLLED',updated_at=now() WHERE id=a.id;
  INSERT INTO public.admission_status_history(application_id,institution_id,actor_id,prior_status,new_status,reason) VALUES(a.id,a.institution_id,p_actor_id,'OFFER_ACCEPTED','ENROLLED','Qualification enrolment completed');
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata) VALUES(p_actor_id,'QUALIFICATION_ENROLLED','ADMISSION_APPLICATION',a.id,jsonb_build_object('enrolment_id',e.id,'student_id',v_student_id));
  RETURN jsonb_build_object('enrolment',to_jsonb(e),'student_id',v_student_id,'payment_plan_id',pp.id,'idempotent',false);
END;
$fn$;

REVOKE ALL ON FUNCTION public.admissions_convert_to_enrolment(uuid,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admissions_convert_to_enrolment(uuid,uuid,jsonb) TO service_role;
