-- =============================================================
-- SkillArc Database Schema v2.2
-- Date: 2026-07-19
--
-- This is the FULL, consolidated schema reflecting the CURRENT
-- LIVE database state, i.e. v2.1 + the migration blocks that
-- have since been applied directly in the Supabase SQL editor:
--
--   - users split: student/staff-only fields moved out into
--     dedicated `students` and `staff` tables (1:1 with users.id)
--   - registration_number / employee_id uniqueness scoped to
--     (institution_id, column) instead of globally unique
--   - users.email uniqueness scoped to (organization_id, email)
--     instead of globally unique
--   - institutions.organization_id is NOT NULL
--   - `files` table added (organization/institution-scoped file
--     metadata with size_bytes, for storage analytics)
--   - `enrolments` table added (student lifecycle history,
--     separate from a student's current program/section)
--
-- This file is meant to be run top-to-bottom against a FRESH
-- database/project. It is not a migration diff — if you're
-- reconciling against an existing live DB that already has data,
-- use the earlier migration blocks instead of this file.
--
-- Instructions:
-- 1. Create a new Supabase project (or run against a fresh schema).
-- 2. Open SQL Editor.
-- 3. Run this file top to bottom.
-- 4. Do not modify existing tables/columns without discussion.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()


-- -------------------------------------------------------------
-- CORE: Organizations, Institutions, Departments, Programs
-- -------------------------------------------------------------

CREATE TABLE public.organizations (
  id           uuid NOT NULL DEFAULT uuid_generate_v4(),
  name         text NOT NULL,
  created_at   timestamp DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.institutions (
  id              uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  name            text NOT NULL,
  domain          text,
  CONSTRAINT institutions_pkey PRIMARY KEY (id),
  CONSTRAINT institutions_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

CREATE TABLE public.departments (
  id             uuid NOT NULL DEFAULT uuid_generate_v4(),
  institution_id uuid NOT NULL,
  name           text NOT NULL,
  CONSTRAINT departments_pkey PRIMARY KEY (id),
  CONSTRAINT departments_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);

CREATE TABLE public.programs (
  id             uuid NOT NULL DEFAULT uuid_generate_v4(),
  institution_id uuid NOT NULL,
  department_id  uuid,
  name           text NOT NULL,
  CONSTRAINT programs_pkey PRIMARY KEY (id),
  CONSTRAINT programs_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT programs_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);

CREATE TABLE public.intakes (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  name           text NOT NULL,
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  created_at     timestamp DEFAULT now(),
  CONSTRAINT intakes_pkey PRIMARY KEY (id),
  CONSTRAINT intakes_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);


-- -------------------------------------------------------------
-- USERS & ACCESS
-- (student/staff-only fields split into dedicated tables below)
-- -------------------------------------------------------------

CREATE TABLE public.users (
  id                 uuid NOT NULL,
  organization_id    uuid NOT NULL,
  institution_id     uuid,
  department_id      uuid,
  name               text NOT NULL,
  email              text NOT NULL,
  phone              text,
  role               text NOT NULL CHECK (role = ANY (ARRAY[
                       'SUPER_ADMIN','ORG_ADMIN','INSTITUTION_ADMIN',
                       'HOD','PROGRAM_HEAD','FACULTY','STUDENT','PARENT'
                     ])),
  is_active          boolean DEFAULT true,
  profile_image_url  text,
  created_at         timestamp DEFAULT now(),
  updated_at         timestamp DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT users_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT users_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT users_org_email_unique UNIQUE (organization_id, email)
);

CREATE TABLE public.sections (
  id                 uuid NOT NULL DEFAULT uuid_generate_v4(),
  institution_id     uuid NOT NULL,
  program_id         uuid NOT NULL,
  name               text NOT NULL,
  semester           integer NOT NULL,
  faculty_advisor_id uuid,
  CONSTRAINT sections_pkey PRIMARY KEY (id),
  CONSTRAINT sections_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT sections_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT sections_faculty_advisor_id_fkey
    FOREIGN KEY (faculty_advisor_id) REFERENCES public.users(id)
);

-- Student-only fields, 1:1 with users. institution-scoped
-- registration_number instead of globally unique.
CREATE TABLE public.students (
  id                  uuid NOT NULL,
  institution_id      uuid NOT NULL,
  program_id          uuid,
  section_id          uuid,
  intake_id           uuid,
  registration_number text,
  admission_year      integer,
  dob                 date,
  gender              text,
  semester            integer,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_id_fkey
    FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT students_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT students_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT students_section_id_fkey
    FOREIGN KEY (section_id) REFERENCES public.sections(id),
  CONSTRAINT students_intake_id_fkey
    FOREIGN KEY (intake_id) REFERENCES public.intakes(id),
  CONSTRAINT students_institution_regno_unique
    UNIQUE (institution_id, registration_number)
);

-- Profile-level supporting documents. Admissions application documents remain
-- in admission_documents because they may exist before a student is created.
CREATE TABLE public.student_documents (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id         uuid NOT NULL,
  institution_id     uuid NOT NULL,
  application_id     uuid,
  application_document_id uuid,
  category           text NOT NULL CHECK (category = ANY (ARRAY[
                       'PASSPORT','VISA','ENGLISH_EVIDENCE','ACADEMIC_DOCUMENT',
                       'SIGNED_APPLICATION','STUDENT_REQUEST_FORM',
                       'OTHER_SUPPORTING_EVIDENCE'
                     ])),
  title              text NOT NULL,
  storage_bucket     text NOT NULL,
  storage_path       text NOT NULL,
  original_filename  text NOT NULL,
  mime_type          text NOT NULL,
  size_bytes         bigint NOT NULL CHECK (size_bytes >= 0),
  checksum_sha256    text,
  version            integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status             text NOT NULL DEFAULT 'PENDING' CHECK (status = ANY (ARRAY[
                       'PENDING','APPROVED','REJECTED','EXPIRED','ARCHIVED'
                     ])),
  review_feedback    text,
  reviewed_by        uuid,
  reviewed_at        timestamptz,
  uploaded_by        uuid NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  archived_at        timestamptz,
  superseded_at      timestamptz,
  superseded_by      uuid,
  CONSTRAINT student_documents_pkey PRIMARY KEY (id),
  CONSTRAINT student_documents_student_fkey FOREIGN KEY (student_id)
    REFERENCES public.students(id) ON DELETE CASCADE,
  CONSTRAINT student_documents_institution_fkey FOREIGN KEY (institution_id)
    REFERENCES public.institutions(id) ON DELETE CASCADE,
  CONSTRAINT student_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by)
    REFERENCES public.users(id),
  CONSTRAINT student_documents_reviewed_by_fkey FOREIGN KEY (reviewed_by)
    REFERENCES public.users(id),
  CONSTRAINT student_documents_storage_path_scope_check CHECK
    (storage_path LIKE institution_id::text || '/' || student_id::text || '/%'),
  CONSTRAINT student_documents_storage_path_relative_check CHECK
    (storage_path !~ '(^/|^[A-Za-z]:|\\\\)')
);

CREATE TABLE public.education_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL, email text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.student_profile_details (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  citizenship text, country_of_birth text, passport_number text,
  passport_country text, passport_expiry date, visa_type text, visa_number text,
  visa_expiry date, english_evidence_type text, english_evidence_reference text,
  english_evidence_date date, usi text, other_identifiers jsonb,
  education_agent_id uuid REFERENCES public.education_agents(id), marketing_staff_id uuid REFERENCES public.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.student_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('RESIDENTIAL', 'POSTAL')), address_line_1 text NOT NULL,
  address_line_2 text, locality text NOT NULL, state_province text, postal_code text NOT NULL,
  country text NOT NULL, is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX student_addresses_one_current ON public.student_addresses(student_id, type) WHERE is_current;

CREATE TABLE public.student_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL, relationship text NOT NULL, email text, phone text, address text,
  priority integer NOT NULL DEFAULT 1 CHECK (priority > 0), is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX student_emergency_one_primary ON public.student_emergency_contacts(student_id) WHERE is_primary;

CREATE TABLE public.student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.users(id), body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz
);
CREATE TABLE public.student_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.users(id), summary text NOT NULL, channel text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz
);

