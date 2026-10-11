-- SCRUM-47: schema-only snapshot of the approved synthetic SkillArc environment.
-- Older hosted versions below are retained as historical markers; original SQL is
-- archived under migrations/hosted-history. Do not replay this baseline on an existing DB.




-- Normalize CLI-created default ACLs before restoring the hosted explicit ACLs.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";
COMMENT ON SCHEMA "public" IS NULL;


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."admissions_convert_to_enrolment"("p_application_id" "uuid", "p_actor_id" "uuid", "p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admissions_convert_to_enrolment"("p_application_id" "uuid", "p_actor_id" "uuid", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admissions_generate_offer"("p_application_id" "uuid", "p_actor_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admissions_generate_offer"("p_application_id" "uuid", "p_actor_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admissions_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "program_id" "uuid",
    "status" "text" DEFAULT 'APPLIED'::"text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "student_id" "uuid",
    "intake_id" "uuid",
    "fee_configuration_id" "uuid",
    "course_start_date" "date",
    "course_end_date" "date",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reference_number" "text",
    "date_of_birth" "text",
    "gender" "text",
    "nationality" "text",
    "country_of_birth" "text",
    "address" "text",
    "usi" "text",
    "passport_number" "text",
    "passport_expiry" "text",
    "visa_type" "text",
    "visa_expiry" "text",
    "english_evidence" "text",
    "application_data" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "admissions_applications_status_check" CHECK (("status" = ANY (ARRAY['APPLIED'::"text", 'UNDER_REVIEW'::"text", 'APPROVED'::"text", 'REJECTED'::"text", 'OFFER_SENT'::"text", 'OFFER_ACCEPTED'::"text", 'DECLINED'::"text", 'EXPIRED'::"text", 'ENROLLED'::"text"])))
);


ALTER TABLE "public"."admissions_applications" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admissions_transition"("p_application_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."admissions_applications"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admissions_transition"("p_application_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assistant_knowledge_audience_allowed"("p_department_id" "uuid", "p_subject_id" "uuid", "p_section_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users actor
    WHERE actor.id = (SELECT auth.uid())
      AND (
        actor.role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
        OR (p_department_id IS NOT NULL AND actor.department_id = p_department_id)
        OR (p_department_id IS NULL AND p_subject_id IS NULL AND p_section_id IS NULL)
        OR EXISTS (
          SELECT 1
          FROM public.faculty_subjects faculty_subject
          WHERE faculty_subject.faculty_id = actor.id
            AND (
              (p_subject_id IS NOT NULL AND faculty_subject.subject_id = p_subject_id)
              OR (p_section_id IS NOT NULL AND faculty_subject.section_id = p_section_id)
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.students student
          WHERE student.id = actor.id
            AND (
              (p_section_id IS NOT NULL AND student.section_id = p_section_id)
              OR EXISTS (
                SELECT 1
                FROM public.subjects subject
                WHERE subject.id = p_subject_id
                  AND subject.program_id = student.program_id
                  AND (student.semester IS NULL OR subject.semester = student.semester)
              )
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.parent_student_relations relation
          JOIN public.students child ON child.id = relation.student_id
          WHERE relation.parent_id = actor.id
            AND (
              (p_section_id IS NOT NULL AND child.section_id = p_section_id)
              OR EXISTS (
                SELECT 1
                FROM public.subjects subject
                WHERE subject.id = p_subject_id
                  AND subject.program_id = child.program_id
                  AND (child.semester IS NULL OR subject.semester = child.semester)
              )
            )
        )
      )
  );
$$;


ALTER FUNCTION "public"."assistant_knowledge_audience_allowed"("p_department_id" "uuid", "p_subject_id" "uuid", "p_section_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_ingestion_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "requested_by" "uuid",
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "available_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "locked_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "locked_by" "text",
    "lease_expires_at" timestamp with time zone,
    "max_attempts" integer DEFAULT 5 NOT NULL,
    "started_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "knowledge_ingestion_jobs_attempts_check" CHECK (("attempts" >= 0)),
    CONSTRAINT "knowledge_ingestion_jobs_max_attempts_check" CHECK (("max_attempts" > 0)),
    CONSTRAINT "knowledge_ingestion_jobs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."knowledge_ingestion_jobs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_knowledge_ingestion_jobs"("p_limit" integer, "p_worker_id" "text", "p_lease_seconds" integer DEFAULT 300) RETURNS SETOF "public"."knowledge_ingestion_jobs"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  WITH candidates AS (
    SELECT id
    FROM public.knowledge_ingestion_jobs
    WHERE attempts < max_attempts
      AND (
        (status = 'queued' AND available_at <= now())
        OR (status = 'running' AND lease_expires_at < now())
      )
    ORDER BY available_at ASC, created_at ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 1), 1), 50)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.knowledge_ingestion_jobs AS job
  SET status = 'running',
      attempts = job.attempts + 1,
      locked_by = p_worker_id,
      locked_at = now(),
      lease_expires_at = now() + make_interval(secs => GREATEST(COALESCE(p_lease_seconds, 300), 30)),
      started_at = COALESCE(job.started_at, now()),
      updated_at = now()
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
$$;


ALTER FUNCTION "public"."claim_knowledge_ingestion_jobs"("p_limit" integer, "p_worker_id" "text", "p_lease_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text") RETURNS "public"."knowledge_ingestion_jobs"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  completed_job public.knowledge_ingestion_jobs;
BEGIN
  UPDATE public.knowledge_ingestion_jobs
  SET status = 'completed',
      locked_by = NULL,
      locked_at = NULL,
      lease_expires_at = NULL,
      completed_at = now(),
      updated_at = now()
  WHERE id = p_job_id
    AND status = 'running'
    AND locked_by = p_worker_id
  RETURNING * INTO completed_job;

  IF completed_job.id IS NULL THEN
    RAISE EXCEPTION 'knowledge ingestion job is not owned by worker';
  END IF;
  RETURN completed_job;
END
$$;


ALTER FUNCTION "public"."complete_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_institution_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT institution_id FROM public.users WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;


