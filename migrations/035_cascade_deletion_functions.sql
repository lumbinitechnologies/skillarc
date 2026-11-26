-- ==============================================================================
-- Migration 035: Fast Database-Level Cascade Deletion Functions
-- ==============================================================================
-- Enables instantaneous, atomic cascade deletion of institutions and organizations
-- directly inside Postgres in a single transaction (50-100ms instead of dozens
-- of individual network roundtrips over HTTP).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_institution_cascade(p_institution_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.delete_organization_cascade(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