-- Faculty/staff-only fields, 1:1 with users. institution-scoped
-- employee_id instead of globally unique.
CREATE TABLE public.staff (
  id             uuid NOT NULL,
  institution_id uuid NOT NULL,
  employee_id    text,
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_id_fkey
    FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT staff_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT staff_institution_empid_unique
    UNIQUE (institution_id, employee_id)
);

CREATE TABLE public.parent_student_relations (
  id           uuid NOT NULL DEFAULT uuid_generate_v4(),
  parent_id    uuid NOT NULL,
  student_id   uuid NOT NULL,
  relationship text,
  CONSTRAINT parent_student_relations_pkey PRIMARY KEY (id),
  CONSTRAINT parent_student_relations_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES public.users(id),
  CONSTRAINT parent_student_relations_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE public.permissions (
  id   uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_permissions (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  permission_id uuid NOT NULL,
  CONSTRAINT user_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT user_permissions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_permissions_permission_id_fkey
    FOREIGN KEY (permission_id) REFERENCES public.permissions(id),
  CONSTRAINT user_permissions_unique UNIQUE (user_id, permission_id)
);


-- -------------------------------------------------------------
-- STUDENT LIFECYCLE / ENROLMENT HISTORY
-- -------------------------------------------------------------

CREATE TABLE public.enrolments (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL,
  institution_id uuid NOT NULL,
  program_id     uuid NOT NULL,
  intake_id      uuid,
  status         text NOT NULL DEFAULT 'ENROLLED' CHECK (status = ANY (ARRAY[
                   'ENROLLED','ACTIVE','ON_LEAVE','COMPLETED','WITHDRAWN','DISCONTINUED'
                 ])),
  started_at     date NOT NULL DEFAULT CURRENT_DATE,
  ended_at       date,
  created_at     timestamp DEFAULT now(),
  CONSTRAINT enrolments_pkey PRIMARY KEY (id),
  CONSTRAINT enrolments_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT enrolments_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT enrolments_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT enrolments_intake_id_fkey
    FOREIGN KEY (intake_id) REFERENCES public.intakes(id)
);


-- -------------------------------------------------------------
-- FILE METADATA (backs storage analytics/breakdown)
-- -------------------------------------------------------------

CREATE TABLE public.files (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  institution_id  uuid,
  module          text NOT NULL,   -- e.g. 'assignments','resources','profile','admissions'
  bucket          text NOT NULL,
  file_url        text NOT NULL,
  size_bytes      bigint NOT NULL DEFAULT 0,
  uploaded_by     uuid,
  entity_type     text,            -- e.g. 'assignment','submission','user'
  entity_id       uuid,
  created_at      timestamp DEFAULT now(),
  CONSTRAINT files_pkey PRIMARY KEY (id),
  CONSTRAINT files_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT files_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT files_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);


-- -------------------------------------------------------------
-- ACADEMIC: Subjects, Faculty Assignments, Timetable, Periods
-- -------------------------------------------------------------

CREATE TABLE public.subjects (
  id             uuid NOT NULL DEFAULT uuid_generate_v4(),
  institution_id uuid,
  name           text,
  code           text,
  semester       integer,
  program_id     uuid,
  credits        integer,
  subject_type   text CHECK (subject_type = ANY (ARRAY['THEORY','LAB','ELECTIVE'])),
  CONSTRAINT subjects_pkey PRIMARY KEY (id),
  CONSTRAINT subjects_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT subjects_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs(id)
);

CREATE TABLE public.faculty_subjects (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  faculty_id     uuid NOT NULL,
  subject_id     uuid NOT NULL,
  section_id     uuid,
  semester       integer,
  academic_year  text,
  created_at     timestamp with time zone DEFAULT now(),
  CONSTRAINT faculty_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT faculty_subjects_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT faculty_subjects_faculty_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES public.users(id),
  CONSTRAINT faculty_subjects_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id),
  CONSTRAINT faculty_subjects_section_id_fkey
    FOREIGN KEY (section_id) REFERENCES public.sections(id)
);

CREATE TABLE public.timetable_slots (
  id              uuid NOT NULL DEFAULT uuid_generate_v4(),
  institution_id  uuid,
  day             text,
  period          integer,
  subject_id      uuid,
  faculty_id      uuid,
  semester        integer,
  organization_id uuid,
  section_id      uuid,
  CONSTRAINT timetable_slots_pkey PRIMARY KEY (id),
  CONSTRAINT timetable_slots_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT timetable_slots_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id),
  CONSTRAINT timetable_slots_teacher_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES public.users(id),
  CONSTRAINT timetable_slots_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT timetable_slots_section_id_fkey
    FOREIGN KEY (section_id) REFERENCES public.sections(id)
);