ALTER FUNCTION "public"."current_user_institution_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT role FROM public.users WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_institution_cascade"("p_institution_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_ids uuid[];
  v_student_ids uuid[];
  v_program_ids uuid[];
  v_dept_ids uuid[];
  v_subject_ids uuid[];
  v_section_ids uuid[];
  v_app_ids uuid[];
  v_enrolment_ids uuid[];
  v_enrolment_unit_ids uuid[];
  v_assignment_ids uuid[];
  v_submission_ids uuid[];
  v_grade_col_ids uuid[];
  v_payment_plan_ids uuid[];
  v_invoice_ids uuid[];
  v_meeting_ids uuid[];
  v_session_ids uuid[];
  v_event_ids uuid[];
  v_job_post_ids uuid[];
  v_project_ids uuid[];
  v_proj_group_ids uuid[];
  v_thread_ids uuid[];
  v_thread_msg_ids text[];
  v_kdoc_ids uuid[];
  v_att_session_ids uuid[];
BEGIN
  -- 1. Gather all entity IDs
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_user_ids
  FROM public.users WHERE institution_id = p_institution_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_student_ids
  FROM public.students WHERE institution_id = p_institution_id OR id = ANY(v_user_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_program_ids
  FROM public.programs WHERE institution_id = p_institution_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_dept_ids
  FROM public.departments WHERE institution_id = p_institution_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_subject_ids
  FROM public.subjects WHERE institution_id = p_institution_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_section_ids
  FROM public.sections WHERE institution_id = p_institution_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_app_ids
  FROM public.admissions_applications WHERE institution_id = p_institution_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_enrolment_ids
  FROM public.enrolments WHERE institution_id = p_institution_id OR student_id = ANY(v_student_ids);

  IF array_length(v_enrolment_ids, 1) > 0 THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_enrolment_unit_ids
    FROM public.enrolment_units WHERE enrolment_id = ANY(v_enrolment_ids);
  END IF;

  IF array_length(v_subject_ids, 1) > 0 THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_assignment_ids
    FROM public.assignments WHERE subject_id = ANY(v_subject_ids);

    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_grade_col_ids
    FROM public.grade_columns WHERE subject_id = ANY(v_subject_ids);
  END IF;

  IF array_length(v_assignment_ids, 1) > 0 THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_submission_ids
    FROM public.submissions WHERE assignment_id = ANY(v_assignment_ids);
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_payment_plan_ids
  FROM public.payment_plans WHERE institution_id = p_institution_id OR student_id = ANY(v_user_ids);

  IF array_length(v_payment_plan_ids, 1) > 0 THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_invoice_ids
    FROM public.invoices WHERE payment_plan_id = ANY(v_payment_plan_ids);
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_meeting_ids
  FROM public.meetings WHERE institution_id = p_institution_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_session_ids
  FROM public.online_sessions WHERE institution_id = p_institution_id OR host_id = ANY(v_user_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_event_ids
  FROM public.events WHERE institution_id = p_institution_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_job_post_ids
  FROM public.job_posts WHERE institution_id = p_institution_id;

  IF array_length(v_user_ids, 1) > 0 THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_project_ids
    FROM public.projects WHERE faculty_id = ANY(v_user_ids);
  END IF;

  IF array_length(v_project_ids, 1) > 0 THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_proj_group_ids
    FROM public.project_groups WHERE project_id = ANY(v_project_ids);
  END IF;

  IF to_regclass('public.assistant_threads') IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_thread_ids
    FROM public.assistant_threads WHERE institution_id = p_institution_id OR user_id = ANY(v_user_ids);

    IF array_length(v_thread_ids, 1) > 0 THEN
      SELECT COALESCE(array_agg(id), ARRAY[]::text[]) INTO v_thread_msg_ids
      FROM public.assistant_messages WHERE thread_id = ANY(v_thread_ids);
    END IF;
  END IF;

  IF to_regclass('public.knowledge_documents') IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_kdoc_ids
    FROM public.knowledge_documents WHERE institution_id = p_institution_id;
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_att_session_ids
  FROM public.attendance_sessions
  WHERE subject_id = ANY(v_subject_ids) OR section_id = ANY(v_section_ids) OR faculty_id = ANY(v_user_ids);

  -- 2. Safety Nullifications (Break FK cycles)
  UPDATE public.student_documents SET superseded_by = NULL, application_id = NULL, application_document_id = NULL
  WHERE institution_id = p_institution_id OR student_id = ANY(v_student_ids);

  UPDATE public.student_profile_details SET education_agent_id = NULL, marketing_staff_id = NULL
  WHERE institution_id = p_institution_id OR student_id = ANY(v_student_ids);

  UPDATE public.sections SET faculty_advisor_id = NULL
  WHERE institution_id = p_institution_id OR id = ANY(v_section_ids);

  UPDATE public.enrolments SET trainer_id = NULL, source_application_id = NULL, intake_id = NULL, section_id = NULL
  WHERE institution_id = p_institution_id OR student_id = ANY(v_student_ids);

  UPDATE public.students SET section_id = NULL, program_id = NULL, intake_id = NULL
  WHERE institution_id = p_institution_id OR id = ANY(v_student_ids);

  UPDATE public.programs SET department_id = NULL
  WHERE institution_id = p_institution_id OR id = ANY(v_program_ids);

  UPDATE public.users SET department_id = NULL
  WHERE institution_id = p_institution_id OR id = ANY(v_user_ids);

  UPDATE public.meetings SET timetable_slot_id = NULL, subject_id = NULL, section_id = NULL
  WHERE institution_id = p_institution_id;

  UPDATE public.leave_applications SET section_id = NULL, advisor_id = NULL, approved_by = NULL
  WHERE institution_id = p_institution_id OR student_id = ANY(v_user_ids);

  -- 3. Bottom-Up Cascaded Deletions
  IF to_regclass('public.assistant_feedback') IS NOT NULL AND array_length(v_thread_msg_ids, 1) > 0 THEN
    DELETE FROM public.assistant_feedback WHERE message_id = ANY(v_thread_msg_ids) OR user_id = ANY(v_user_ids);
  END IF;
  IF to_regclass('public.assistant_message_sources') IS NOT NULL AND array_length(v_thread_msg_ids, 1) > 0 THEN
    DELETE FROM public.assistant_message_sources WHERE message_id = ANY(v_thread_msg_ids);
  END IF;
  IF to_regclass('public.assistant_tool_runs') IS NOT NULL AND array_length(v_thread_ids, 1) > 0 THEN
    DELETE FROM public.assistant_tool_runs WHERE thread_id = ANY(v_thread_ids);
  END IF;
  IF to_regclass('public.assistant_messages') IS NOT NULL AND array_length(v_thread_ids, 1) > 0 THEN
    DELETE FROM public.assistant_messages WHERE thread_id = ANY(v_thread_ids);
  END IF;
  IF to_regclass('public.assistant_threads') IS NOT NULL THEN
    DELETE FROM public.assistant_threads WHERE institution_id = p_institution_id OR user_id = ANY(v_user_ids);
  END IF;

  IF to_regclass('public.knowledge_document_chunks') IS NOT NULL AND array_length(v_kdoc_ids, 1) > 0 THEN
    DELETE FROM public.knowledge_document_chunks WHERE document_id = ANY(v_kdoc_ids);
  END IF;
  IF to_regclass('public.knowledge_ingestion_jobs') IS NOT NULL AND array_length(v_kdoc_ids, 1) > 0 THEN
    DELETE FROM public.knowledge_ingestion_jobs WHERE document_id = ANY(v_kdoc_ids);
  END IF;
  IF to_regclass('public.knowledge_documents') IS NOT NULL THEN
    DELETE FROM public.knowledge_documents WHERE institution_id = p_institution_id;
  END IF;

  -- Payments & Invoices
  IF array_length(v_invoice_ids, 1) > 0 THEN
    DELETE FROM public.payments WHERE invoice_id = ANY(v_invoice_ids);
  END IF;
  IF array_length(v_payment_plan_ids, 1) > 0 THEN
    DELETE FROM public.invoices WHERE payment_plan_id = ANY(v_payment_plan_ids);
  END IF;
  DELETE FROM public.payment_plans WHERE institution_id = p_institution_id OR student_id = ANY(v_user_ids);

  -- Admissions
  IF array_length(v_app_ids, 1) > 0 THEN
    DELETE FROM public.offer_letters WHERE application_id = ANY(v_app_ids);
    DELETE FROM public.admission_documents WHERE application_id = ANY(v_app_ids);
  END IF;
  DELETE FROM public.admissions_applications WHERE institution_id = p_institution_id;

  -- Enrolments
  IF array_length(v_enrolment_ids, 1) > 0 THEN
    DELETE FROM public.enrolment_unit_allocations WHERE enrolment_id = ANY(v_enrolment_ids);
    DELETE FROM public.enrolment_units WHERE enrolment_id = ANY(v_enrolment_ids);
  END IF;
  DELETE FROM public.enrolments WHERE institution_id = p_institution_id OR student_id = ANY(v_student_ids);

  -- Meetings & Sessions
  DELETE FROM public.meeting_messages WHERE institution_id = p_institution_id OR meeting_id = ANY(v_meeting_ids) OR sender_id = ANY(v_user_ids);
  DELETE FROM public.meeting_participants WHERE meeting_id = ANY(v_meeting_ids) OR user_id = ANY(v_user_ids);
  DELETE FROM public.meetings WHERE institution_id = p_institution_id;

  IF array_length(v_session_ids, 1) > 0 THEN
    DELETE FROM public.online_session_participants WHERE session_id = ANY(v_session_ids) OR user_id = ANY(v_user_ids);
  END IF;
  DELETE FROM public.online_sessions WHERE institution_id = p_institution_id OR host_id = ANY(v_user_ids);

  -- Attendance
  IF array_length(v_att_session_ids, 1) > 0 THEN
    DELETE FROM public.attendance_records WHERE session_id = ANY(v_att_session_ids) OR student_id = ANY(v_user_ids);
    DELETE FROM public.attendance_sessions WHERE id = ANY(v_att_session_ids);
  END IF;

  -- Submissions & Assignments & Grades
  IF array_length(v_submission_ids, 1) > 0 THEN
    DELETE FROM public.submission_verifications WHERE submission_id = ANY(v_submission_ids);
  END IF;
  IF array_length(v_assignment_ids, 1) > 0 THEN
    DELETE FROM public.submissions WHERE assignment_id = ANY(v_assignment_ids) OR student_id = ANY(v_user_ids);
    DELETE FROM public.assignments WHERE id = ANY(v_assignment_ids);
  END IF;
  IF array_length(v_grade_col_ids, 1) > 0 THEN
    DELETE FROM public.grade_entries WHERE column_id = ANY(v_grade_col_ids) OR student_id = ANY(v_user_ids);
    DELETE FROM public.grade_columns WHERE id = ANY(v_grade_col_ids);
  END IF;

  -- Timetable
  DELETE FROM public.timetable_slots WHERE institution_id = p_institution_id OR section_id = ANY(v_section_ids) OR subject_id = ANY(v_subject_ids) OR faculty_id = ANY(v_user_ids);
  IF to_regclass('public.timetable_weeks') IS NOT NULL THEN
    DELETE FROM public.timetable_weeks WHERE institution_id = p_institution_id;
  END IF;
  IF to_regclass('public.periods') IS NOT NULL THEN
    DELETE FROM public.periods WHERE institution_id = p_institution_id;
  END IF;
  IF to_regclass('public.academic_calendar_events') IS NOT NULL THEN
    DELETE FROM public.academic_calendar_events WHERE institution_id = p_institution_id;
  END IF;

  -- Projects
  IF array_length(v_proj_group_ids, 1) > 0 THEN
    DELETE FROM public.group_members WHERE group_id = ANY(v_proj_group_ids) OR student_id = ANY(v_user_ids);
    DELETE FROM public.project_groups WHERE id = ANY(v_proj_group_ids);
  END IF;
  IF array_length(v_project_ids, 1) > 0 THEN
    DELETE FROM public.projects WHERE id = ANY(v_project_ids);
  END IF;

  -- Events & Announcements
  IF array_length(v_event_ids, 1) > 0 THEN
    DELETE FROM public.event_registrations WHERE event_id = ANY(v_event_ids) OR user_id = ANY(v_user_ids);
  END IF;
  DELETE FROM public.events WHERE institution_id = p_institution_id;
  DELETE FROM public.announcements WHERE institution_id = p_institution_id OR created_by = ANY(v_user_ids);
  IF to_regclass('public.subject_announcements') IS NOT NULL AND array_length(v_subject_ids, 1) > 0 THEN
    DELETE FROM public.subject_announcements WHERE subject_id = ANY(v_subject_ids);
  END IF;

  -- Placements
  IF array_length(v_job_post_ids, 1) > 0 THEN
    DELETE FROM public.applications WHERE job_post_id = ANY(v_job_post_ids) OR student_id = ANY(v_user_ids);
    DELETE FROM public.job_posts WHERE id = ANY(v_job_post_ids);
  END IF;

  -- Complaints, Notifications, Leave, Warnings, Resources
  DELETE FROM public.complaints WHERE student_id = ANY(v_user_ids);
  DELETE FROM public.notifications WHERE user_id = ANY(v_user_ids);
  IF to_regclass('public.notification_preferences') IS NOT NULL THEN
    DELETE FROM public.notification_preferences WHERE user_id = ANY(v_user_ids);
  END IF;
  DELETE FROM public.audit_logs WHERE user_id = ANY(v_user_ids) OR entity_id = p_institution_id;
  DELETE FROM public.leave_applications WHERE institution_id = p_institution_id OR student_id = ANY(v_user_ids);
  DELETE FROM public.warning_letters WHERE institution_id = p_institution_id OR student_id = ANY(v_user_ids);
  IF array_length(v_subject_ids, 1) > 0 OR array_length(v_user_ids, 1) > 0 THEN
    DELETE FROM public.resources WHERE subject_id = ANY(v_subject_ids) OR faculty_id = ANY(v_user_ids);
  END IF;

  -- Student Profiles & Details
  DELETE FROM public.student_documents WHERE institution_id = p_institution_id OR student_id = ANY(v_student_ids);
  DELETE FROM public.student_profile_details WHERE institution_id = p_institution_id OR student_id = ANY(v_student_ids);
  DELETE FROM public.student_addresses WHERE institution_id = p_institution_id OR student_id = ANY(v_student_ids);
  DELETE FROM public.student_emergency_contacts WHERE institution_id = p_institution_id OR student_id = ANY(v_student_ids);
  DELETE FROM public.student_notes WHERE institution_id = p_institution_id OR student_id = ANY(v_student_ids) OR actor_id = ANY(v_user_ids);
  DELETE FROM public.student_communications WHERE institution_id = p_institution_id OR student_id = ANY(v_student_ids) OR actor_id = ANY(v_user_ids);
  DELETE FROM public.parent_student_relations WHERE student_id = ANY(v_student_ids) OR parent_id = ANY(v_user_ids);
  DELETE FROM public.education_agents WHERE institution_id = p_institution_id;

  -- Specialized tables
  DELETE FROM public.students WHERE institution_id = p_institution_id OR id = ANY(v_student_ids);
  DELETE FROM public.staff WHERE institution_id = p_institution_id OR id = ANY(v_user_ids);

  -- Academic Structure
  DELETE FROM public.faculty_subjects WHERE institution_id = p_institution_id OR faculty_id = ANY(v_user_ids) OR subject_id = ANY(v_subject_ids) OR section_id = ANY(v_section_ids);
  DELETE FROM public.subjects WHERE institution_id = p_institution_id OR id = ANY(v_subject_ids);
  DELETE FROM public.sections WHERE institution_id = p_institution_id OR id = ANY(v_section_ids);
  IF to_regclass('public.intakes') IS NOT NULL THEN
    DELETE FROM public.intakes WHERE institution_id = p_institution_id;
  END IF;
  DELETE FROM public.programs WHERE institution_id = p_institution_id OR id = ANY(v_program_ids);
  DELETE FROM public.departments WHERE institution_id = p_institution_id OR id = ANY(v_dept_ids);

  -- Files & Permissions
  DELETE FROM public.files WHERE institution_id = p_institution_id OR uploaded_by = ANY(v_user_ids);
  DELETE FROM public.user_permissions WHERE user_id = ANY(v_user_ids);

  -- Users & Institution
  DELETE FROM public.users WHERE institution_id = p_institution_id OR id = ANY(v_user_ids);
  DELETE FROM public.institutions WHERE id = p_institution_id;
END;
$$;


ALTER FUNCTION "public"."delete_institution_cascade"("p_institution_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_organization_cascade"("p_organization_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_inst record;
  v_org_user_ids uuid[];
BEGIN
  -- 1. Cascade delete all child institutions
  FOR v_inst IN SELECT id FROM public.institutions WHERE organization_id = p_organization_id LOOP
    PERFORM public.delete_institution_cascade(v_inst.id);
  END LOOP;

  -- 2. Gather remaining org users
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_org_user_ids
  FROM public.users WHERE organization_id = p_organization_id;

  -- 3. Org-level cleanup
  DELETE FROM public.files WHERE organization_id = p_organization_id;
  DELETE FROM public.timetable_slots WHERE organization_id = p_organization_id;
  IF to_regclass('public.assistant_threads') IS NOT NULL THEN
    DELETE FROM public.assistant_threads WHERE organization_id = p_organization_id;
  END IF;
  IF to_regclass('public.knowledge_documents') IS NOT NULL THEN
    DELETE FROM public.knowledge_documents WHERE organization_id = p_organization_id;
  END IF;

  IF array_length(v_org_user_ids, 1) > 0 THEN
    DELETE FROM public.notifications WHERE user_id = ANY(v_org_user_ids);
    IF to_regclass('public.notification_preferences') IS NOT NULL THEN
      DELETE FROM public.notification_preferences WHERE user_id = ANY(v_org_user_ids);
    END IF;
    DELETE FROM public.user_permissions WHERE user_id = ANY(v_org_user_ids);
    DELETE FROM public.audit_logs WHERE user_id = ANY(v_org_user_ids);
  END IF;

  DELETE FROM public.audit_logs WHERE entity_id = p_organization_id;
  DELETE FROM public.users WHERE organization_id = p_organization_id;
  DELETE FROM public.organizations WHERE id = p_organization_id;
END;
$$;


ALTER FUNCTION "public"."delete_organization_cascade"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fail_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text", "p_error" "text") RETURNS "public"."knowledge_ingestion_jobs"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  failed_job public.knowledge_ingestion_jobs;
BEGIN
  UPDATE public.knowledge_ingestion_jobs
  SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'queued' END,
      available_at = CASE
        WHEN attempts >= max_attempts THEN available_at
        ELSE now() + make_interval(secs => LEAST(3600, power(2, LEAST(attempts, 10))::integer))
      END,
      locked_by = NULL,
      locked_at = NULL,
      lease_expires_at = NULL,
      error_message = left(COALESCE(p_error, 'Unknown ingestion failure'), 2000),
      updated_at = now()
  WHERE id = p_job_id
    AND status = 'running'
    AND locked_by = p_worker_id
  RETURNING * INTO failed_job;

  IF failed_job.id IS NULL THEN
    RAISE EXCEPTION 'knowledge ingestion job is not owned by worker';
  END IF;
  RETURN failed_job;
END
$$;


ALTER FUNCTION "public"."fail_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text", "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text") RETURNS "public"."knowledge_ingestion_jobs"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  job_row public.knowledge_ingestion_jobs;
  document_row public.knowledge_documents;
BEGIN
  SELECT * INTO job_row
  FROM public.knowledge_ingestion_jobs
  WHERE id = p_job_id
    AND status = 'running'
    AND locked_by = p_worker_id
  FOR UPDATE;

  IF job_row.id IS NULL THEN
    RAISE EXCEPTION 'knowledge ingestion job is not owned by worker';
  END IF;

  SELECT * INTO document_row
  FROM public.knowledge_documents
  WHERE id = job_row.document_id
  FOR UPDATE;

  IF document_row.id IS NULL THEN
    RAISE EXCEPTION 'knowledge document does not exist';
  END IF;

  UPDATE public.knowledge_documents
  SET status = 'ready',
      failure_reason = NULL,
      updated_at = now()
  WHERE id = document_row.id;

  UPDATE public.knowledge_documents
  SET status = 'archived',
      updated_at = now()
  WHERE source_type = document_row.source_type
    AND source_id = document_row.source_id
    AND source_id IS NOT NULL
    AND id <> document_row.id
    AND document_version <= document_row.document_version
    AND status = 'ready';

  RETURN public.complete_knowledge_ingestion_job(p_job_id, p_worker_id);
END
$$;


ALTER FUNCTION "public"."finalize_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_meeting_host"("p_meeting_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings
    WHERE id = p_meeting_id AND faculty_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."is_meeting_host"("p_meeting_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_meeting_participant"("p_meeting_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_participants
    WHERE meeting_id = p_meeting_id AND user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."is_meeting_participant"("p_meeting_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."knowledge_ingestion_readiness"() RETURNS TABLE("queued" bigint, "running" bigint, "stale_running_jobs" bigint, "failed" bigint, "ready_without_chunks" bigint, "ready_missing_embeddings" bigint, "ready_noncanonical_profile" bigint, "orphaned_or_stale_chunks" bigint, "unscoped_ready_documents" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    (SELECT count(*) FROM public.knowledge_ingestion_jobs WHERE status = 'queued'),
    (SELECT count(*) FROM public.knowledge_ingestion_jobs WHERE status = 'running'),
    (SELECT count(*)
     FROM public.knowledge_ingestion_jobs
     WHERE status = 'running' AND lease_expires_at < now()),
    (SELECT count(*) FROM public.knowledge_ingestion_jobs WHERE status = 'failed'),
    (SELECT count(*)
     FROM public.knowledge_documents d
     WHERE d.status = 'ready'
       AND NOT EXISTS (
         SELECT 1 FROM public.knowledge_chunks c
         WHERE c.document_id = d.id AND c.document_version = d.document_version
       )),
    (SELECT count(*)
     FROM public.knowledge_chunks c
     JOIN public.knowledge_documents d ON d.id = c.document_id AND d.document_version = c.document_version
     WHERE d.status = 'ready' AND c.embedding IS NULL),
    (SELECT count(*)
     FROM public.knowledge_documents
     WHERE status = 'ready'
       AND embedding_profile IS DISTINCT FROM 'huggingface-local:Xenova/all-MiniLM-L6-v2:751bff3:384:v2'),
    (SELECT count(*)
     FROM public.knowledge_chunks c
     LEFT JOIN public.knowledge_documents d ON d.id = c.document_id AND d.document_version = c.document_version
     WHERE d.id IS NULL),
    (SELECT count(*)
     FROM public.knowledge_documents
     WHERE status = 'ready' AND (organization_id IS NULL OR institution_id IS NULL));
$$;


ALTER FUNCTION "public"."knowledge_ingestion_readiness"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_user_id" "uuid", "p_organization_id" "uuid", "p_institution_id" "uuid", "p_department_id" "uuid", "p_role" "text", "p_subject_ids" "uuid"[] DEFAULT '{}'::"uuid"[], "p_section_ids" "uuid"[] DEFAULT '{}'::"uuid"[]) RETURNS TABLE("id" "uuid", "document_id" "uuid", "chunk_index" integer, "content" "text", "owner_id" "uuid", "institution_id" "uuid", "department_id" "uuid", "subject_id" "uuid", "section_id" "uuid", "visibility" "text", "allowed_roles" "text"[], "title" "text", "original_filename" "text", "document_status" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    chunk.id,
    chunk.document_id,
    chunk.chunk_index,
    chunk.content,
    chunk.owner_id,
    chunk.institution_id,
    chunk.department_id,
    chunk.subject_id,
    chunk.section_id,
    chunk.visibility,
    chunk.allowed_roles,
    document.title,
    document.original_filename,
    document.status,
    1 - (chunk.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks AS chunk
  JOIN public.knowledge_documents AS document
    ON document.id = chunk.document_id
   AND document.document_version = chunk.document_version
  WHERE chunk.embedding IS NOT NULL
    AND document.status = 'ready'
    AND chunk.organization_id = p_organization_id
    AND (chunk.institution_id = p_institution_id OR chunk.institution_id IS NULL)
    AND 1 - (chunk.embedding <=> query_embedding) >= COALESCE(match_threshold, 0.25)
    AND (
      p_role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
      OR chunk.owner_id = p_user_id
      OR chunk.visibility = 'organization'
      OR (chunk.visibility = 'institution' AND chunk.institution_id = p_institution_id)
      OR (chunk.visibility = 'department' AND chunk.department_id = p_department_id)
    )
    AND (
      cardinality(COALESCE(chunk.allowed_roles, '{}')) = 0
      OR p_role = ANY(chunk.allowed_roles)
    )
    AND (
      p_role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
      OR chunk.owner_id = p_user_id
      OR (chunk.department_id IS NULL AND chunk.subject_id IS NULL AND chunk.section_id IS NULL)
      OR chunk.department_id = p_department_id
      OR (
        (chunk.subject_id IS NULL OR chunk.subject_id = ANY(COALESCE(p_subject_ids, '{}')))
        AND (chunk.section_id IS NULL OR chunk.section_id = ANY(COALESCE(p_section_ids, '{}')))
      )
    )
  ORDER BY chunk.embedding <=> query_embedding ASC
  LIMIT LEAST(GREATEST(COALESCE(match_count, 1), 1), 20);
$$;


ALTER FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_user_id" "uuid", "p_organization_id" "uuid", "p_institution_id" "uuid", "p_department_id" "uuid", "p_role" "text", "p_subject_ids" "uuid"[], "p_section_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_user_id" "uuid", "p_organization_id" "uuid", "p_institution_id" "uuid", "p_department_id" "uuid", "p_role" "text", "p_subject_ids" "uuid"[] DEFAULT '{}'::"uuid"[], "p_section_ids" "uuid"[] DEFAULT '{}'::"uuid"[], "p_embedding_profile" "text" DEFAULT 'huggingface-local:Xenova/all-MiniLM-L6-v2:751bff3:384:v2'::"text") RETURNS TABLE("id" "uuid", "document_id" "uuid", "chunk_index" integer, "content" "text", "owner_id" "uuid", "institution_id" "uuid", "department_id" "uuid", "subject_id" "uuid", "section_id" "uuid", "visibility" "text", "allowed_roles" "text"[], "title" "text", "original_filename" "text", "document_status" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    chunk.id,
    chunk.document_id,
    chunk.chunk_index,
    chunk.content,
    chunk.owner_id,
    chunk.institution_id,
    chunk.department_id,
    chunk.subject_id,
    chunk.section_id,
    chunk.visibility,
    chunk.allowed_roles,
    document.title,
    document.original_filename,
    document.status,
    1 - (chunk.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks AS chunk
  JOIN public.knowledge_documents AS document
    ON document.id = chunk.document_id
   AND document.document_version = chunk.document_version
  WHERE chunk.embedding IS NOT NULL
    AND document.status = 'ready'
    AND document.embedding_profile = p_embedding_profile
    AND chunk.organization_id = p_organization_id
    AND (chunk.institution_id = p_institution_id OR chunk.institution_id IS NULL)
    AND 1 - (chunk.embedding <=> query_embedding) >= COALESCE(match_threshold, 0.25)
    AND (
      p_role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
      OR chunk.owner_id = p_user_id
      OR chunk.visibility = 'organization'
      OR (chunk.visibility = 'institution' AND chunk.institution_id = p_institution_id)
      OR (chunk.visibility = 'department' AND chunk.department_id = p_department_id)
    )
    AND (
      cardinality(COALESCE(chunk.allowed_roles, '{}')) = 0
      OR p_role = ANY(chunk.allowed_roles)
    )
    AND (
      p_role IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
      OR chunk.owner_id = p_user_id
      OR (chunk.department_id IS NULL AND chunk.subject_id IS NULL AND chunk.section_id IS NULL)
      OR chunk.department_id = p_department_id
      OR (
        (chunk.subject_id IS NULL OR chunk.subject_id = ANY(COALESCE(p_subject_ids, '{}')))
        AND (chunk.section_id IS NULL OR chunk.section_id = ANY(COALESCE(p_section_ids, '{}')))
      )
    )
  ORDER BY chunk.embedding <=> query_embedding ASC
  LIMIT LEAST(GREATEST(COALESCE(match_count, 1), 1), 20);
$$;


ALTER FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_user_id" "uuid", "p_organization_id" "uuid", "p_institution_id" "uuid", "p_department_id" "uuid", "p_role" "text", "p_subject_ids" "uuid"[], "p_section_ids" "uuid"[], "p_embedding_profile" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."renew_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text", "p_lease_seconds" integer DEFAULT 300) RETURNS "public"."knowledge_ingestion_jobs"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  renewed_job public.knowledge_ingestion_jobs;
BEGIN
  UPDATE public.knowledge_ingestion_jobs
  SET lease_expires_at = now() + make_interval(secs => GREATEST(COALESCE(p_lease_seconds, 300), 30)),
      updated_at = now()
  WHERE id = p_job_id
    AND status = 'running'
    AND locked_by = p_worker_id
  RETURNING * INTO renewed_job;

  IF renewed_job.id IS NULL THEN
    RAISE EXCEPTION 'knowledge ingestion job is not owned by worker';
  END IF;
  RETURN renewed_job;
END
$$;


ALTER FUNCTION "public"."renew_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text", "p_lease_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_offer_letter_currency"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_offer_letter_currency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_student_portal_access"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."touch_student_portal_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_student_portal_access_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE student_institution uuid; auth_institution uuid;
BEGIN
  SELECT institution_id INTO student_institution FROM public.students WHERE id = NEW.student_id;
  SELECT institution_id INTO auth_institution FROM public.users WHERE id = NEW.auth_user_id;
  IF student_institution IS NULL OR student_institution <> NEW.institution_id THEN RAISE EXCEPTION 'Student portal access is outside the student institution' USING ERRCODE = '23514'; END IF;
  IF auth_institution IS NULL OR auth_institution <> NEW.institution_id THEN RAISE EXCEPTION 'Student portal auth user is outside the student institution' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_student_portal_access_scope"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."academic_calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid",
    "title" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "description" "text",
    "affects_classes" boolean DEFAULT true,
    "color" "text" DEFAULT '#6C63FF'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "academic_calendar_dates_check" CHECK (("start_date" <= "end_date")),
    CONSTRAINT "academic_calendar_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['PUBLIC_HOLIDAY'::"text", 'TERM_BREAK'::"text", 'EXAM_PERIOD'::"text", 'CAMPUS_EVENT'::"text", 'ORIENTATION'::"text"])))
);


ALTER TABLE "public"."academic_calendar_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admission_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "document_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "reviewed_at" timestamp without time zone,
    "feedback" "text",
    "student_id" "uuid",
    CONSTRAINT "admission_documents_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'APPROVED'::"text", 'REJECTED'::"text"])))
);


ALTER TABLE "public"."admission_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admission_documents_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "version" integer NOT NULL,
    "template_id" "uuid",
    "rendered_html" "text",
    "storage_bucket" "text",
    "storage_path" "text",
    "status" "text" DEFAULT 'GENERATED'::"text" NOT NULL,
    "source_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_id" "uuid",
    CONSTRAINT "admission_documents_v2_document_type_check" CHECK (("document_type" = ANY (ARRAY['OFFER'::"text", 'AGREEMENT'::"text"]))),
    CONSTRAINT "admission_documents_v2_status_check" CHECK (("status" = ANY (ARRAY['GENERATED'::"text", 'UPLOADED'::"text", 'SIGNED'::"text", 'VOID'::"text"]))),
    CONSTRAINT "admission_documents_v2_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."admission_documents_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admission_fee_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "intake_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'AUD'::"text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admission_fee_configurations_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "admission_fee_configurations_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."admission_fee_configurations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admission_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "prior_status" "text",
    "new_status" "text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admission_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admission_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "version" integer NOT NULL,
    "name" "text" NOT NULL,
    "body" "text" NOT NULL,
    "merge_fields" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admission_templates_document_type_check" CHECK (("document_type" = ANY (ARRAY['OFFER'::"text", 'AGREEMENT'::"text"]))),
    CONSTRAINT "admission_templates_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."admission_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcement_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "author_role" "text" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."announcement_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_by" "uuid",
    "institution_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_post_id" "uuid",
    "student_id" "uuid",
    "status" "text" DEFAULT 'APPLIED'::"text",
    "resume_url" "text",
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['APPLIED'::"text", 'SHORTLISTED'::"text", 'REJECTED'::"text", 'SELECTED'::"text", 'WITHDRAWN'::"text"])))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_id" "uuid",
    "faculty_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "due_date" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'Assignment'::"text",
    "max_score" numeric DEFAULT 100,
    "questions" "jsonb",
    "language" "text",
    "test_cases" "jsonb",
    "section_ids" "uuid"[],
    "files" "text"[]
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assistant_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assistant_feedback_rating_check" CHECK (("rating" = ANY (ARRAY['-1'::integer, 1])))
);


ALTER TABLE "public"."assistant_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assistant_message_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "href" "text",
    "snippet" "text",
    "document_id" "uuid",
    "chunk_index" integer,
    "score" real,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assistant_message_sources_source_type_check" CHECK (("source_type" = ANY (ARRAY['dashboard'::"text", 'document'::"text", 'workflow'::"text"])))
);


ALTER TABLE "public"."assistant_message_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assistant_messages" (
    "id" "text" NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "message" "jsonb" NOT NULL,
    "client_turn_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assistant_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."assistant_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assistant_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "actor_user_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "institution_id" "uuid",
    "department_id" "uuid",
    "role" "text" NOT NULL,
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assistant_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assistant_tool_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "message_id" "text",
    "tool_name" "text" NOT NULL,
    "input_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "output_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" NOT NULL,
    "latency_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assistant_tool_runs_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."assistant_tool_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "student_id" "uuid",
    "status" "text" NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."attendance_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_id" "uuid",
    "faculty_id" "uuid",
    "section_id" "uuid",
    "attendance_date" "date" NOT NULL,
    "period" integer NOT NULL,
    "session_notes" "text"
);


ALTER TABLE "public"."attendance_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_warning_letters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "warning_level" "text" NOT NULL,
    "attendance_percentage" numeric NOT NULL,
    "total_sessions" integer DEFAULT 0,
    "missed_sessions" integer DEFAULT 0,
    "intervention_date" "date",
    "rendered_letter_html" "text" NOT NULL,
    "issued_by" "uuid",
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'ISSUED'::"text"
);


ALTER TABLE "public"."attendance_warning_letters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "website" "text",
    "description" "text",
    "institution_id" "uuid"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complaints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'OPEN'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "complaints_status_check" CHECK (("status" = ANY (ARRAY['OPEN'::"text", 'IN_PROGRESS'::"text", 'RESOLVED'::"text", 'CLOSED'::"text"])))
);


ALTER TABLE "public"."complaints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "institution_id" "uuid",
    "name" "text"
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."education_agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."education_agents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrolment_timetable_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrolment_id" "uuid" NOT NULL,
    "enrolment_unit_id" "uuid" NOT NULL,
    "timetable_slot_id" "uuid" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."enrolment_timetable_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrolment_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrolment_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "planned_start" "date" NOT NULL,
    "planned_end" "date" NOT NULL,
    "status" "text" DEFAULT 'PLANNED'::"text" NOT NULL,
    "trainer_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "enrolment_units_dates_check" CHECK (("planned_start" < "planned_end")),
    CONSTRAINT "enrolment_units_status_check" CHECK (("status" = ANY (ARRAY['PLANNED'::"text", 'ACTIVE'::"text", 'COMPLETED'::"text", 'WITHDRAWN'::"text"])))
);


