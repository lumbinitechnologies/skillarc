-- Safe, synthetic local data only. No production export is used here.
-- Password for all local test accounts: LocalPass123!

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Local Auth identities. These IDs are deliberately fixed so the public
-- profile rows and relationship fixtures remain deterministic after reset.
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@skillarc.local', crypt('LocalPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Local Student"}'::jsonb, now(), now(), '', '', '', ''),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'faculty@skillarc.local', crypt('LocalPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Local Faculty"}'::jsonb, now(), now(), '', '', '', ''),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'parent@skillarc.local', crypt('LocalPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Local Parent"}'::jsonb, now(), now(), '', '', '', ''),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@skillarc.local', crypt('LocalPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Local Institution Admin"}'::jsonb, now(), now(), '', '', '', '')
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

INSERT INTO public.organizations (id, name)
VALUES ('20000000-0000-0000-0000-000000000001', 'SkillArc Local Organization')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.institutions (id, organization_id, name, domain)
VALUES ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'SkillArc Local Campus', 'skillarc.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, institution_id, name)
VALUES ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Computer Science')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.programs (id, institution_id, department_id, name)
VALUES ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'BSc Computer Science')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.intakes (id, institution_id, name, start_date, end_date)
VALUES ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '2026 Intake', '2026-01-01', '2029-12-31')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, organization_id, institution_id, department_id, name, email, role, is_active)
VALUES
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Local Student', 'student@skillarc.local', 'STUDENT', true),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Local Faculty', 'faculty@skillarc.local', 'FACULTY', true),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', NULL, 'Local Parent', 'parent@skillarc.local', 'PARENT', true),
  ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', NULL, 'Local Institution Admin', 'admin@skillarc.local', 'INSTITUTION_ADMIN', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, is_active = true;

INSERT INTO public.sections (id, institution_id, program_id, name, semester, faculty_advisor_id)
VALUES ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'CS-2026-A', 1, '10000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, institution_id, program_id, section_id, intake_id, registration_number, admission_year, semester)
VALUES ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'LOCAL-001', 2026, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff (id, institution_id, employee_id)
VALUES ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'FAC-LOCAL-001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parent_student_relations (id, parent_id, student_id, relationship)
VALUES ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Parent')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subjects (id, institution_id, name, code, semester, program_id, credits, subject_type)
VALUES ('90000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Introduction to Programming', 'CS101', 1, '50000000-0000-0000-0000-000000000001', 4, 'THEORY')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.faculty_subjects (id, institution_id, faculty_id, subject_id, section_id, semester, academic_year)
VALUES ('91000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 1, '2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.periods (id, institution_id, period_number, start_time, end_time)
VALUES ('92000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1, '09:00', '10:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.timetable_slots (id, institution_id, day, period, subject_id, faculty_id, semester, organization_id, section_id)
VALUES ('93000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'MONDAY', 1, '90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 1, '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.assignments (id, subject_id, faculty_id, title, description, due_date, max_score, type)
VALUES ('94000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Local Python Basics', 'Write a small program using functions and lists.', '2026-10-01 23:59:00', 100, 'Assignment')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.submissions (id, assignment_id, student_id, grade, feedback, status)
VALUES ('95000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 86, 'Good decomposition and clear naming.', 'graded')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (id, title, description, faculty_id)
VALUES ('96000000-0000-0000-0000-000000000001', 'Campus Navigation Assistant', 'A student project for improving campus navigation.', '10000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.project_groups (id, project_id, group_name)
VALUES ('97000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001', 'Navigation Team')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.group_members (id, group_id, student_id)
VALUES ('98000000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.announcements (id, title, content, created_by, institution_id)
VALUES ('99000000-0000-0000-0000-000000000001', 'Local testing notice', 'This is synthetic data in the isolated local environment.', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.knowledge_documents (
  id, organization_id, institution_id, department_id, owner_id, title,
  original_filename, storage_path, visibility, allowed_roles, status, document_version
)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Local Faculty Handbook', 'local-faculty-handbook.txt',
  'local/faculty-handbook-v1.txt', 'institution', ARRAY['FACULTY'], 'ready', 1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.knowledge_chunks (
  id, document_id, organization_id, institution_id, department_id,
  owner_id, visibility, allowed_roles, chunk_index, content, document_version
)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002', 'institution', ARRAY['FACULTY'], 0,
  'In the local test environment, faculty can review project teams from Dashboard > Project Groups. Arca explains the steps but never publishes a team on the faculty member''s behalf.', 1
)
ON CONFLICT (id) DO NOTHING;