CREATE TABLE public.periods (
  id             uuid NOT NULL DEFAULT uuid_generate_v4(),
  institution_id uuid,
  period_number  integer NOT NULL,
  start_time     time NOT NULL,
  end_time       time NOT NULL,
  CONSTRAINT periods_pkey PRIMARY KEY (id),
  CONSTRAINT periods_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);


-- -------------------------------------------------------------
-- ATTENDANCE
-- -------------------------------------------------------------

CREATE TABLE public.attendance_sessions (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id      uuid,
  faculty_id      uuid,
  section_id      uuid,
  attendance_date date NOT NULL,
  period          integer NOT NULL,
  CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_sessions_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id),
  CONSTRAINT attendance_sessions_faculty_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES public.users(id),
  CONSTRAINT attendance_sessions_section_id_fkey
    FOREIGN KEY (section_id) REFERENCES public.sections(id)
);

CREATE TABLE public.attendance_records (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  student_id uuid,
  status     text NOT NULL CHECK (status = ANY (ARRAY['PRESENT','ABSENT','LATE'])),
  CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_records_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id),
  CONSTRAINT attendance_records_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.users(id)
);


-- -------------------------------------------------------------
-- ASSIGNMENTS & SUBMISSIONS
-- -------------------------------------------------------------

CREATE TABLE public.assignments (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id  uuid,
  faculty_id  uuid,
  title       text NOT NULL,
  description text,
  due_date    timestamp,
  created_at  timestamp DEFAULT now(),
  updated_at  timestamp DEFAULT now(),
  type        text DEFAULT 'Assignment',
  max_score   numeric DEFAULT 100,
  questions   jsonb,
  language    text,
  test_cases  jsonb,
  section_ids uuid[],   -- TODO: migrate to assignment_sections junction table
  files       text[],   -- TODO: migrate to assignment_files junction table -> public.files
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id),
  CONSTRAINT assignments_faculty_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES public.users(id)
);