ALTER TABLE "public"."enrolment_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrolments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "intake_id" "uuid",
    "status" "text" DEFAULT 'ENROLLED'::"text" NOT NULL,
    "started_at" "date" DEFAULT CURRENT_DATE NOT NULL,
    "ended_at" "date",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "source_application_id" "uuid",
    "section_id" "uuid",
    "trainer_id" "uuid",
    CONSTRAINT "enrolments_status_check" CHECK (("status" = ANY (ARRAY['ENROLLED'::"text", 'ACTIVE'::"text", 'ON_LEAVE'::"text", 'COMPLETED'::"text", 'WITHDRAWN'::"text", 'DISCONTINUED'::"text"])))
);


ALTER TABLE "public"."enrolments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "user_id" "uuid",
    "registered_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "event_date" timestamp without time zone,
    "venue" "text",
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "image_url" "text",
    "gallery_images" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faculty_subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "faculty_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "section_id" "uuid",
    "semester" integer,
    "academic_year" "text"
);


ALTER TABLE "public"."faculty_subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "institution_id" "uuid",
    "module" "text" NOT NULL,
    "bucket" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "size_bytes" bigint DEFAULT 0 NOT NULL,
    "uploaded_by" "uuid",
    "entity_type" "text",
    "entity_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grade_columns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "type" "text" DEFAULT 'assignment'::"text" NOT NULL,
    "max_score" numeric DEFAULT 100 NOT NULL,
    "weight" numeric DEFAULT 0 NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "grade_columns_type_check" CHECK (("type" = ANY (ARRAY['assignment'::"text", 'quiz'::"text", 'exam'::"text", 'project'::"text", 'attendance'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."grade_columns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grade_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "column_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "score" numeric,
    "feedback" "text",
    "graded_by" "uuid",
    "graded_at" timestamp without time zone DEFAULT "now"(),
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."grade_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "student_id" "uuid"
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."institution_timetable_settings" (
    "institution_id" "uuid" NOT NULL,
    "start_time" time without time zone DEFAULT '08:45:00'::time without time zone NOT NULL,
    "end_time" time without time zone DEFAULT '16:00:00'::time without time zone NOT NULL,
    "period_duration_minutes" integer DEFAULT 60 NOT NULL,
    "number_of_periods" integer DEFAULT 5 NOT NULL,
    "period_timings" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."institution_timetable_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."institutions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text",
    "domain" "text",
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."institutions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."intakes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."intakes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_plan_id" "uuid" NOT NULL,
    "amount_due" numeric NOT NULL,
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'UNPAID'::"text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "source_application_id" "uuid",
    "installment_no" integer,
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['UNPAID'::"text", 'PARTIALLY_PAID'::"text", 'PAID'::"text", 'OVERDUE'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "deadline" "date",
    "institution_id" "uuid"
);


ALTER TABLE "public"."job_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "institution_id" "uuid",
    "department_id" "uuid",
    "subject_id" "uuid",
    "section_id" "uuid",
    "owner_id" "uuid",
    "visibility" "text" NOT NULL,
    "allowed_roles" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(384),
    "document_version" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "knowledge_chunks_chunk_index_check" CHECK (("chunk_index" >= 0)),
    CONSTRAINT "knowledge_chunks_document_version_check" CHECK (("document_version" > 0)),
    CONSTRAINT "knowledge_chunks_visibility_check" CHECK (("visibility" = ANY (ARRAY['private'::"text", 'department'::"text", 'institution'::"text", 'organization'::"text"])))
);


ALTER TABLE "public"."knowledge_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "institution_id" "uuid",
    "department_id" "uuid",
    "subject_id" "uuid",
    "section_id" "uuid",
    "owner_id" "uuid",
    "title" "text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "storage_bucket" "text" DEFAULT 'knowledge-documents'::"text" NOT NULL,
    "storage_path" "text",
    "visibility" "text" NOT NULL,
    "allowed_roles" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "document_version" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_type" "text" DEFAULT 'upload'::"text" NOT NULL,
    "source_id" "text",
    "content_hash" "text",
    "mime_type" "text",
    "embedding_provider" "text",
    "embedding_model" "text",
    "embedding_revision" "text",
    "embedding_dimensions" integer,
    "embedding_profile" "text",
    CONSTRAINT "knowledge_documents_document_version_check" CHECK (("document_version" > 0)),
    CONSTRAINT "knowledge_documents_embedding_dimensions_check" CHECK ((("embedding_dimensions" IS NULL) OR ("embedding_dimensions" = 384))),
    CONSTRAINT "knowledge_documents_source_type_check" CHECK (("source_type" = ANY (ARRAY['upload'::"text", 'assignment'::"text", 'legacy'::"text"]))),
    CONSTRAINT "knowledge_documents_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'ready'::"text", 'failed'::"text", 'archived'::"text"]))),
    CONSTRAINT "knowledge_documents_visibility_check" CHECK (("visibility" = ANY (ARRAY['private'::"text", 'department'::"text", 'institution'::"text", 'organization'::"text"])))
);


ALTER TABLE "public"."knowledge_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leave_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "section_id" "uuid",
    "advisor_id" "uuid",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "reason" "text",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "institution_id" "uuid",
    "from_date" "date" NOT NULL,
    "to_date" "date" NOT NULL,
    "approved_at" timestamp without time zone,
    "approved_by" "uuid",
    CONSTRAINT "leave_applications_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'APPROVED'::"text", 'REJECTED'::"text"])))
);


ALTER TABLE "public"."leave_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "sender_name" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meeting_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "left_at" timestamp with time zone,
    "is_present" boolean DEFAULT true
);


ALTER TABLE "public"."meeting_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "timetable_slot_id" "uuid",
    "subject_id" "uuid",
    "section_id" "uuid",
    "faculty_id" "uuid" NOT NULL,
    "meeting_code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "meeting_provider" "text" DEFAULT 'daily'::"text" NOT NULL,
    "meeting_type" "text" DEFAULT 'instant'::"text" NOT NULL,
    "meeting_url" "text",
    "is_active" boolean DEFAULT true,
    "scheduled_start" timestamp with time zone,
    "scheduled_end" timestamp with time zone,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "meetings_meeting_provider_check" CHECK (("meeting_provider" = ANY (ARRAY['daily'::"text", 'livekit'::"text", 'jitsi'::"text", 'zoom'::"text"]))),
    CONSTRAINT "meetings_meeting_type_check" CHECK (("meeting_type" = ANY (ARRAY['instant'::"text", 'scheduled'::"text"])))
);


