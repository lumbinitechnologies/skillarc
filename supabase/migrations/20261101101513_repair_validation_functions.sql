-- Repair function bodies without modifying applied migration history.
BEGIN;
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
  IF actor.id IS NULL OR NOT COALESCE(actor.is_active, false) OR actor.role NOT IN ('SUPER_ADMIN','ORG_ADMIN','INSTITUTION_ADMIN') THEN
    RAISE EXCEPTION 'Enrolment conversion is not authorized' USING ERRCODE='42501';
  END IF;
  SELECT * INTO a FROM public.admissions_applications WHERE id=p_application_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Application not found' USING ERRCODE='P0002'; END IF;
  IF (actor.role = 'INSTITUTION_ADMIN' AND actor.institution_id IS DISTINCT FROM a.institution_id)
     OR (actor.role = 'ORG_ADMIN' AND NOT EXISTS (
       SELECT 1 FROM public.institutions target
       WHERE target.id = a.institution_id AND target.organization_id = actor.organization_id
     )) THEN
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
    ON CONFLICT (source_application_id) WHERE source_application_id IS NOT NULL DO NOTHING RETURNING * INTO e;
  IF e.id IS NULL THEN SELECT * INTO e FROM public.enrolments WHERE source_application_id=a.id FOR UPDATE; RETURN jsonb_build_object('enrolment',to_jsonb(e),'idempotent',true); END IF;

  FOR unit IN SELECT value FROM jsonb_array_elements(p_payload->'units') LOOP
    SELECT * INTO subject FROM public.subjects WHERE id=(unit->>'subject_id')::uuid AND program_id=requested_program AND institution_id=a.institution_id;
    IF subject.id IS NULL OR (unit->>'planned_start')::date >= (unit->>'planned_end')::date THEN RAISE EXCEPTION 'Invalid unit or planned dates' USING ERRCODE='22023'; END IF;
    INSERT INTO public.enrolment_units(enrolment_id,subject_id,planned_start,planned_end,trainer_id)
      VALUES(e.id,subject.id,(unit->>'planned_start')::date,(unit->>'planned_end')::date,COALESCE(NULLIF(unit->>'trainer_id','')::uuid,requested_trainer)) RETURNING * INTO eu;
    SELECT * INTO slot FROM public.timetable_slots WHERE id=(SELECT (value->>'slot_id')::uuid FROM jsonb_array_elements(p_payload->'timetable') value WHERE (value->>'subject_id')::uuid=subject.id LIMIT 1)
      AND section_id=requested_section AND subject_id=subject.id AND faculty_id=requested_trainer AND (institution_id=a.institution_id OR institution_id IS NULL);
    IF slot.id IS NULL THEN RAISE EXCEPTION 'Timetable slot is invalid for unit, section, or trainer' USING ERRCODE='22023'; END IF;
    INSERT INTO public.enrolment_timetable_slots(enrolment_id,enrolment_unit_id,timetable_slot_id,assigned_by) VALUES(e.id,eu.id,slot.id,p_actor_id);
  END LOOP;

  SELECT * INTO fee FROM public.admission_fee_configurations WHERE id=a.fee_configuration_id AND institution_id=a.institution_id AND program_id=requested_program AND intake_id=requested_intake AND is_active;
  SELECT * INTO offer FROM public.offer_letters WHERE application_id=a.id AND status IN ('ACCEPTED','SENT') ORDER BY version DESC LIMIT 1;
  IF fee.id IS NULL OR offer.id IS NULL THEN RAISE EXCEPTION 'Accepted offer fee configuration is required' USING ERRCODE='22023'; END IF;
  INSERT INTO public.payment_plans(student_id,institution_id,total_amount,source_application_id) VALUES(v_student_id,a.institution_id,fee.amount,a.id)
    ON CONFLICT (source_application_id) WHERE source_application_id IS NOT NULL DO UPDATE SET total_amount=EXCLUDED.total_amount RETURNING * INTO pp;
  IF pp.id IS NULL THEN SELECT * INTO pp FROM public.payment_plans WHERE source_application_id=a.id; END IF;
  installment_amount := round((fee.amount/3)::numeric,2);
  FOR i IN 1..3 LOOP
    INSERT INTO public.invoices(payment_plan_id,amount_due,due_date,status,source_application_id,installment_no)
      VALUES(pp.id,CASE WHEN i=3 THEN fee.amount-installment_amount*2 ELSE installment_amount END,start_date + ((i-1)*30),'UNPAID',a.id,i)
      ON CONFLICT (source_application_id,installment_no) WHERE source_application_id IS NOT NULL AND installment_no IS NOT NULL DO NOTHING;
  END LOOP;
  UPDATE public.admission_documents d SET student_id=v_student_id WHERE d.application_id=a.id AND d.student_id IS NULL;
  UPDATE public.admission_documents_v2 d SET student_id=v_student_id WHERE d.application_id=a.id AND d.student_id IS NULL;
  UPDATE public.admissions_applications SET status='ENROLLED',updated_at=now() WHERE id=a.id;
  INSERT INTO public.admission_status_history(application_id,institution_id,actor_id,prior_status,new_status,reason) VALUES(a.id,a.institution_id,p_actor_id,'OFFER_ACCEPTED','ENROLLED','Qualification enrolment completed');
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata) VALUES(p_actor_id,'QUALIFICATION_ENROLLED','ADMISSION_APPLICATION',a.id,jsonb_build_object('enrolment_id',e.id,'student_id',v_student_id));
  RETURN jsonb_build_object('enrolment',to_jsonb(e),'student_id',v_student_id,'payment_plan_id',pp.id,'idempotent',false);
END;
$$;

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

  IF to_regclass('public.knowledge_chunks') IS NOT NULL AND array_length(v_kdoc_ids, 1) > 0 THEN
    DELETE FROM public.knowledge_chunks WHERE document_id = ANY(v_kdoc_ids);
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
    DELETE FROM public.enrolment_timetable_slots WHERE enrolment_id = ANY(v_enrolment_ids);
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
-- These administrative functions are called only by verified server routes using
-- the service role. Preserve that boundary instead of inheriting PUBLIC execute.
REVOKE ALL ON FUNCTION public.delete_institution_cascade(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_institution_cascade(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.delete_organization_cascade(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_organization_cascade(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.admissions_convert_to_enrolment(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admissions_convert_to_enrolment(uuid, uuid, jsonb) TO service_role;
COMMIT;