CREATE TABLE public.submissions (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid,
  student_id    uuid,
  file_url      text,
  submitted_at  timestamp DEFAULT now(),
  grade         numeric,
  feedback      text,
  quiz_answers  jsonb,
  code_content  text,
  language      text,
  status        text DEFAULT 'pending' CHECK (status = ANY (ARRAY[
                  'pending','graded','late','resubmitted'
                ])),
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_assignment_id_fkey
    FOREIGN KEY (assignment_id) REFERENCES public.assignments(id),
  CONSTRAINT submissions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.users(id)
);

CREATE TABLE public.submission_verifications (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id   uuid NOT NULL,
  plagiarism_rate numeric DEFAULT 0.00,
  ai_probability  numeric DEFAULT 0.00,
  status          text NOT NULL DEFAULT 'CLEAN',
  verified_at     timestamp DEFAULT now(),
  CONSTRAINT submission_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT submission_verifications_submission_id_fkey
    FOREIGN KEY (submission_id) REFERENCES public.submissions(id)
);


-- -------------------------------------------------------------
-- RESOURCES & ONLINE SESSIONS
-- -------------------------------------------------------------

CREATE TABLE public.resources (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id  uuid,
  faculty_id  uuid,
  title       text NOT NULL,
  file_url    text NOT NULL,
  uploaded_at timestamp DEFAULT now(),
  CONSTRAINT resources_pkey PRIMARY KEY (id),
  CONSTRAINT resources_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id),
  CONSTRAINT resources_faculty_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES public.users(id)
);

CREATE TABLE public.online_sessions (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  description    text,
  host_id        uuid,
  institution_id uuid,
  session_link   text NOT NULL,
  start_time     timestamp NOT NULL,
  end_time       timestamp,
  created_at     timestamp DEFAULT now(),
  CONSTRAINT online_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT online_sessions_host_id_fkey
    FOREIGN KEY (host_id) REFERENCES public.users(id),
  CONSTRAINT online_sessions_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);

CREATE TABLE public.online_session_participants (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  user_id    uuid,
  joined_at  timestamp,
  left_at    timestamp,
  CONSTRAINT online_session_participants_pkey PRIMARY KEY (id),
  CONSTRAINT online_session_participants_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.online_sessions(id),
  CONSTRAINT online_session_participants_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
);


-- -------------------------------------------------------------
-- PROJECTS
-- -------------------------------------------------------------