ALTER TABLE "public"."meetings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "email_enabled" boolean DEFAULT true NOT NULL,
    "push_enabled" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_preferences_category_check" CHECK (("category" = ANY (ARRAY['due_date'::"text", 'grading_policy'::"text", 'course_content'::"text", 'files'::"text", 'announcements'::"text", 'grading'::"text", 'invitations'::"text", 'submissions'::"text", 'late_grading'::"text"])))
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "link" "text"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."offer_letters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "course_fees" numeric DEFAULT 0.00 NOT NULL,
    "term_start" "date" NOT NULL,
    "signature_url" "text",
    "signed_at" timestamp without time zone,
    "status" "text" DEFAULT 'SENT'::"text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "version" integer DEFAULT 1 NOT NULL,
    "template_id" "uuid",
    "rendered_html" "text",
    "acceptance_actor_id" "uuid",
    "acceptance_reference" "text",
    "agreement_document_id" "uuid",
    "currency" "text" DEFAULT 'AUD'::"text" NOT NULL,
    CONSTRAINT "offer_letters_status_check" CHECK (("status" = ANY (ARRAY['SENT'::"text", 'ACCEPTED'::"text", 'DECLINED'::"text", 'EXPIRED'::"text"])))
);


ALTER TABLE "public"."offer_letters" OWNER TO "postgres";


COMMENT ON COLUMN "public"."offer_letters"."currency" IS 'ISO 4217-style three-letter currency copied from the application fee configuration.';



CREATE TABLE IF NOT EXISTS "public"."online_session_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "user_id" "uuid",
    "joined_at" timestamp without time zone,
    "left_at" timestamp without time zone
);


ALTER TABLE "public"."online_session_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."online_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "host_id" "uuid",
    "institution_id" "uuid",
    "session_link" "text" NOT NULL,
    "start_time" timestamp without time zone NOT NULL,
    "end_time" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."online_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "features" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_student_relations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "parent_id" "uuid",
    "student_id" "uuid",
    "relationship" "text"
);


ALTER TABLE "public"."parent_student_relations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "total_amount" numeric DEFAULT 0.00 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "source_application_id" "uuid"
);


ALTER TABLE "public"."payment_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "amount_paid" numeric NOT NULL,
    "paid_at" timestamp without time zone DEFAULT "now"(),
    "payment_method" "text" NOT NULL,
    "reference_no" "text"
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."periods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "institution_id" "uuid",
    "period_number" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL
);


ALTER TABLE "public"."periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."programs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "department_id" "uuid",
    "institution_id" "uuid",
    "organization_id" "uuid"
);


ALTER TABLE "public"."programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "group_name" "text" NOT NULL
);


ALTER TABLE "public"."project_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "faculty_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_id" "uuid",
    "faculty_id" "uuid",
    "title" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "uploaded_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "semester" integer NOT NULL,
    "program_id" "uuid",
    "institution_id" "uuid",
    "faculty_advisor_id" "uuid"
);


ALTER TABLE "public"."sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "employee_id" "text"
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "address_line_1" "text" NOT NULL,
    "address_line_2" "text",
    "locality" "text" NOT NULL,
    "state_province" "text",
    "postal_code" "text" NOT NULL,
    "country" "text" NOT NULL,
    "is_current" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "student_addresses_type_check" CHECK (("type" = ANY (ARRAY['RESIDENTIAL'::"text", 'POSTAL'::"text"])))
);


ALTER TABLE "public"."student_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_communications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "summary" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."student_communications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "storage_bucket" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "checksum_sha256" "text",
    "version" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "review_feedback" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived_at" timestamp with time zone,
    "application_id" "uuid",
    "application_document_id" "uuid",
    "superseded_at" timestamp with time zone,
    "superseded_by" "uuid",
    CONSTRAINT "student_documents_category_check" CHECK (("category" = ANY (ARRAY['PASSPORT'::"text", 'VISA'::"text", 'ENGLISH_EVIDENCE'::"text", 'ACADEMIC_DOCUMENT'::"text", 'SIGNED_APPLICATION'::"text", 'STUDENT_REQUEST_FORM'::"text", 'OTHER_SUPPORTING_EVIDENCE'::"text"]))),
    CONSTRAINT "student_documents_size_bytes_check" CHECK (("size_bytes" >= 0)),
    CONSTRAINT "student_documents_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'APPROVED'::"text", 'REJECTED'::"text", 'EXPIRED'::"text", 'ARCHIVED'::"text"]))),
    CONSTRAINT "student_documents_storage_path_relative_check" CHECK (("storage_path" !~ '(^/|^[A-Za-z]:|\\\\)'::"text")),
    CONSTRAINT "student_documents_storage_path_scope_check" CHECK (("storage_path" ~~ (((("institution_id")::"text" || '/'::"text") || ("student_id")::"text") || '/%'::"text"))),
    CONSTRAINT "student_documents_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."student_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."student_documents" IS 'Institution-scoped profile evidence; one immutable row per uploaded version.';



COMMENT ON COLUMN "public"."student_documents"."application_id" IS 'Optional source admissions application; application history remains preserved.';



COMMENT ON COLUMN "public"."student_documents"."superseded_by" IS 'Later version that superseded this immutable document row.';



CREATE TABLE IF NOT EXISTS "public"."student_emergency_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "relationship" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "address" "text",
    "priority" integer DEFAULT 1 NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "student_emergency_contacts_priority_check" CHECK (("priority" > 0))
);


ALTER TABLE "public"."student_emergency_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."student_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_portal_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'NOT_INVITED'::"text" NOT NULL,
    "invited_at" timestamp with time zone,
    "activated_at" timestamp with time zone,
    "deactivated_at" timestamp with time zone,
    "last_invited_at" timestamp with time zone,
    "invited_by" "uuid",
    "activated_by" "uuid",
    "deactivated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "student_portal_access_status_check" CHECK (("status" = ANY (ARRAY['NOT_INVITED'::"text", 'INVITED'::"text", 'ACTIVE'::"text", 'DEACTIVATED'::"text"])))
);


ALTER TABLE "public"."student_portal_access" OWNER TO "postgres";


COMMENT ON TABLE "public"."student_portal_access" IS 'Institution-scoped portal lifecycle. Supabase Auth owns invitation tokens; this table stores status and audit references only.';



CREATE TABLE IF NOT EXISTS "public"."student_profile_details" (
    "student_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "citizenship" "text",
    "country_of_birth" "text",
    "passport_number" "text",
    "passport_country" "text",
    "passport_expiry" "date",
    "visa_type" "text",
    "visa_number" "text",
    "visa_expiry" "date",
    "english_evidence_type" "text",
    "english_evidence_reference" "text",
    "english_evidence_date" "date",
    "usi" "text",
    "other_identifiers" "jsonb",
    "education_agent_id" "uuid",
    "marketing_staff_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student_profile_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "program_id" "uuid",
    "section_id" "uuid",
    "intake_id" "uuid",
    "registration_number" "text",
    "admission_year" integer,
    "dob" "date",
    "gender" "text",
    "semester" integer
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subject_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "faculty_id" "uuid" NOT NULL,
    "title" "text",
    "description" "text" NOT NULL,
    "section_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "files" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subject_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "institution_id" "uuid",
    "name" "text",
    "code" "text",
    "semester" integer,
    "program_id" "uuid",
    "credits" integer,
    "subject_type" "text",
    CONSTRAINT "subjects_subject_type_check" CHECK (("subject_type" = ANY (ARRAY['THEORY'::"text", 'LAB'::"text", 'ELECTIVE'::"text"])))
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submission_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "plagiarism_rate" numeric DEFAULT 0.00,
    "ai_probability" numeric DEFAULT 0.00,
    "status" "text" DEFAULT 'CLEAN'::"text" NOT NULL,
    "verified_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."submission_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assignment_id" "uuid",
    "student_id" "uuid",
    "file_url" "text",
    "submitted_at" timestamp without time zone DEFAULT "now"(),
    "grade" numeric,
    "feedback" "text",
    "quiz_answers" "jsonb",
    "code_content" "text",
    "language" "text",
    "status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "submissions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'graded'::"text", 'late'::"text", 'resubmitted'::"text"])))
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetable_slots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "institution_id" "uuid",
    "day" "text",
    "period" integer,
    "subject_id" "uuid",
    "faculty_id" "uuid",
    "semester" integer,
    "organization_id" "uuid",
    "section_id" "uuid",
    "week_id" "uuid",
    "room" "text",
    "delivery_mode" "text" DEFAULT 'ON_CAMPUS'::"text",
    "meeting_link" "text",
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    CONSTRAINT "timetable_slots_delivery_mode_check" CHECK (("delivery_mode" = ANY (ARRAY['ON_CAMPUS'::"text", 'ONLINE'::"text", 'HYBRID'::"text"])))
);


ALTER TABLE "public"."timetable_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetable_weeks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "section_id" "uuid" NOT NULL,
    "semester" integer NOT NULL,
    "week_number" integer NOT NULL,
    "title" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."timetable_weeks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_account_settings" (
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "sortable_name" "text",
    "language" "text" DEFAULT 'en-US'::"text" NOT NULL,
    "timezone" "text" DEFAULT 'America/New_York'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_account_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "permission_id" "uuid"
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profile_details" (
    "user_id" "uuid" NOT NULL,
    "pronouns" "text",
    "bio" "text",
    "links" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_profile_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "institution_id" "uuid",
    "department_id" "uuid",
    "name" "text",
    "email" "text",
    "role" "text",
    "organization_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "phone" "text",
    "is_active" boolean DEFAULT true,
    "profile_image_url" "text",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text", 'INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'PROGRAM_HEAD'::"text", 'FACULTY'::"text", 'STUDENT'::"text", 'PARENT'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."warning_letters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "institution_id" "uuid" NOT NULL,
    "current_rate" numeric NOT NULL,
    "level" "text" NOT NULL,
    "sent_at" timestamp without time zone DEFAULT "now"(),
    "signed_by_admin" "text"
);


ALTER TABLE "public"."warning_letters" OWNER TO "postgres";


ALTER TABLE ONLY "public"."academic_calendar_events"
    ADD CONSTRAINT "academic_calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admission_documents"
    ADD CONSTRAINT "admission_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admission_documents_v2"
    ADD CONSTRAINT "admission_documents_v2_application_id_document_type_version_key" UNIQUE ("application_id", "document_type", "version");



ALTER TABLE ONLY "public"."admission_documents_v2"
    ADD CONSTRAINT "admission_documents_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admission_fee_configurations"
    ADD CONSTRAINT "admission_fee_configurations_institution_id_program_id_inta_key" UNIQUE ("institution_id", "program_id", "intake_id", "version");



ALTER TABLE ONLY "public"."admission_fee_configurations"
    ADD CONSTRAINT "admission_fee_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admission_status_history"
    ADD CONSTRAINT "admission_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admission_templates"
    ADD CONSTRAINT "admission_templates_institution_id_document_type_version_key" UNIQUE ("institution_id", "document_type", "version");



ALTER TABLE ONLY "public"."admission_templates"
    ADD CONSTRAINT "admission_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admissions_applications"
    ADD CONSTRAINT "admissions_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcement_replies"
    ADD CONSTRAINT "announcement_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assistant_feedback"
    ADD CONSTRAINT "assistant_feedback_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."assistant_feedback"
    ADD CONSTRAINT "assistant_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assistant_message_sources"
    ADD CONSTRAINT "assistant_message_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assistant_messages"
    ADD CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assistant_threads"
    ADD CONSTRAINT "assistant_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assistant_tool_runs"
    ADD CONSTRAINT "assistant_tool_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_warning_letters"
    ADD CONSTRAINT "attendance_warning_letters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."education_agents"
    ADD CONSTRAINT "education_agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrolment_timetable_slots"
    ADD CONSTRAINT "enrolment_timetable_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrolment_timetable_slots"
    ADD CONSTRAINT "enrolment_timetable_slots_unique_assignment" UNIQUE ("enrolment_id", "enrolment_unit_id", "timetable_slot_id");



ALTER TABLE ONLY "public"."enrolment_units"
    ADD CONSTRAINT "enrolment_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrolment_units"
    ADD CONSTRAINT "enrolment_units_unique_subject" UNIQUE ("enrolment_id", "subject_id");