CREATE TABLE public.projects (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  faculty_id  uuid,
  created_at  timestamp DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_faculty_id_fkey
    FOREIGN KEY (faculty_id) REFERENCES public.users(id)
);

CREATE TABLE public.project_groups (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  group_name text NOT NULL,
  CONSTRAINT project_groups_pkey PRIMARY KEY (id),
  CONSTRAINT project_groups_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id)
);

CREATE TABLE public.group_members (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id   uuid,
  student_id uuid,
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES public.project_groups(id),
  CONSTRAINT group_members_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.users(id)
);


-- -------------------------------------------------------------
-- EVENTS & ANNOUNCEMENTS
-- -------------------------------------------------------------

CREATE TABLE public.events (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid,
  title          text NOT NULL,
  description    text,
  event_date     timestamp,
  venue          text,
  created_by     uuid,
  created_at     timestamp DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT events_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.event_registrations (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id      uuid,
  user_id       uuid,
  registered_at timestamp DEFAULT now(),
  CONSTRAINT event_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT event_registrations_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_registrations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.announcements (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  content        text NOT NULL,
  created_by     uuid,
  institution_id uuid,
  created_at     timestamp DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT announcements_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);


-- -------------------------------------------------------------
-- PLACEMENTS
-- -------------------------------------------------------------

CREATE TABLE public.companies (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  website     text,
  description text,
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);

CREATE TABLE public.job_posts (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id  uuid,
  title       text NOT NULL,
  description text,
  deadline    date,
  CONSTRAINT job_posts_pkey PRIMARY KEY (id),
  CONSTRAINT job_posts_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

CREATE TABLE public.applications (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  job_post_id uuid,
  student_id  uuid,
  status      text DEFAULT 'APPLIED' CHECK (status = ANY (ARRAY[
                'APPLIED','SHORTLISTED','REJECTED','SELECTED','WITHDRAWN'
              ])),
  resume_url  text,
  CONSTRAINT applications_pkey PRIMARY KEY (id),
  CONSTRAINT applications_job_post_id_fkey
    FOREIGN KEY (job_post_id) REFERENCES public.job_posts(id),
  CONSTRAINT applications_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.users(id)
);


-- -------------------------------------------------------------
-- COMPLAINTS, NOTIFICATIONS, AUDIT
-- -------------------------------------------------------------

CREATE TABLE public.complaints (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id  uuid,
  title       text NOT NULL,
  description text,
  status      text DEFAULT 'OPEN' CHECK (status = ANY (ARRAY[
                'OPEN','IN_PROGRESS','RESOLVED','CLOSED'
              ])),
  created_at  timestamp DEFAULT now(),
  CONSTRAINT complaints_pkey PRIMARY KEY (id),
  CONSTRAINT complaints_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.users(id)
);

CREATE TABLE public.notifications (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid,
  title      text NOT NULL,
  message    text NOT NULL,
  is_read    boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.audit_logs (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamp DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id)
);


-- -------------------------------------------------------------
-- LEAVE APPLICATIONS
-- -------------------------------------------------------------

CREATE TABLE public.leave_applications (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL,
  section_id     uuid,
  advisor_id     uuid,
  status         text NOT NULL DEFAULT 'PENDING' CHECK (status = ANY (ARRAY[
                   'PENDING','APPROVED','REJECTED'
                 ])),
  reason         text,
  notes          text,
  created_at     timestamp DEFAULT now(),
  updated_at     timestamp DEFAULT now(),
  institution_id uuid,
  from_date      date NOT NULL,
  to_date        date NOT NULL,
  approved_at    timestamp,
  approved_by    uuid,
  CONSTRAINT leave_applications_pkey PRIMARY KEY (id),
  CONSTRAINT leave_applications_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES public.users(id),
  CONSTRAINT leave_applications_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT leave_applications_advisor_id_fkey
    FOREIGN KEY (advisor_id) REFERENCES public.users(id),
  CONSTRAINT leave_applications_section_id_fkey
    FOREIGN KEY (section_id) REFERENCES public.sections(id),
  CONSTRAINT leave_applications_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.users(id)
);


-- -------------------------------------------------------------
-- MEETINGS
-- -------------------------------------------------------------

CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL
    REFERENCES public.institutions(id) ON DELETE CASCADE,
  timetable_slot_id uuid
    REFERENCES public.timetable_slots(id) ON DELETE SET NULL,
  subject_id uuid
    REFERENCES public.subjects(id) ON DELETE CASCADE,
  section_id uuid
    REFERENCES public.sections(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  meeting_code text UNIQUE NOT NULL,
  title text NOT NULL,
  meeting_provider text NOT NULL DEFAULT 'daily'
    CHECK (meeting_provider IN ('daily','livekit','jitsi','zoom')),
  meeting_type text NOT NULL DEFAULT 'instant'
    CHECK (meeting_type IN ('instant','scheduled')),
  meeting_url text,
  is_active boolean DEFAULT true,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL
    REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  is_present boolean DEFAULT true,
  UNIQUE(meeting_id, user_id)
);

CREATE TABLE public.meeting_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL
    REFERENCES public.meetings(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL
    REFERENCES public.institutions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  message text NOT NULL,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);


-- -------------------------------------------------------------
-- ADMISSIONS
-- -------------------------------------------------------------

CREATE TABLE public.admissions_applications (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  email          text NOT NULL,
  phone          text,
  program_id     uuid,
  status         text NOT NULL DEFAULT 'APPLIED' CHECK (status = ANY (ARRAY[
                   'APPLIED','UNDER_REVIEW','APPROVED','REJECTED',
                   'OFFER_SENT','OFFER_ACCEPTED','ENROLLED'
                 ])),
  created_at     timestamp DEFAULT now(),
  CONSTRAINT admissions_applications_pkey PRIMARY KEY (id),
  CONSTRAINT admissions_applications_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT admissions_applications_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs(id)
);

CREATE TABLE public.admission_documents (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  document_name  text NOT NULL,
  file_url       text NOT NULL,
  status         text NOT NULL DEFAULT 'PENDING' CHECK (status = ANY (ARRAY[
                   'PENDING','APPROVED','REJECTED'
                 ])),
  reviewed_at    timestamp,
  feedback       text,
  CONSTRAINT admission_documents_pkey PRIMARY KEY (id),
  CONSTRAINT admission_documents_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES public.admissions_applications(id)
);

ALTER TABLE public.student_documents
  ADD CONSTRAINT student_documents_application_fkey FOREIGN KEY (application_id)
    REFERENCES public.admissions_applications(id) ON DELETE SET NULL,
  ADD CONSTRAINT student_documents_application_document_fkey FOREIGN KEY (application_document_id)
    REFERENCES public.admission_documents(id) ON DELETE SET NULL,
  ADD CONSTRAINT student_documents_superseded_by_fkey FOREIGN KEY (superseded_by)
    REFERENCES public.student_documents(id);

CREATE TABLE public.offer_letters (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  course_fees    numeric NOT NULL DEFAULT 0.00,
  currency       text NOT NULL DEFAULT 'AUD',
  term_start     date NOT NULL,
  signature_url  text,
  signed_at      timestamp,
  status         text NOT NULL DEFAULT 'SENT' CHECK (status = ANY (ARRAY[
                   'SENT','ACCEPTED','DECLINED','EXPIRED'
                 ])),
  created_at     timestamp DEFAULT now(),
  CONSTRAINT offer_letters_pkey PRIMARY KEY (id),
  CONSTRAINT offer_letters_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES public.admissions_applications(id)
);


-- -------------------------------------------------------------
-- WARNING LETTERS
-- -------------------------------------------------------------

CREATE TABLE public.warning_letters (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL,
  institution_id  uuid NOT NULL,
  current_rate    numeric NOT NULL,
  level           text NOT NULL,
  sent_at         timestamp DEFAULT now(),
  signed_by_admin text,
  CONSTRAINT warning_letters_pkey PRIMARY KEY (id),
  CONSTRAINT warning_letters_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT warning_letters_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);


-- -------------------------------------------------------------
-- FEES / PAYMENTS
-- -------------------------------------------------------------

CREATE TABLE public.payment_plans (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL,
  institution_id uuid NOT NULL,
  total_amount   numeric NOT NULL DEFAULT 0.00,
  created_at     timestamp DEFAULT now(),
  CONSTRAINT payment_plans_pkey PRIMARY KEY (id),
  CONSTRAINT payment_plans_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT payment_plans_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);

CREATE TABLE public.invoices (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_plan_id uuid NOT NULL,
  amount_due      numeric NOT NULL,
  due_date        date NOT NULL,
  status          text NOT NULL DEFAULT 'UNPAID' CHECK (status = ANY (ARRAY[
                    'UNPAID','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED'
                  ])),
  created_at      timestamp DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_payment_plan_id_fkey
    FOREIGN KEY (payment_plan_id) REFERENCES public.payment_plans(id)
);

CREATE TABLE public.payments (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id     uuid NOT NULL,
  amount_paid    numeric NOT NULL,
  paid_at        timestamp DEFAULT now(),
  payment_method text NOT NULL,
  reference_no   text,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
);


-- ===========================================
-- INDEXES
-- ===========================================

CREATE INDEX idx_faculty_subjects_faculty ON public.faculty_subjects(faculty_id);
CREATE INDEX idx_faculty_subjects_subject ON public.faculty_subjects(subject_id);
CREATE INDEX idx_faculty_subjects_section ON public.faculty_subjects(section_id);
CREATE INDEX idx_faculty_subjects_institution ON public.faculty_subjects(institution_id);

CREATE INDEX idx_meetings_faculty ON public.meetings(faculty_id);
CREATE INDEX idx_meetings_section ON public.meetings(section_id);
CREATE INDEX idx_meetings_subject ON public.meetings(subject_id);
CREATE INDEX idx_meetings_slot ON public.meetings(timetable_slot_id);

CREATE INDEX idx_participants_meeting ON public.meeting_participants(meeting_id);
CREATE INDEX idx_participants_user ON public.meeting_participants(user_id);

CREATE INDEX idx_student_documents_student
  ON public.student_documents(student_id, created_at DESC);
CREATE INDEX idx_student_documents_institution_category
  ON public.student_documents(institution_id, category, created_at DESC);
CREATE INDEX idx_student_documents_status
  ON public.student_documents(institution_id, status);
CREATE UNIQUE INDEX idx_student_documents_version
  ON public.student_documents(student_id, category, title, version);

CREATE INDEX idx_messages_meeting ON public.meeting_messages(meeting_id);

CREATE INDEX idx_admissions_applications_institution ON public.admissions_applications(institution_id);
CREATE INDEX idx_admission_documents_application ON public.admission_documents(application_id);
CREATE INDEX idx_offer_letters_application ON public.offer_letters(application_id);
CREATE INDEX idx_submission_verifications_submission ON public.submission_verifications(submission_id);
CREATE INDEX idx_warning_letters_student ON public.warning_letters(student_id);
CREATE INDEX idx_payment_plans_student ON public.payment_plans(student_id);
CREATE INDEX idx_invoices_payment_plan ON public.invoices(payment_plan_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);

-- NEW in v2.2
CREATE INDEX idx_students_institution ON public.students(institution_id);
CREATE INDEX idx_students_program ON public.students(program_id);
CREATE INDEX idx_students_section ON public.students(section_id);
CREATE INDEX idx_students_intake ON public.students(intake_id);

CREATE INDEX idx_staff_institution ON public.staff(institution_id);

CREATE INDEX idx_files_org_module ON public.files(organization_id, module);
CREATE INDEX idx_files_institution ON public.files(institution_id);
CREATE INDEX idx_files_entity ON public.files(entity_type, entity_id);

CREATE INDEX idx_enrolments_student ON public.enrolments(student_id);
CREATE INDEX idx_enrolments_institution ON public.enrolments(institution_id);
CREATE INDEX idx_enrolments_program ON public.enrolments(program_id);
CREATE INDEX idx_enrolments_status ON public.enrolments(status);


-- ===========================================
-- ENABLE RLS
-- ===========================================

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_messages ENABLE ROW LEVEL SECURITY;

-- NOTE: Most other tables (including the new students, staff,
-- files, and enrolments tables) have NO RLS policy defined yet.
-- Given every row here carries an institution_id/organization_id,
-- add tenant-scoped RLS policies before relying on this in
-- production — the current "temp development policies" below
-- allow any authenticated user full access to meetings tables,
-- which is not safe to ship as-is either.


-- ===========================================
-- TEMP DEVELOPMENT POLICIES
-- (Replace later with proper tenant-scoped policies)
-- ===========================================

CREATE POLICY "meetings_all"
ON public.meetings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "participants_all"
ON public.meeting_participants
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "messages_all"
ON public.meeting_messages
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =============================================================
--  END OF SCHEMA (42 tables total)
-- =============================================================