ALTER TABLE ONLY "public"."enrolments"
    ADD CONSTRAINT "enrolments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faculty_subjects"
    ADD CONSTRAINT "faculty_subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grade_columns"
    ADD CONSTRAINT "grade_columns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grade_entries"
    ADD CONSTRAINT "grade_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grade_entries"
    ADD CONSTRAINT "grade_entries_unique_student_column" UNIQUE ("column_id", "student_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."institution_timetable_settings"
    ADD CONSTRAINT "institution_timetable_settings_pkey" PRIMARY KEY ("institution_id");



ALTER TABLE ONLY "public"."institutions"
    ADD CONSTRAINT "institutions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."intakes"
    ADD CONSTRAINT "intakes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_posts"
    ADD CONSTRAINT "job_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_document_id_document_version_chunk_index_key" UNIQUE ("document_id", "document_version", "chunk_index");



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_storage_bucket_storage_path_document_ve_key" UNIQUE ("storage_bucket", "storage_path", "document_version");



ALTER TABLE ONLY "public"."knowledge_ingestion_jobs"
    ADD CONSTRAINT "knowledge_ingestion_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_applications"
    ADD CONSTRAINT "leave_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_messages"
    ADD CONSTRAINT "meeting_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_participants"
    ADD CONSTRAINT "meeting_participants_meeting_id_user_id_key" UNIQUE ("meeting_id", "user_id");



ALTER TABLE ONLY "public"."meeting_participants"
    ADD CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_meeting_code_key" UNIQUE ("meeting_code");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_category_key" UNIQUE ("user_id", "category");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_letters"
    ADD CONSTRAINT "offer_letters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."online_session_participants"
    ADD CONSTRAINT "online_session_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."online_sessions"
    ADD CONSTRAINT "online_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_student_relations"
    ADD CONSTRAINT "parent_student_relations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_plans"
    ADD CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."periods"
    ADD CONSTRAINT "periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_groups"
    ADD CONSTRAINT "project_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_institution_empid_unique" UNIQUE ("institution_id", "employee_id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_addresses"
    ADD CONSTRAINT "student_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_communications"
    ADD CONSTRAINT "student_communications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_emergency_contacts"
    ADD CONSTRAINT "student_emergency_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_notes"
    ADD CONSTRAINT "student_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_portal_access"
    ADD CONSTRAINT "student_portal_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_portal_access"
    ADD CONSTRAINT "student_portal_access_student_id_key" UNIQUE ("student_id");



ALTER TABLE ONLY "public"."student_portal_access"
    ADD CONSTRAINT "student_portal_access_student_institution_unique" UNIQUE ("student_id", "institution_id");



ALTER TABLE ONLY "public"."student_profile_details"
    ADD CONSTRAINT "student_profile_details_pkey" PRIMARY KEY ("student_id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_institution_regno_unique" UNIQUE ("institution_id", "registration_number");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subject_announcements"
    ADD CONSTRAINT "subject_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submission_verifications"
    ADD CONSTRAINT "submission_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetable_slots"
    ADD CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetable_weeks"
    ADD CONSTRAINT "timetable_weeks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetable_weeks"
    ADD CONSTRAINT "unique_section_week" UNIQUE ("section_id", "semester", "week_number");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "uq_notification_pref_user_category" UNIQUE ("user_id", "category");



ALTER TABLE ONLY "public"."user_account_settings"
    ADD CONSTRAINT "user_account_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profile_details"
    ADD CONSTRAINT "user_profile_details_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_org_email_unique" UNIQUE ("organization_id", "email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."warning_letters"
    ADD CONSTRAINT "warning_letters_pkey" PRIMARY KEY ("id");



CREATE INDEX "academic_calendar_inst_dates_idx" ON "public"."academic_calendar_events" USING "btree" ("institution_id", "start_date", "end_date");



CREATE INDEX "admission_documents_v2_application" ON "public"."admission_documents_v2" USING "btree" ("application_id", "document_type", "version" DESC);



CREATE UNIQUE INDEX "admission_one_active_fee" ON "public"."admission_fee_configurations" USING "btree" ("institution_id", "program_id", "intake_id") WHERE "is_active";



CREATE UNIQUE INDEX "admission_one_active_template" ON "public"."admission_templates" USING "btree" ("institution_id", "document_type") WHERE "is_active";



CREATE INDEX "admission_status_history_application" ON "public"."admission_status_history" USING "btree" ("application_id", "created_at" DESC);



CREATE INDEX "enrolment_timetable_slots_enrolment_idx" ON "public"."enrolment_timetable_slots" USING "btree" ("enrolment_id");



CREATE INDEX "enrolment_units_enrolment_idx" ON "public"."enrolment_units" USING "btree" ("enrolment_id");



CREATE UNIQUE INDEX "enrolments_source_application_unique" ON "public"."enrolments" USING "btree" ("source_application_id") WHERE ("source_application_id" IS NOT NULL);



CREATE INDEX "enrolments_student_institution_idx" ON "public"."enrolments" USING "btree" ("student_id", "institution_id");



CREATE UNIQUE INDEX "faculty_subject_unique" ON "public"."faculty_subjects" USING "btree" ("faculty_id", "subject_id");



CREATE UNIQUE INDEX "grade_columns_subject_title_unique" ON "public"."grade_columns" USING "btree" ("subject_id", "title");



CREATE INDEX "idx_admissions_applications_ref" ON "public"."admissions_applications" USING "btree" ("reference_number");



CREATE INDEX "idx_announcement_replies_post" ON "public"."announcement_replies" USING "btree" ("post_id");



CREATE INDEX "idx_applications_resume_url" ON "public"."applications" USING "btree" ("resume_url") WHERE ("resume_url" IS NOT NULL);



CREATE INDEX "idx_assignments_faculty" ON "public"."assignments" USING "btree" ("faculty_id");



CREATE INDEX "idx_assignments_subject" ON "public"."assignments" USING "btree" ("subject_id");



CREATE UNIQUE INDEX "idx_assistant_messages_client_turn" ON "public"."assistant_messages" USING "btree" ("thread_id", "client_turn_id") WHERE (("client_turn_id" IS NOT NULL) AND ("role" = 'user'::"text"));



CREATE INDEX "idx_assistant_messages_thread" ON "public"."assistant_messages" USING "btree" ("thread_id", "created_at");



CREATE INDEX "idx_assistant_sources_message" ON "public"."assistant_message_sources" USING "btree" ("message_id");



CREATE INDEX "idx_assistant_threads_owner" ON "public"."assistant_threads" USING "btree" ("user_id", "institution_id", "updated_at" DESC);



CREATE INDEX "idx_assistant_tool_runs_thread" ON "public"."assistant_tool_runs" USING "btree" ("thread_id", "created_at");



CREATE INDEX "idx_attendance_records_session_student" ON "public"."attendance_records" USING "btree" ("session_id", "student_id");



CREATE INDEX "idx_attendance_records_student" ON "public"."attendance_records" USING "btree" ("student_id");



CREATE INDEX "idx_attendance_sessions_faculty" ON "public"."attendance_sessions" USING "btree" ("faculty_id");



CREATE INDEX "idx_attendance_sessions_sec_date" ON "public"."attendance_sessions" USING "btree" ("section_id", "attendance_date");



CREATE INDEX "idx_attendance_sessions_subject" ON "public"."attendance_sessions" USING "btree" ("subject_id");



CREATE INDEX "idx_companies_institution" ON "public"."companies" USING "btree" ("institution_id");



CREATE INDEX "idx_departments_institution" ON "public"."departments" USING "btree" ("institution_id");



CREATE INDEX "idx_enrolments_institution" ON "public"."enrolments" USING "btree" ("institution_id");



CREATE INDEX "idx_enrolments_program" ON "public"."enrolments" USING "btree" ("program_id");



CREATE INDEX "idx_enrolments_status" ON "public"."enrolments" USING "btree" ("status");



CREATE INDEX "idx_enrolments_student" ON "public"."enrolments" USING "btree" ("student_id");



CREATE INDEX "idx_faculty_subjects_faculty" ON "public"."faculty_subjects" USING "btree" ("faculty_id");



CREATE INDEX "idx_faculty_subjects_section" ON "public"."faculty_subjects" USING "btree" ("section_id");



CREATE INDEX "idx_faculty_subjects_subject" ON "public"."faculty_subjects" USING "btree" ("subject_id");



CREATE INDEX "idx_files_entity" ON "public"."files" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_files_institution" ON "public"."files" USING "btree" ("institution_id");



CREATE INDEX "idx_files_org_module" ON "public"."files" USING "btree" ("organization_id", "module");



CREATE INDEX "idx_grade_columns_subject" ON "public"."grade_columns" USING "btree" ("subject_id");



CREATE INDEX "idx_grade_entries_column_student" ON "public"."grade_entries" USING "btree" ("column_id", "student_id");



CREATE INDEX "idx_grade_entries_student" ON "public"."grade_entries" USING "btree" ("student_id");



CREATE INDEX "idx_intakes_institution" ON "public"."intakes" USING "btree" ("institution_id");



CREATE INDEX "idx_job_posts_institution" ON "public"."job_posts" USING "btree" ("institution_id");



CREATE INDEX "idx_knowledge_chunks_embedding" ON "public"."knowledge_chunks" USING "hnsw" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "idx_knowledge_chunks_scope" ON "public"."knowledge_chunks" USING "btree" ("institution_id", "department_id", "visibility");



CREATE INDEX "idx_knowledge_documents_owner" ON "public"."knowledge_documents" USING "btree" ("owner_id", "created_at" DESC);



CREATE INDEX "idx_knowledge_documents_scope" ON "public"."knowledge_documents" USING "btree" ("institution_id", "department_id", "visibility", "status");



CREATE INDEX "idx_knowledge_jobs_queue" ON "public"."knowledge_ingestion_jobs" USING "btree" ("status", "available_at");



CREATE INDEX "idx_meetings_faculty" ON "public"."meetings" USING "btree" ("faculty_id");



CREATE INDEX "idx_meetings_section" ON "public"."meetings" USING "btree" ("section_id");



CREATE INDEX "idx_meetings_slot" ON "public"."meetings" USING "btree" ("timetable_slot_id");



CREATE INDEX "idx_meetings_subject" ON "public"."meetings" USING "btree" ("subject_id");



CREATE INDEX "idx_messages_meeting" ON "public"."meeting_messages" USING "btree" ("meeting_id");



CREATE INDEX "idx_notification_preferences_user" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_parent_student_parent" ON "public"."parent_student_relations" USING "btree" ("parent_id");



CREATE INDEX "idx_parent_student_student" ON "public"."parent_student_relations" USING "btree" ("student_id");



CREATE INDEX "idx_participants_meeting" ON "public"."meeting_participants" USING "btree" ("meeting_id");



CREATE INDEX "idx_participants_user" ON "public"."meeting_participants" USING "btree" ("user_id");



CREATE INDEX "idx_periods_institution" ON "public"."periods" USING "btree" ("institution_id");



CREATE INDEX "idx_programs_department" ON "public"."programs" USING "btree" ("department_id");



CREATE INDEX "idx_programs_institution" ON "public"."programs" USING "btree" ("institution_id");



CREATE INDEX "idx_sections_faculty_advisor" ON "public"."sections" USING "btree" ("faculty_advisor_id");



CREATE INDEX "idx_sections_institution_program" ON "public"."sections" USING "btree" ("institution_id", "program_id");



CREATE INDEX "idx_staff_institution" ON "public"."staff" USING "btree" ("institution_id");



CREATE INDEX "idx_student_documents_institution_category" ON "public"."student_documents" USING "btree" ("institution_id", "category", "created_at" DESC);



CREATE INDEX "idx_student_documents_status" ON "public"."student_documents" USING "btree" ("institution_id", "status");



CREATE INDEX "idx_student_documents_student" ON "public"."student_documents" USING "btree" ("student_id", "created_at" DESC);



CREATE UNIQUE INDEX "idx_student_documents_version" ON "public"."student_documents" USING "btree" ("student_id", "category", "title", "version");



CREATE INDEX "idx_students_institution" ON "public"."students" USING "btree" ("institution_id");



CREATE INDEX "idx_students_intake" ON "public"."students" USING "btree" ("intake_id");



CREATE INDEX "idx_students_program" ON "public"."students" USING "btree" ("program_id");



CREATE INDEX "idx_students_section" ON "public"."students" USING "btree" ("section_id");



CREATE INDEX "idx_subject_announcements_subject" ON "public"."subject_announcements" USING "btree" ("subject_id");



CREATE INDEX "idx_subjects_institution" ON "public"."subjects" USING "btree" ("institution_id");



CREATE INDEX "idx_subjects_program" ON "public"."subjects" USING "btree" ("program_id");



CREATE INDEX "idx_submissions_assignment_student" ON "public"."submissions" USING "btree" ("assignment_id", "student_id");



CREATE INDEX "idx_submissions_student" ON "public"."submissions" USING "btree" ("student_id");



CREATE INDEX "idx_timetable_slots_faculty" ON "public"."timetable_slots" USING "btree" ("faculty_id");



CREATE INDEX "idx_timetable_slots_inst_sec" ON "public"."timetable_slots" USING "btree" ("institution_id", "section_id");



CREATE INDEX "idx_timetable_slots_subject" ON "public"."timetable_slots" USING "btree" ("subject_id");



CREATE INDEX "idx_timetable_slots_week" ON "public"."timetable_slots" USING "btree" ("week_id");



CREATE INDEX "idx_timetable_weeks_lookup" ON "public"."timetable_weeks" USING "btree" ("institution_id", "section_id", "semester", "week_number");



CREATE INDEX "idx_user_permissions_user_perm" ON "public"."user_permissions" USING "btree" ("user_id", "permission_id");



CREATE INDEX "idx_users_department" ON "public"."users" USING "btree" ("department_id");



CREATE INDEX "idx_users_institution_role" ON "public"."users" USING "btree" ("institution_id", "role");



CREATE INDEX "idx_users_is_active" ON "public"."users" USING "btree" ("is_active");



CREATE INDEX "idx_users_org_role" ON "public"."users" USING "btree" ("organization_id", "role");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE UNIQUE INDEX "invoices_source_installment_unique" ON "public"."invoices" USING "btree" ("source_application_id", "installment_no") WHERE (("source_application_id" IS NOT NULL) AND ("installment_no" IS NOT NULL));



CREATE INDEX "knowledge_chunks_document_version_idx" ON "public"."knowledge_chunks" USING "btree" ("document_id", "document_version", "chunk_index");



CREATE INDEX "knowledge_documents_content_hash_idx" ON "public"."knowledge_documents" USING "btree" ("source_type", "source_id", "content_hash") WHERE (("source_id" IS NOT NULL) AND ("content_hash" IS NOT NULL));



CREATE INDEX "knowledge_documents_embedding_profile_idx" ON "public"."knowledge_documents" USING "btree" ("embedding_profile", "status") WHERE ("status" = 'ready'::"text");



CREATE UNIQUE INDEX "knowledge_documents_source_version_uidx" ON "public"."knowledge_documents" USING "btree" ("source_type", "source_id", "document_version") WHERE ("source_id" IS NOT NULL);



CREATE INDEX "knowledge_ingestion_jobs_claim_idx" ON "public"."knowledge_ingestion_jobs" USING "btree" ("status", "available_at", "created_at") WHERE ("status" = ANY (ARRAY['queued'::"text", 'running'::"text"]));



CREATE UNIQUE INDEX "payment_plans_source_application_unique" ON "public"."payment_plans" USING "btree" ("source_application_id") WHERE ("source_application_id" IS NOT NULL);



CREATE UNIQUE INDEX "student_addresses_one_current" ON "public"."student_addresses" USING "btree" ("student_id", "type") WHERE "is_current";



CREATE INDEX "student_addresses_student" ON "public"."student_addresses" USING "btree" ("student_id", "type");



CREATE INDEX "student_communications_student" ON "public"."student_communications" USING "btree" ("student_id", "occurred_at" DESC);



CREATE INDEX "student_documents_application_idx" ON "public"."student_documents" USING "btree" ("application_id", "created_at" DESC);



CREATE INDEX "student_emergency_contacts_student" ON "public"."student_emergency_contacts" USING "btree" ("student_id", "priority");



CREATE UNIQUE INDEX "student_emergency_one_primary" ON "public"."student_emergency_contacts" USING "btree" ("student_id") WHERE "is_primary";



CREATE INDEX "student_notes_student" ON "public"."student_notes" USING "btree" ("student_id", "created_at" DESC);



CREATE INDEX "student_portal_access_auth_user_idx" ON "public"."student_portal_access" USING "btree" ("auth_user_id");



CREATE INDEX "student_portal_access_institution_status_idx" ON "public"."student_portal_access" USING "btree" ("institution_id", "status");



CREATE INDEX "student_profile_details_institution" ON "public"."student_profile_details" USING "btree" ("institution_id");



CREATE UNIQUE INDEX "timetable_slots_unique_cell_idx" ON "public"."timetable_slots" USING "btree" ("institution_id", "section_id", "semester", "day", "period", COALESCE("week_id", '00000000-0000-0000-0000-000000000000'::"uuid"));



CREATE OR REPLACE TRIGGER "offer_letters_currency_sync" BEFORE INSERT ON "public"."offer_letters" FOR EACH ROW EXECUTE FUNCTION "public"."sync_offer_letter_currency"();



CREATE OR REPLACE TRIGGER "student_portal_access_scope_trigger" BEFORE INSERT OR UPDATE ON "public"."student_portal_access" FOR EACH ROW EXECUTE FUNCTION "public"."validate_student_portal_access_scope"();



CREATE OR REPLACE TRIGGER "student_portal_access_updated_at" BEFORE UPDATE ON "public"."student_portal_access" FOR EACH ROW EXECUTE FUNCTION "public"."touch_student_portal_access"();



ALTER TABLE ONLY "public"."academic_calendar_events"
    ADD CONSTRAINT "academic_calendar_events_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admission_documents"
    ADD CONSTRAINT "admission_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."admissions_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admission_documents"
    ADD CONSTRAINT "admission_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."admission_documents_v2"
    ADD CONSTRAINT "admission_documents_v2_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."admissions_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admission_documents_v2"
    ADD CONSTRAINT "admission_documents_v2_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."admission_documents_v2"
    ADD CONSTRAINT "admission_documents_v2_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admission_documents_v2"
    ADD CONSTRAINT "admission_documents_v2_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."admission_documents_v2"
    ADD CONSTRAINT "admission_documents_v2_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."admission_templates"("id");



ALTER TABLE ONLY "public"."admission_fee_configurations"
    ADD CONSTRAINT "admission_fee_configurations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."admission_fee_configurations"
    ADD CONSTRAINT "admission_fee_configurations_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admission_fee_configurations"
    ADD CONSTRAINT "admission_fee_configurations_intake_id_fkey" FOREIGN KEY ("intake_id") REFERENCES "public"."intakes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admission_fee_configurations"
    ADD CONSTRAINT "admission_fee_configurations_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admission_status_history"
    ADD CONSTRAINT "admission_status_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."admission_status_history"
    ADD CONSTRAINT "admission_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."admissions_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admission_status_history"
    ADD CONSTRAINT "admission_status_history_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admission_templates"
    ADD CONSTRAINT "admission_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."admission_templates"
    ADD CONSTRAINT "admission_templates_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admissions_applications"
    ADD CONSTRAINT "admissions_applications_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admissions_applications"
    ADD CONSTRAINT "admissions_applications_intake_id_fkey" FOREIGN KEY ("intake_id") REFERENCES "public"."intakes"("id");



ALTER TABLE ONLY "public"."admissions_applications"
    ADD CONSTRAINT "admissions_applications_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admissions_applications"
    ADD CONSTRAINT "admissions_applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."announcement_replies"
    ADD CONSTRAINT "announcement_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."announcement_replies"
    ADD CONSTRAINT "announcement_replies_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."subject_announcements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_job_post_id_fkey" FOREIGN KEY ("job_post_id") REFERENCES "public"."job_posts"("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."assistant_feedback"
    ADD CONSTRAINT "assistant_feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."assistant_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assistant_feedback"
    ADD CONSTRAINT "assistant_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assistant_message_sources"
    ADD CONSTRAINT "assistant_message_sources_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."assistant_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assistant_messages"
    ADD CONSTRAINT "assistant_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assistant_threads"
    ADD CONSTRAINT "assistant_threads_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assistant_threads"
    ADD CONSTRAINT "assistant_threads_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assistant_threads"
    ADD CONSTRAINT "assistant_threads_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assistant_threads"
    ADD CONSTRAINT "assistant_threads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assistant_threads"
    ADD CONSTRAINT "assistant_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assistant_tool_runs"
    ADD CONSTRAINT "assistant_tool_runs_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."assistant_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assistant_tool_runs"
    ADD CONSTRAINT "assistant_tool_runs_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id");



ALTER TABLE ONLY "public"."attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."attendance_warning_letters"
    ADD CONSTRAINT "attendance_warning_letters_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_warning_letters"
    ADD CONSTRAINT "attendance_warning_letters_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."attendance_warning_letters"
    ADD CONSTRAINT "attendance_warning_letters_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."education_agents"
    ADD CONSTRAINT "education_agents_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrolment_timetable_slots"
    ADD CONSTRAINT "enrolment_timetable_slots_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."enrolment_timetable_slots"
    ADD CONSTRAINT "enrolment_timetable_slots_enrolment_id_fkey" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrolment_timetable_slots"
    ADD CONSTRAINT "enrolment_timetable_slots_enrolment_unit_id_fkey" FOREIGN KEY ("enrolment_unit_id") REFERENCES "public"."enrolment_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrolment_timetable_slots"
    ADD CONSTRAINT "enrolment_timetable_slots_timetable_slot_id_fkey" FOREIGN KEY ("timetable_slot_id") REFERENCES "public"."timetable_slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrolment_units"
    ADD CONSTRAINT "enrolment_units_enrolment_id_fkey" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrolment_units"
    ADD CONSTRAINT "enrolment_units_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."enrolment_units"
    ADD CONSTRAINT "enrolment_units_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."enrolments"
    ADD CONSTRAINT "enrolments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."enrolments"
    ADD CONSTRAINT "enrolments_intake_id_fkey" FOREIGN KEY ("intake_id") REFERENCES "public"."intakes"("id");



ALTER TABLE ONLY "public"."enrolments"
    ADD CONSTRAINT "enrolments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."enrolments"
    ADD CONSTRAINT "enrolments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id");



ALTER TABLE ONLY "public"."enrolments"
    ADD CONSTRAINT "enrolments_source_application_id_fkey" FOREIGN KEY ("source_application_id") REFERENCES "public"."admissions_applications"("id");



ALTER TABLE ONLY "public"."enrolments"
    ADD CONSTRAINT "enrolments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."enrolments"
    ADD CONSTRAINT "enrolments_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."faculty_subjects"
    ADD CONSTRAINT "faculty_subjects_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."faculty_subjects"
    ADD CONSTRAINT "faculty_subjects_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."faculty_subjects"
    ADD CONSTRAINT "faculty_subjects_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id");



ALTER TABLE ONLY "public"."faculty_subjects"
    ADD CONSTRAINT "faculty_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."grade_columns"
    ADD CONSTRAINT "grade_columns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."grade_columns"
    ADD CONSTRAINT "grade_columns_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."grade_entries"
    ADD CONSTRAINT "grade_entries_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "public"."grade_columns"("id");



ALTER TABLE ONLY "public"."grade_entries"
    ADD CONSTRAINT "grade_entries_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."grade_entries"
    ADD CONSTRAINT "grade_entries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."project_groups"("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."institution_timetable_settings"
    ADD CONSTRAINT "institution_timetable_settings_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."institutions"
    ADD CONSTRAINT "institutions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."intakes"
    ADD CONSTRAINT "intakes_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_payment_plan_id_fkey" FOREIGN KEY ("payment_plan_id") REFERENCES "public"."payment_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_source_application_id_fkey" FOREIGN KEY ("source_application_id") REFERENCES "public"."admissions_applications"("id");



ALTER TABLE ONLY "public"."job_posts"
    ADD CONSTRAINT "job_posts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."job_posts"
    ADD CONSTRAINT "job_posts_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."knowledge_ingestion_jobs"
    ADD CONSTRAINT "knowledge_ingestion_jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_ingestion_jobs"
    ADD CONSTRAINT "knowledge_ingestion_jobs_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leave_applications"
    ADD CONSTRAINT "leave_applications_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."leave_applications"
    ADD CONSTRAINT "leave_applications_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."leave_applications"
    ADD CONSTRAINT "leave_applications_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."leave_applications"
    ADD CONSTRAINT "leave_applications_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id");



ALTER TABLE ONLY "public"."leave_applications"
    ADD CONSTRAINT "leave_applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."meeting_messages"
    ADD CONSTRAINT "meeting_messages_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_messages"
    ADD CONSTRAINT "meeting_messages_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_messages"
    ADD CONSTRAINT "meeting_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_participants"
    ADD CONSTRAINT "meeting_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_participants"
    ADD CONSTRAINT "meeting_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_timetable_slot_id_fkey" FOREIGN KEY ("timetable_slot_id") REFERENCES "public"."timetable_slots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."offer_letters"
    ADD CONSTRAINT "offer_letters_acceptance_actor_id_fkey" FOREIGN KEY ("acceptance_actor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."offer_letters"
    ADD CONSTRAINT "offer_letters_agreement_document_id_fkey" FOREIGN KEY ("agreement_document_id") REFERENCES "public"."admission_documents_v2"("id");



ALTER TABLE ONLY "public"."offer_letters"
    ADD CONSTRAINT "offer_letters_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."admissions_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offer_letters"
    ADD CONSTRAINT "offer_letters_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."admission_templates"("id");



ALTER TABLE ONLY "public"."online_session_participants"
    ADD CONSTRAINT "online_session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."online_sessions"("id");



ALTER TABLE ONLY "public"."online_session_participants"
    ADD CONSTRAINT "online_session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."online_sessions"
    ADD CONSTRAINT "online_sessions_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."online_sessions"
    ADD CONSTRAINT "online_sessions_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."parent_student_relations"
    ADD CONSTRAINT "parent_student_relations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."parent_student_relations"
    ADD CONSTRAINT "parent_student_relations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."payment_plans"
    ADD CONSTRAINT "payment_plans_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_plans"
    ADD CONSTRAINT "payment_plans_source_application_id_fkey" FOREIGN KEY ("source_application_id") REFERENCES "public"."admissions_applications"("id");



ALTER TABLE ONLY "public"."payment_plans"
    ADD CONSTRAINT "payment_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."periods"
    ADD CONSTRAINT "periods_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."project_groups"
    ADD CONSTRAINT "project_groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_faculty_advisor_id_fkey" FOREIGN KEY ("faculty_advisor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."student_addresses"
    ADD CONSTRAINT "student_addresses_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_addresses"
    ADD CONSTRAINT "student_addresses_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_communications"
    ADD CONSTRAINT "student_communications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."student_communications"
    ADD CONSTRAINT "student_communications_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_communications"
    ADD CONSTRAINT "student_communications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_application_document_id_fkey" FOREIGN KEY ("application_document_id") REFERENCES "public"."admission_documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."admissions_applications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_institution_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_student_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_superseded_by_fkey" FOREIGN KEY ("superseded_by") REFERENCES "public"."student_documents"("id");



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."student_emergency_contacts"
    ADD CONSTRAINT "student_emergency_contacts_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_emergency_contacts"
    ADD CONSTRAINT "student_emergency_contacts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_notes"
    ADD CONSTRAINT "student_notes_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."student_notes"
    ADD CONSTRAINT "student_notes_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_notes"
    ADD CONSTRAINT "student_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_portal_access"
    ADD CONSTRAINT "student_portal_access_activated_by_fkey" FOREIGN KEY ("activated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."student_portal_access"
    ADD CONSTRAINT "student_portal_access_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_portal_access"
    ADD CONSTRAINT "student_portal_access_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."student_portal_access"
    ADD CONSTRAINT "student_portal_access_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_portal_access"
    ADD CONSTRAINT "student_portal_access_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."student_portal_access"
    ADD CONSTRAINT "student_portal_access_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_profile_details"
    ADD CONSTRAINT "student_profile_details_education_agent_id_fkey" FOREIGN KEY ("education_agent_id") REFERENCES "public"."education_agents"("id");



ALTER TABLE ONLY "public"."student_profile_details"
    ADD CONSTRAINT "student_profile_details_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_profile_details"
    ADD CONSTRAINT "student_profile_details_marketing_staff_id_fkey" FOREIGN KEY ("marketing_staff_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."student_profile_details"
    ADD CONSTRAINT "student_profile_details_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_intake_id_fkey" FOREIGN KEY ("intake_id") REFERENCES "public"."intakes"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id");



ALTER TABLE ONLY "public"."subject_announcements"
    ADD CONSTRAINT "subject_announcements_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."subject_announcements"
    ADD CONSTRAINT "subject_announcements_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."submission_verifications"
    ADD CONSTRAINT "submission_verifications_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."timetable_slots"
    ADD CONSTRAINT "timetable_slots_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."timetable_slots"
    ADD CONSTRAINT "timetable_slots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."timetable_slots"
    ADD CONSTRAINT "timetable_slots_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id");



ALTER TABLE ONLY "public"."timetable_slots"
    ADD CONSTRAINT "timetable_slots_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."timetable_slots"
    ADD CONSTRAINT "timetable_slots_teacher_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."timetable_slots"
    ADD CONSTRAINT "timetable_slots_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."timetable_slots"
    ADD CONSTRAINT "timetable_slots_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."timetable_weeks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetable_weeks"
    ADD CONSTRAINT "timetable_weeks_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetable_weeks"
    ADD CONSTRAINT "timetable_weeks_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_account_settings"
    ADD CONSTRAINT "user_account_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_profile_details"
    ADD CONSTRAINT "user_profile_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."warning_letters"
    ADD CONSTRAINT "warning_letters_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warning_letters"
    ADD CONSTRAINT "warning_letters_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated users" ON "public"."leave_applications" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can manage their own account settings" ON "public"."user_account_settings" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage their own notification preferences" ON "public"."notification_preferences" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage their own profile details" ON "public"."user_profile_details" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own account settings" ON "public"."user_account_settings" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own profile details" ON "public"."user_profile_details" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users manage their own account settings" ON "public"."user_account_settings" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own notification preferences" ON "public"."notification_preferences" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own profile details" ON "public"."user_profile_details" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."academic_calendar_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "academic_calendar_events_admin_manage" ON "public"."academic_calendar_events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text", 'INSTITUTION_ADMIN'::"text"])) OR ("u"."institution_id" = "academic_calendar_events"."institution_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text", 'INSTITUTION_ADMIN'::"text"])) OR ("u"."institution_id" = "academic_calendar_events"."institution_id"))))));



CREATE POLICY "academic_calendar_events_read" ON "public"."academic_calendar_events" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."admission_documents_v2" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admission_documents_v2_scoped" ON "public"."admission_documents_v2" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("u"."institution_id" = "admission_documents_v2"."institution_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("u"."institution_id" = "admission_documents_v2"."institution_id"))))));



CREATE POLICY "admission_fee_configurations_scoped" ON "public"."admission_fee_configurations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("u"."institution_id" = "admission_fee_configurations"."institution_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("u"."institution_id" = "admission_fee_configurations"."institution_id"))))));



ALTER TABLE "public"."admission_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admission_status_history_scoped" ON "public"."admission_status_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("u"."institution_id" = "admission_status_history"."institution_id"))))));



ALTER TABLE "public"."admission_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admission_templates_scoped" ON "public"."admission_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("u"."institution_id" = "admission_templates"."institution_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("u"."institution_id" = "admission_templates"."institution_id"))))));



CREATE POLICY "all_settings" ON "public"."institution_timetable_settings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'INSTITUTION_ADMIN'::"text") AND ("users"."institution_id" = "institution_timetable_settings"."institution_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'INSTITUTION_ADMIN'::"text") AND ("users"."institution_id" = "institution_timetable_settings"."institution_id")))));



CREATE POLICY "allow_authenticated_all_attendance_warnings" ON "public"."attendance_warning_letters" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."announcement_replies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcement_replies_all" ON "public"."announcement_replies" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "announcements_delete" ON "public"."announcements" FOR DELETE TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("institution_id" = "public"."current_user_institution_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text"])))));



CREATE POLICY "announcements_insert" ON "public"."announcements" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'PROGRAM_HEAD'::"text", 'FACULTY'::"text"])) AND ("institution_id" = "public"."current_user_institution_id"()))));



CREATE POLICY "announcements_select" ON "public"."announcements" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



CREATE POLICY "announcements_update" ON "public"."announcements" FOR UPDATE TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("institution_id" = "public"."current_user_institution_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'PROGRAM_HEAD'::"text", 'FACULTY'::"text"])))));



ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "applications_insert" ON "public"."applications" FOR INSERT TO "authenticated" WITH CHECK ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text", 'INSTITUTION_ADMIN'::"text"]))));



CREATE POLICY "applications_select" ON "public"."applications" FOR SELECT TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (EXISTS ( SELECT 1
   FROM "public"."job_posts" "jp"
  WHERE (("jp"."id" = "applications"."job_post_id") AND ("jp"."institution_id" = "public"."current_user_institution_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'PROGRAM_HEAD'::"text"])))))));



CREATE POLICY "assignments_select" ON "public"."assignments" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (EXISTS ( SELECT 1
   FROM "public"."subjects" "sub"
  WHERE (("sub"."id" = "assignments"."subject_id") AND ("sub"."institution_id" = "public"."current_user_institution_id"()))))));



ALTER TABLE "public"."assistant_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assistant_feedback_owner_all" ON "public"."assistant_feedback" TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM ("public"."assistant_messages" "m"
     JOIN "public"."assistant_threads" "t" ON (("t"."id" = "m"."thread_id")))
  WHERE (("m"."id" = "assistant_feedback"."message_id") AND ("t"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM ("public"."assistant_messages" "m"
     JOIN "public"."assistant_threads" "t" ON (("t"."id" = "m"."thread_id")))
  WHERE (("m"."id" = "assistant_feedback"."message_id") AND ("t"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."assistant_message_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assistant_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assistant_messages_owner_delete" ON "public"."assistant_messages" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."assistant_threads" "t"
  WHERE (("t"."id" = "assistant_messages"."thread_id") AND ("t"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "assistant_messages_owner_insert" ON "public"."assistant_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."assistant_threads" "t"
  WHERE (("t"."id" = "assistant_messages"."thread_id") AND ("t"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "assistant_messages_owner_select" ON "public"."assistant_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."assistant_threads" "t"
  WHERE (("t"."id" = "assistant_messages"."thread_id") AND ("t"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "assistant_sources_owner_insert" ON "public"."assistant_message_sources" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."assistant_messages" "m"
     JOIN "public"."assistant_threads" "t" ON (("t"."id" = "m"."thread_id")))
  WHERE (("m"."id" = "assistant_message_sources"."message_id") AND ("t"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "assistant_sources_owner_select" ON "public"."assistant_message_sources" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."assistant_messages" "m"
     JOIN "public"."assistant_threads" "t" ON (("t"."id" = "m"."thread_id")))
  WHERE (("m"."id" = "assistant_message_sources"."message_id") AND ("t"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."assistant_threads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assistant_threads_owner_delete" ON "public"."assistant_threads" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "assistant_threads_owner_insert" ON "public"."assistant_threads" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("actor_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "assistant_threads_owner_select" ON "public"."assistant_threads" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "assistant_threads_owner_update" ON "public"."assistant_threads" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."assistant_tool_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assistant_tool_runs_owner_insert" ON "public"."assistant_tool_runs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."assistant_threads" "t"
  WHERE (("t"."id" = "assistant_tool_runs"."thread_id") AND ("t"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "assistant_tool_runs_owner_select" ON "public"."assistant_tool_runs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."assistant_threads" "t"
  WHERE (("t"."id" = "assistant_tool_runs"."thread_id") AND ("t"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "attendance_records_select" ON "public"."attendance_records" FOR SELECT TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'PROGRAM_HEAD'::"text", 'FACULTY'::"text"])) AND (EXISTS ( SELECT 1
   FROM ("public"."attendance_sessions" "ses"
     JOIN "public"."sections" "sec" ON (("sec"."id" = "ses"."section_id")))
  WHERE (("ses"."id" = "attendance_records"."session_id") AND ("sec"."institution_id" = "public"."current_user_institution_id"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."parent_student_relations" "psr"
  WHERE (("psr"."parent_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("psr"."student_id" = "attendance_records"."student_id"))))));



CREATE POLICY "attendance_sessions_select" ON "public"."attendance_sessions" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (EXISTS ( SELECT 1
   FROM "public"."sections" "sec"
  WHERE (("sec"."id" = "attendance_sessions"."section_id") AND ("sec"."institution_id" = "public"."current_user_institution_id"()))))));



ALTER TABLE "public"."attendance_warning_letters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_select" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = 'INSTITUTION_ADMIN'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = "audit_logs"."user_id") AND ("actor"."institution_id" = "public"."current_user_institution_id"())))))));



CREATE POLICY "companies_select" ON "public"."companies" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."complaints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "complaints_insert" ON "public"."complaints" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "complaints_select" ON "public"."complaints" FOR SELECT TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."users" "complainer"
  WHERE (("complainer"."id" = "complaints"."student_id") AND ("complainer"."institution_id" = "public"."current_user_institution_id"())))))));



ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "departments_select_scoped" ON "public"."departments" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



CREATE POLICY "enrolment_timetable_slots_scoped" ON "public"."enrolment_timetable_slots" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."enrolments" "e"
     JOIN "public"."users" "u" ON (("u"."id" = ( SELECT "auth"."uid"() AS "uid"))))
  WHERE (("e"."id" = "enrolment_timetable_slots"."enrolment_id") AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("u"."institution_id" = "e"."institution_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."enrolments" "e"
     JOIN "public"."users" "u" ON (("u"."id" = ( SELECT "auth"."uid"() AS "uid"))))
  WHERE (("e"."id" = "enrolment_timetable_slots"."enrolment_id") AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("u"."institution_id" = "e"."institution_id"))))));



ALTER TABLE "public"."enrolment_units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enrolment_units_scoped" ON "public"."enrolment_units" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."enrolments" "e"
     JOIN "public"."users" "u" ON (("u"."id" = ( SELECT "auth"."uid"() AS "uid"))))
  WHERE (("e"."id" = "enrolment_units"."enrolment_id") AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("u"."institution_id" = "e"."institution_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."enrolments" "e"
     JOIN "public"."users" "u" ON (("u"."id" = ( SELECT "auth"."uid"() AS "uid"))))
  WHERE (("e"."id" = "enrolment_units"."enrolment_id") AND (("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("u"."institution_id" = "e"."institution_id"))))));



ALTER TABLE "public"."enrolments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enrolments_all" ON "public"."enrolments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "event_registrations_delete" ON "public"."event_registrations" FOR DELETE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text", 'INSTITUTION_ADMIN'::"text"]))));



CREATE POLICY "event_registrations_insert" ON "public"."event_registrations" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text", 'INSTITUTION_ADMIN'::"text"]))));



CREATE POLICY "event_registrations_select" ON "public"."event_registrations" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (EXISTS ( SELECT 1
   FROM "public"."events" "ev"
  WHERE (("ev"."id" = "event_registrations"."event_id") AND ("ev"."institution_id" = "public"."current_user_institution_id"()))))));



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_delete" ON "public"."events" FOR DELETE TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("institution_id" = "public"."current_user_institution_id"()) AND (("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text"]))))));



CREATE POLICY "events_insert" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'PROGRAM_HEAD'::"text", 'FACULTY'::"text"])) AND ("institution_id" = "public"."current_user_institution_id"()))));



CREATE POLICY "events_select" ON "public"."events" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



CREATE POLICY "events_update" ON "public"."events" FOR UPDATE TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("institution_id" = "public"."current_user_institution_id"()) AND (("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'PROGRAM_HEAD'::"text", 'FACULTY'::"text"]))))));



CREATE POLICY "faculty_subjects_select_scoped" ON "public"."faculty_subjects" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



ALTER TABLE "public"."files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "files_scoped_select" ON "public"."files" FOR SELECT TO "authenticated" USING ((("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("institution_id" IS NOT NULL) AND ("institution_id" = "public"."current_user_institution_id"()))));



CREATE POLICY "grade_columns_select" ON "public"."grade_columns" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (EXISTS ( SELECT 1
   FROM "public"."subjects" "s"
  WHERE (("s"."id" = "grade_columns"."subject_id") AND ("s"."institution_id" = "public"."current_user_institution_id"()))))));



CREATE POLICY "grade_entries_select" ON "public"."grade_entries" FOR SELECT TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'PROGRAM_HEAD'::"text", 'FACULTY'::"text"])) AND (EXISTS ( SELECT 1
   FROM ("public"."grade_columns" "gc"
     JOIN "public"."subjects" "s" ON (("s"."id" = "gc"."subject_id")))
  WHERE (("gc"."id" = "grade_entries"."column_id") AND ("s"."institution_id" = "public"."current_user_institution_id"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."parent_student_relations" "psr"
  WHERE (("psr"."parent_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("psr"."student_id" = "grade_entries"."student_id"))))));



CREATE POLICY "group_members_select" ON "public"."group_members" FOR SELECT TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (EXISTS ( SELECT 1
   FROM (("public"."project_groups" "pg"
     JOIN "public"."projects" "p" ON (("p"."id" = "pg"."project_id")))
     JOIN "public"."users" "faculty" ON (("faculty"."id" = "p"."faculty_id")))
  WHERE (("pg"."id" = "group_members"."group_id") AND (("p"."faculty_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("faculty"."institution_id" = "public"."current_user_institution_id"())))))));



ALTER TABLE "public"."institution_timetable_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "institutions_select_scoped" ON "public"."institutions" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("id" = "public"."current_user_institution_id"())));



ALTER TABLE "public"."intakes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "intakes_select_scoped" ON "public"."intakes" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



CREATE POLICY "job_posts_insert" ON "public"."job_posts" FOR INSERT TO "authenticated" WITH CHECK ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text"])) AND ("institution_id" = "public"."current_user_institution_id"()))));



CREATE POLICY "job_posts_select" ON "public"."job_posts" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



CREATE POLICY "job_posts_update" ON "public"."job_posts" FOR UPDATE TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("institution_id" = "public"."current_user_institution_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text"])))));



ALTER TABLE "public"."knowledge_chunks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "knowledge_chunks_scoped_select" ON "public"."knowledge_chunks" FOR SELECT TO "authenticated" USING ((((EXISTS ( SELECT 1
   FROM "public"."knowledge_documents" "d"
  WHERE ("d"."id" = "knowledge_chunks"."document_id"))) AND ("owner_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."users" "owner_user"
  WHERE (("owner_user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT ("owner_user"."organization_id" IS DISTINCT FROM "knowledge_chunks"."organization_id")) AND (("knowledge_chunks"."institution_id" IS NULL) OR ("owner_user"."institution_id" = "knowledge_chunks"."institution_id")))))) OR (EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT ("actor"."organization_id" IS DISTINCT FROM "knowledge_chunks"."organization_id")) AND (("knowledge_chunks"."institution_id" IS NULL) OR ("actor"."institution_id" = "knowledge_chunks"."institution_id")) AND (("knowledge_chunks"."visibility" = 'organization'::"text") OR (("knowledge_chunks"."visibility" = 'institution'::"text") AND ("actor"."institution_id" = "knowledge_chunks"."institution_id")) OR (("knowledge_chunks"."visibility" = 'department'::"text") AND ("actor"."department_id" = "knowledge_chunks"."department_id")) OR ("actor"."role" = ANY ("knowledge_chunks"."allowed_roles"))) AND "public"."assistant_knowledge_audience_allowed"("knowledge_chunks"."department_id", "knowledge_chunks"."subject_id", "knowledge_chunks"."section_id"))))));



ALTER TABLE "public"."knowledge_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "knowledge_documents_scoped_select" ON "public"."knowledge_documents" FOR SELECT TO "authenticated" USING (((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."users" "owner_user"
  WHERE (("owner_user"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT ("owner_user"."organization_id" IS DISTINCT FROM "knowledge_documents"."organization_id")) AND (("knowledge_documents"."institution_id" IS NULL) OR ("owner_user"."institution_id" = "knowledge_documents"."institution_id")))))) OR (EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT ("actor"."organization_id" IS DISTINCT FROM "knowledge_documents"."organization_id")) AND (("knowledge_documents"."institution_id" IS NULL) OR ("actor"."institution_id" = "knowledge_documents"."institution_id")) AND (("knowledge_documents"."visibility" = 'organization'::"text") OR (("knowledge_documents"."visibility" = 'institution'::"text") AND ("actor"."institution_id" = "knowledge_documents"."institution_id")) OR (("knowledge_documents"."visibility" = 'department'::"text") AND ("actor"."department_id" = "knowledge_documents"."department_id")) OR ("actor"."role" = ANY ("knowledge_documents"."allowed_roles"))) AND "public"."assistant_knowledge_audience_allowed"("knowledge_documents"."department_id", "knowledge_documents"."subject_id", "knowledge_documents"."section_id"))))));



ALTER TABLE "public"."knowledge_ingestion_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "knowledge_jobs_owner_select" ON "public"."knowledge_ingestion_jobs" FOR SELECT TO "authenticated" USING (("requested_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "leave_applications_insert" ON "public"."leave_applications" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "leave_applications_select" ON "public"."leave_applications" FOR SELECT TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("advisor_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("institution_id" = "public"."current_user_institution_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'FACULTY'::"text"])))));



CREATE POLICY "manage_timetable_weeks" ON "public"."timetable_weeks" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."meeting_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meetings_scoped_select" ON "public"."meetings" FOR SELECT TO "authenticated" USING ((("faculty_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_meeting_participant"("id", ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = 'INSTITUTION_ADMIN'::"text") AND ("institution_id" = "public"."current_user_institution_id"()))));



CREATE POLICY "messages_scoped_insert" ON "public"."meeting_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("public"."is_meeting_participant"("meeting_id", ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_meeting_host"("meeting_id", ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "messages_scoped_select" ON "public"."meeting_messages" FOR SELECT TO "authenticated" USING (("public"."is_meeting_participant"("meeting_id", ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_meeting_host"("meeting_id", ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"]))));



CREATE POLICY "notif_prefs_select_own" ON "public"."notification_preferences" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notif_prefs_upsert_own" ON "public"."notification_preferences" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert_service_role" ON "public"."notifications" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "organizations_select_scoped" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'SUPER_ADMIN'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("u"."organization_id" = "organizations"."id"))))));



CREATE POLICY "parent_student_relations_manage" ON "public"."parent_student_relations" TO "authenticated" USING (("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text", 'INSTITUTION_ADMIN'::"text"]))) WITH CHECK (("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text", 'INSTITUTION_ADMIN'::"text"])));



CREATE POLICY "parent_student_relations_select" ON "public"."parent_student_relations" FOR SELECT TO "authenticated" USING ((("parent_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text", 'INSTITUTION_ADMIN'::"text"]))));



CREATE POLICY "participants_scoped_select" ON "public"."meeting_participants" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_meeting_host"("meeting_id", ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = 'INSTITUTION_ADMIN'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."meetings" "m"
  WHERE (("m"."id" = "meeting_participants"."meeting_id") AND ("m"."institution_id" = "public"."current_user_institution_id"())))))));



ALTER TABLE "public"."periods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "periods_select_scoped" ON "public"."periods" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



ALTER TABLE "public"."programs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "programs_select_scoped" ON "public"."programs" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



ALTER TABLE "public"."project_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_groups_select" ON "public"."project_groups" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (EXISTS ( SELECT 1
   FROM ("public"."projects" "p"
     JOIN "public"."users" "faculty" ON (("faculty"."id" = "p"."faculty_id")))
  WHERE (("p"."id" = "project_groups"."project_id") AND (("p"."faculty_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("faculty"."institution_id" = "public"."current_user_institution_id"())))))));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_select" ON "public"."projects" FOR SELECT TO "authenticated" USING ((("faculty_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (EXISTS ( SELECT 1
   FROM "public"."users" "faculty"
  WHERE (("faculty"."id" = "projects"."faculty_id") AND ("faculty"."institution_id" = "public"."current_user_institution_id"()))))));



CREATE POLICY "resources_select" ON "public"."resources" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (EXISTS ( SELECT 1
   FROM "public"."subjects" "sub"
  WHERE (("sub"."id" = "resources"."subject_id") AND ("sub"."institution_id" = "public"."current_user_institution_id"()))))));



CREATE POLICY "sections_select_scoped" ON "public"."sections" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



CREATE POLICY "select_settings" ON "public"."institution_timetable_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "select_timetable_weeks" ON "public"."timetable_weeks" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_admin_manage" ON "public"."staff" TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = 'INSTITUTION_ADMIN'::"text") AND ("institution_id" = "public"."current_user_institution_id"())))) WITH CHECK ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = 'INSTITUTION_ADMIN'::"text") AND ("institution_id" = "public"."current_user_institution_id"()))));



CREATE POLICY "staff_select_scoped" ON "public"."staff" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



ALTER TABLE "public"."student_addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_addresses_select_scoped" ON "public"."student_addresses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("actor"."id" = "student_addresses"."student_id") OR ("actor"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("actor"."role" = 'INSTITUTION_ADMIN'::"text") AND ("actor"."institution_id" = "student_addresses"."institution_id")))))));



ALTER TABLE "public"."student_communications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_communications_select_scoped" ON "public"."student_communications" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("actor"."id" = "student_communications"."student_id") OR ("actor"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("actor"."role" = 'INSTITUTION_ADMIN'::"text") AND ("actor"."institution_id" = "student_communications"."institution_id")))))));



ALTER TABLE "public"."student_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_documents_insert_scoped" ON "public"."student_documents" FOR INSERT TO "authenticated" WITH CHECK ((("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("actor"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("actor"."role" = 'INSTITUTION_ADMIN'::"text") AND ("actor"."institution_id" = "student_documents"."institution_id")))))) AND (EXISTS ( SELECT 1
   FROM "public"."students" "target"
  WHERE (("target"."id" = "student_documents"."student_id") AND ("target"."institution_id" = "student_documents"."institution_id"))))));



CREATE POLICY "student_documents_select_scoped" ON "public"."student_documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("actor"."id" = "student_documents"."student_id") OR ("actor"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("actor"."role" = 'INSTITUTION_ADMIN'::"text") AND ("actor"."institution_id" = "student_documents"."institution_id")))))));



CREATE POLICY "student_documents_update_scoped" ON "public"."student_documents" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("actor"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("actor"."role" = 'INSTITUTION_ADMIN'::"text") AND ("actor"."institution_id" = "student_documents"."institution_id"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."students" "target"
  WHERE (("target"."id" = "student_documents"."student_id") AND ("target"."institution_id" = "student_documents"."institution_id")))));



ALTER TABLE "public"."student_emergency_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_emergency_contacts_select_scoped" ON "public"."student_emergency_contacts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("actor"."id" = "student_emergency_contacts"."student_id") OR ("actor"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("actor"."role" = 'INSTITUTION_ADMIN'::"text") AND ("actor"."institution_id" = "student_emergency_contacts"."institution_id")))))));



ALTER TABLE "public"."student_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_notes_select_scoped" ON "public"."student_notes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("actor"."id" = "student_notes"."student_id") OR ("actor"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("actor"."role" = 'INSTITUTION_ADMIN'::"text") AND ("actor"."institution_id" = "student_notes"."institution_id")))))));



ALTER TABLE "public"."student_portal_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_portal_access_scoped" ON "public"."student_portal_access" FOR SELECT TO "authenticated" USING ((("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("actor"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("actor"."institution_id" = "student_portal_access"."institution_id")))))));



ALTER TABLE "public"."student_profile_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_profile_details_select_scoped" ON "public"."student_profile_details" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("actor"."id" = "student_profile_details"."student_id") OR ("actor"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("actor"."role" = 'INSTITUTION_ADMIN'::"text") AND ("actor"."institution_id" = "student_profile_details"."institution_id")))))));



CREATE POLICY "students_admin_manage" ON "public"."students" TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = 'INSTITUTION_ADMIN'::"text") AND ("institution_id" = "public"."current_user_institution_id"())))) WITH CHECK ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = 'INSTITUTION_ADMIN'::"text") AND ("institution_id" = "public"."current_user_institution_id"()))));



CREATE POLICY "students_select_scoped" ON "public"."students" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("institution_id" = "public"."current_user_institution_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'PROGRAM_HEAD'::"text", 'FACULTY'::"text"]))) OR (EXISTS ( SELECT 1
   FROM "public"."parent_student_relations" "psr"
  WHERE (("psr"."parent_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("psr"."student_id" = "students"."id"))))));



ALTER TABLE "public"."subject_announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subject_announcements_all" ON "public"."subject_announcements" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "subjects_select_scoped" ON "public"."subjects" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



ALTER TABLE "public"."submission_verifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "submissions_select" ON "public"."submissions" FOR SELECT TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'PROGRAM_HEAD'::"text", 'FACULTY'::"text"])) AND (EXISTS ( SELECT 1
   FROM ("public"."assignments" "a"
     JOIN "public"."subjects" "sub" ON (("sub"."id" = "a"."subject_id")))
  WHERE (("a"."id" = "submissions"."assignment_id") AND ("sub"."institution_id" = "public"."current_user_institution_id"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."parent_student_relations" "psr"
  WHERE (("psr"."parent_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("psr"."student_id" = "submissions"."student_id"))))));



CREATE POLICY "submissions_student_insert" ON "public"."submissions" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "submissions_student_update" ON "public"."submissions" FOR UPDATE TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text", 'INSTITUTION_ADMIN'::"text", 'FACULTY'::"text"]))));



CREATE POLICY "timetable_slots_manage" ON "public"."timetable_slots" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = 'SUPER_ADMIN'::"text") OR (("u"."role" = 'ORG_ADMIN'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."institutions" "i"
          WHERE (("i"."id" = "timetable_slots"."institution_id") AND ("i"."organization_id" = "u"."organization_id"))))) OR (("u"."role" = 'INSTITUTION_ADMIN'::"text") AND ("u"."institution_id" = "timetable_slots"."institution_id"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = 'SUPER_ADMIN'::"text") OR (("u"."role" = 'ORG_ADMIN'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."institutions" "i"
          WHERE (("i"."id" = "timetable_slots"."institution_id") AND ("i"."organization_id" = "u"."organization_id"))))) OR (("u"."role" = 'INSTITUTION_ADMIN'::"text") AND ("u"."institution_id" = "timetable_slots"."institution_id")))))));



CREATE POLICY "timetable_slots_select" ON "public"."timetable_slots" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."role" = 'SUPER_ADMIN'::"text") OR (("u"."role" = 'ORG_ADMIN'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."institutions" "i"
          WHERE (("i"."id" = "timetable_slots"."institution_id") AND ("i"."organization_id" = "u"."organization_id"))))) OR (("u"."role" = ANY (ARRAY['INSTITUTION_ADMIN'::"text", 'HOD'::"text", 'PROGRAM_HEAD'::"text"])) AND ("u"."institution_id" = "timetable_slots"."institution_id")) OR (("u"."role" = 'FACULTY'::"text") AND ("u"."id" = "timetable_slots"."faculty_id")) OR (("u"."role" = 'STUDENT'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."students" "s"
          WHERE (("s"."id" = "u"."id") AND ("s"."institution_id" = "timetable_slots"."institution_id") AND ("s"."section_id" = "timetable_slots"."section_id"))))) OR (("u"."role" = 'PARENT'::"text") AND (EXISTS ( SELECT 1
           FROM ("public"."parent_student_relations" "psr"
             JOIN "public"."students" "s" ON (("s"."id" = "psr"."student_id")))
          WHERE (("psr"."parent_id" = "u"."id") AND ("s"."institution_id" = "timetable_slots"."institution_id") AND ("s"."section_id" = "timetable_slots"."section_id"))))))))));



CREATE POLICY "timetable_slots_select_scoped" ON "public"."timetable_slots" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR ("institution_id" = "public"."current_user_institution_id"())));



ALTER TABLE "public"."timetable_weeks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_account_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profile_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_select_scoped" ON "public"."users" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("institution_id" IS NOT NULL) AND ("institution_id" = "public"."current_user_institution_id"()))));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."current_user_role"() = ANY (ARRAY['SUPER_ADMIN'::"text", 'ORG_ADMIN'::"text"])) OR (("public"."current_user_role"() = 'INSTITUTION_ADMIN'::"text") AND ("institution_id" = "public"."current_user_institution_id"()))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































REVOKE ALL ON FUNCTION "public"."admissions_convert_to_enrolment"("p_application_id" "uuid", "p_actor_id" "uuid", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admissions_convert_to_enrolment"("p_application_id" "uuid", "p_actor_id" "uuid", "p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admissions_generate_offer"("p_application_id" "uuid", "p_actor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admissions_generate_offer"("p_application_id" "uuid", "p_actor_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."admissions_applications" TO "service_role";
GRANT ALL ON TABLE "public"."admissions_applications" TO "anon";
GRANT ALL ON TABLE "public"."admissions_applications" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admissions_transition"("p_application_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admissions_transition"("p_application_id" "uuid", "p_new_status" "text", "p_actor_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_ingestion_jobs" TO "service_role";
GRANT SELECT ON TABLE "public"."knowledge_ingestion_jobs" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."claim_knowledge_ingestion_jobs"("p_limit" integer, "p_worker_id" "text", "p_lease_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_knowledge_ingestion_jobs"("p_limit" integer, "p_worker_id" "text", "p_lease_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_institution_id"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."fail_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text", "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fail_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text", "p_error" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finalize_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finalize_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_meeting_host"("p_meeting_id" "uuid", "p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_meeting_participant"("p_meeting_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."knowledge_ingestion_readiness"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."knowledge_ingestion_readiness"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_user_id" "uuid", "p_organization_id" "uuid", "p_institution_id" "uuid", "p_department_id" "uuid", "p_role" "text", "p_subject_ids" "uuid"[], "p_section_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_user_id" "uuid", "p_organization_id" "uuid", "p_institution_id" "uuid", "p_department_id" "uuid", "p_role" "text", "p_subject_ids" "uuid"[], "p_section_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_user_id" "uuid", "p_organization_id" "uuid", "p_institution_id" "uuid", "p_department_id" "uuid", "p_role" "text", "p_subject_ids" "uuid"[], "p_section_ids" "uuid"[], "p_embedding_profile" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "p_user_id" "uuid", "p_organization_id" "uuid", "p_institution_id" "uuid", "p_department_id" "uuid", "p_role" "text", "p_subject_ids" "uuid"[], "p_section_ids" "uuid"[], "p_embedding_profile" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."renew_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text", "p_lease_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."renew_knowledge_ingestion_job"("p_job_id" "uuid", "p_worker_id" "text", "p_lease_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_offer_letter_currency"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_offer_letter_currency"() TO "service_role";


















GRANT ALL ON TABLE "public"."academic_calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."admission_documents" TO "service_role";
GRANT ALL ON TABLE "public"."admission_documents" TO "anon";
GRANT ALL ON TABLE "public"."admission_documents" TO "authenticated";



GRANT ALL ON TABLE "public"."admission_documents_v2" TO "service_role";



GRANT ALL ON TABLE "public"."admission_fee_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."admission_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."admission_templates" TO "service_role";



GRANT ALL ON TABLE "public"."announcement_replies" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON TABLE "public"."assistant_feedback" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."assistant_feedback" TO "authenticated";



GRANT ALL ON TABLE "public"."assistant_message_sources" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."assistant_message_sources" TO "authenticated";



GRANT ALL ON TABLE "public"."assistant_messages" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."assistant_messages" TO "authenticated";



GRANT ALL ON TABLE "public"."assistant_threads" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."assistant_threads" TO "authenticated";



GRANT ALL ON TABLE "public"."assistant_tool_runs" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."assistant_tool_runs" TO "authenticated";



GRANT ALL ON TABLE "public"."attendance_records" TO "anon";
GRANT ALL ON TABLE "public"."attendance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_records" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_sessions" TO "anon";
GRANT ALL ON TABLE "public"."attendance_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_warning_letters" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."complaints" TO "anon";
GRANT ALL ON TABLE "public"."complaints" TO "authenticated";
GRANT ALL ON TABLE "public"."complaints" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."education_agents" TO "service_role";



GRANT ALL ON TABLE "public"."enrolment_timetable_slots" TO "service_role";



GRANT ALL ON TABLE "public"."enrolment_units" TO "service_role";



GRANT ALL ON TABLE "public"."enrolments" TO "service_role";



GRANT ALL ON TABLE "public"."event_registrations" TO "anon";
GRANT ALL ON TABLE "public"."event_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."faculty_subjects" TO "service_role";
GRANT ALL ON TABLE "public"."faculty_subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."faculty_subjects" TO "anon";



GRANT ALL ON TABLE "public"."files" TO "service_role";



GRANT ALL ON TABLE "public"."grade_columns" TO "service_role";
GRANT ALL ON TABLE "public"."grade_columns" TO "anon";
GRANT ALL ON TABLE "public"."grade_columns" TO "authenticated";



GRANT ALL ON TABLE "public"."grade_entries" TO "service_role";
GRANT ALL ON TABLE "public"."grade_entries" TO "anon";
GRANT ALL ON TABLE "public"."grade_entries" TO "authenticated";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."institution_timetable_settings" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."institution_timetable_settings" TO "authenticated";



GRANT ALL ON TABLE "public"."institutions" TO "anon";
GRANT ALL ON TABLE "public"."institutions" TO "authenticated";
GRANT ALL ON TABLE "public"."institutions" TO "service_role";



GRANT ALL ON TABLE "public"."intakes" TO "service_role";
GRANT ALL ON TABLE "public"."intakes" TO "anon";
GRANT ALL ON TABLE "public"."intakes" TO "authenticated";



GRANT ALL ON TABLE "public"."invoices" TO "service_role";
GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";



GRANT ALL ON TABLE "public"."job_posts" TO "anon";
GRANT ALL ON TABLE "public"."job_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."job_posts" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_chunks" TO "service_role";
GRANT SELECT ON TABLE "public"."knowledge_chunks" TO "authenticated";



GRANT ALL ON TABLE "public"."knowledge_documents" TO "service_role";
GRANT SELECT ON TABLE "public"."knowledge_documents" TO "authenticated";



GRANT ALL ON TABLE "public"."leave_applications" TO "service_role";
GRANT ALL ON TABLE "public"."leave_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_applications" TO "anon";



GRANT ALL ON TABLE "public"."meeting_messages" TO "service_role";
GRANT ALL ON TABLE "public"."meeting_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_messages" TO "anon";



GRANT ALL ON TABLE "public"."meeting_participants" TO "service_role";
GRANT ALL ON TABLE "public"."meeting_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_participants" TO "anon";



GRANT ALL ON TABLE "public"."meetings" TO "service_role";
GRANT ALL ON TABLE "public"."meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."meetings" TO "anon";



GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."notification_preferences" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."offer_letters" TO "service_role";
GRANT ALL ON TABLE "public"."offer_letters" TO "anon";
GRANT ALL ON TABLE "public"."offer_letters" TO "authenticated";



GRANT ALL ON TABLE "public"."online_session_participants" TO "anon";
GRANT ALL ON TABLE "public"."online_session_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."online_session_participants" TO "service_role";



GRANT ALL ON TABLE "public"."online_sessions" TO "anon";
GRANT ALL ON TABLE "public"."online_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."online_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."parent_student_relations" TO "anon";
GRANT ALL ON TABLE "public"."parent_student_relations" TO "authenticated";
GRANT ALL ON TABLE "public"."parent_student_relations" TO "service_role";



GRANT ALL ON TABLE "public"."payment_plans" TO "service_role";
GRANT ALL ON TABLE "public"."payment_plans" TO "anon";
GRANT ALL ON TABLE "public"."payment_plans" TO "authenticated";



GRANT ALL ON TABLE "public"."payments" TO "service_role";
GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";



GRANT ALL ON TABLE "public"."periods" TO "anon";
GRANT ALL ON TABLE "public"."periods" TO "authenticated";
GRANT ALL ON TABLE "public"."periods" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."programs" TO "anon";
GRANT ALL ON TABLE "public"."programs" TO "authenticated";
GRANT ALL ON TABLE "public"."programs" TO "service_role";



GRANT ALL ON TABLE "public"."project_groups" TO "anon";
GRANT ALL ON TABLE "public"."project_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."project_groups" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."resources" TO "anon";
GRANT ALL ON TABLE "public"."resources" TO "authenticated";
GRANT ALL ON TABLE "public"."resources" TO "service_role";



GRANT ALL ON TABLE "public"."sections" TO "anon";
GRANT ALL ON TABLE "public"."sections" TO "authenticated";
GRANT ALL ON TABLE "public"."sections" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."student_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."student_communications" TO "service_role";



GRANT ALL ON TABLE "public"."student_documents" TO "service_role";



GRANT ALL ON TABLE "public"."student_emergency_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."student_notes" TO "service_role";



GRANT ALL ON TABLE "public"."student_portal_access" TO "service_role";



GRANT ALL ON TABLE "public"."student_profile_details" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."students" TO "authenticated";



GRANT ALL ON TABLE "public"."subject_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT ALL ON TABLE "public"."submission_verifications" TO "service_role";
GRANT ALL ON TABLE "public"."submission_verifications" TO "anon";
GRANT ALL ON TABLE "public"."submission_verifications" TO "authenticated";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON TABLE "public"."timetable_slots" TO "anon";
GRANT ALL ON TABLE "public"."timetable_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."timetable_slots" TO "service_role";



GRANT ALL ON TABLE "public"."timetable_weeks" TO "service_role";
GRANT ALL ON TABLE "public"."timetable_weeks" TO "authenticated";
GRANT SELECT ON TABLE "public"."timetable_weeks" TO "anon";



GRANT ALL ON TABLE "public"."user_account_settings" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_account_settings" TO "authenticated";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_profile_details" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_profile_details" TO "authenticated";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."warning_letters" TO "service_role";
GRANT ALL ON TABLE "public"."warning_letters" TO "anon";
GRANT ALL ON TABLE "public"."warning_letters" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




























-- Existing hosted Storage policies, preserved for schema parity.
CREATE POLICY "Allow authenticated uploads" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'assignments'::text));

CREATE POLICY "Allow public read access" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'assignments'::text));

CREATE POLICY "Allow public read from resumes" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'resumes'::text));

CREATE POLICY "Allow public uploads to resumes" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK ((bucket_id = 'resumes'::text));

CREATE POLICY "Avatars authenticated delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Avatars authenticated update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Avatars authenticated upload" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'avatars'::text));

CREATE POLICY "Avatars public read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Event images authenticated delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'event-images'::text));

CREATE POLICY "Event images authenticated update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'event-images'::text));

CREATE POLICY "Event images authenticated upload" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'event-images'::text));

CREATE POLICY "Event images public read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'event-images'::text));
