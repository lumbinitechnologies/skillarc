BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(56);

SELECT is((SELECT count(*)::integer
  FROM pg_class AS relation
  JOIN pg_namespace AS schema ON schema.oid = relation.relnamespace
  WHERE schema.nspname = 'public' AND relation.relkind = 'r' AND NOT relation.relrowsecurity),
  0, 'every public table has row-level security enabled');
SELECT ok(EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'assignments_student_upload_own_folder'), 'student uploads use an owned folder');
SELECT ok(EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'assignments_faculty_upload_own_folder'), 'faculty uploads use an owned folder');
SELECT ok(EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'resumes_owner_select'), 'resume downloads are owner scoped');
SELECT ok(EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'resumes_owner_insert'), 'resume uploads are owner scoped');
SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND cmd = 'SELECT' AND 'public' = ANY(roles)
    AND qual LIKE '%assignments%'
), 'assignment files have no public read policy');
SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND cmd = 'SELECT' AND 'public' = ANY(roles)
    AND qual LIKE '%resumes%'
), 'resumes have no public read policy');

INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments', 'assignments', false), ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;
SELECT is((SELECT public FROM storage.buckets WHERE id = 'assignments'), false, 'assignment bucket is private');
SELECT is((SELECT public FROM storage.buckets WHERE id = 'resumes'), false, 'resume bucket is private');
INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
  ('resumes', 'resumes/94000000-0000-4000-8000-000000000023/existing_resume.pdf', '94000000-0000-4000-8000-000000000023');

INSERT INTO public.organizations (id, name) VALUES
  ('94000000-0000-4000-8000-000000000001', 'Synthetic A'),
  ('94000000-0000-4000-8000-000000000002', 'Synthetic B');
INSERT INTO public.institutions (id, organization_id, name) VALUES
  ('94000000-0000-4000-8000-000000000011', '94000000-0000-4000-8000-000000000001', 'Synthetic campus A'),
  ('94000000-0000-4000-8000-000000000012', '94000000-0000-4000-8000-000000000002', 'Synthetic campus B');
INSERT INTO public.users (id, role, organization_id, institution_id, is_active) VALUES
  ('94000000-0000-4000-8000-000000000021', 'ORG_ADMIN', '94000000-0000-4000-8000-000000000001', NULL, true),
  ('94000000-0000-4000-8000-000000000022', 'STUDENT', '94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000011', true),
  ('94000000-0000-4000-8000-000000000023', 'STUDENT', '94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000011', true),
  ('94000000-0000-4000-8000-000000000024', 'FACULTY', '94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000011', true),
  ('94000000-0000-4000-8000-000000000025', 'PARENT', '94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000011', true),
  ('94000000-0000-4000-8000-000000000026', 'STUDENT', '94000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000012', true),
  ('94000000-0000-4000-8000-000000000027', 'FACULTY', '94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000011', true),
  ('94000000-0000-4000-8000-000000000028', 'STUDENT', '94000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000011', true);
INSERT INTO public.programs (id, name, institution_id, organization_id) VALUES
  ('94000000-0000-4000-8000-000000000030', 'Synthetic program A', '94000000-0000-4000-8000-000000000011', '94000000-0000-4000-8000-000000000001'),
  ('94000000-0000-4000-8000-000000000031', 'Synthetic program B', '94000000-0000-4000-8000-000000000012', '94000000-0000-4000-8000-000000000002');
INSERT INTO public.sections (id, name, semester, program_id, institution_id) VALUES
  ('94000000-0000-4000-8000-000000000032', 'Synthetic section A', 1, '94000000-0000-4000-8000-000000000030', '94000000-0000-4000-8000-000000000011'),
  ('94000000-0000-4000-8000-000000000033', 'Synthetic section B', 1, '94000000-0000-4000-8000-000000000031', '94000000-0000-4000-8000-000000000012'),
  ('94000000-0000-4000-8000-000000000045', 'Synthetic section A2', 1, '94000000-0000-4000-8000-000000000030', '94000000-0000-4000-8000-000000000011');
INSERT INTO public.timetable_weeks (id, institution_id, section_id, semester, week_number, start_date, end_date) VALUES
  ('94000000-0000-4000-8000-000000000050', '94000000-0000-4000-8000-000000000011', '94000000-0000-4000-8000-000000000032', 1, 1, CURRENT_DATE, CURRENT_DATE + 6),
  ('94000000-0000-4000-8000-000000000051', '94000000-0000-4000-8000-000000000011', '94000000-0000-4000-8000-000000000045', 1, 2, CURRENT_DATE + 7, CURRENT_DATE + 13);
INSERT INTO public.students (id, institution_id, program_id, section_id) VALUES
  ('94000000-0000-4000-8000-000000000022', '94000000-0000-4000-8000-000000000011', '94000000-0000-4000-8000-000000000030', '94000000-0000-4000-8000-000000000032'),
  ('94000000-0000-4000-8000-000000000023', '94000000-0000-4000-8000-000000000011', '94000000-0000-4000-8000-000000000030', '94000000-0000-4000-8000-000000000032'),
  ('94000000-0000-4000-8000-000000000028', '94000000-0000-4000-8000-000000000011', '94000000-0000-4000-8000-000000000030', '94000000-0000-4000-8000-000000000032'),
  ('94000000-0000-4000-8000-000000000026', '94000000-0000-4000-8000-000000000012', '94000000-0000-4000-8000-000000000031', '94000000-0000-4000-8000-000000000033');
INSERT INTO public.subjects (id, institution_id, name, code, program_id) VALUES
  ('94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000011', 'Synthetic course A', 'SYN-A', '94000000-0000-4000-8000-000000000030'),
  ('94000000-0000-4000-8000-000000000042', '94000000-0000-4000-8000-000000000011', 'Unrelated course in same program', 'SYN-A2', '94000000-0000-4000-8000-000000000030'),
  ('94000000-0000-4000-8000-000000000035', '94000000-0000-4000-8000-000000000012', 'Synthetic course B', 'SYN-B', '94000000-0000-4000-8000-000000000031');
INSERT INTO public.faculty_subjects (id, institution_id, faculty_id, subject_id, section_id) VALUES
  ('94000000-0000-4000-8000-000000000036', '94000000-0000-4000-8000-000000000011', '94000000-0000-4000-8000-000000000024', '94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000032');
INSERT INTO public.assignments (id, subject_id, faculty_id, title, type, section_ids, questions, test_cases) VALUES
  ('94000000-0000-4000-8000-000000000037', '94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000024', 'Synthetic quiz', 'Quiz', ARRAY['94000000-0000-4000-8000-000000000032'::uuid], '[{"q":"Synthetic question","options":["A","B"],"answer":1}]', '[{"input":"1","output":"2"}]'),
  ('94000000-0000-4000-8000-000000000044', '94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000024', 'Course-wide task', 'Assignment', NULL, NULL, NULL),
  ('94000000-0000-4000-8000-000000000043', '94000000-0000-4000-8000-000000000042', '94000000-0000-4000-8000-000000000024', 'Unrelated course task', 'Assignment', NULL, NULL, NULL),
  ('94000000-0000-4000-8000-000000000046', '94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000024', 'Task for another section', 'Assignment', ARRAY['94000000-0000-4000-8000-000000000045'::uuid], NULL, NULL),
  ('94000000-0000-4000-8000-000000000041', '94000000-0000-4000-8000-000000000035', '94000000-0000-4000-8000-000000000027', 'Synthetic quiz B', 'Quiz', ARRAY['94000000-0000-4000-8000-000000000033'::uuid], '[{"q":"Other question","options":["A","B"],"answer":0}]', '[]');
INSERT INTO public.enrolments (id, student_id, institution_id, program_id, status, section_id) VALUES
  ('94000000-0000-4000-8000-000000000047', '94000000-0000-4000-8000-000000000028', '94000000-0000-4000-8000-000000000011', '94000000-0000-4000-8000-000000000030', 'ACTIVE', '94000000-0000-4000-8000-000000000032'),
  ('94000000-0000-4000-8000-000000000038', '94000000-0000-4000-8000-000000000023', '94000000-0000-4000-8000-000000000011', '94000000-0000-4000-8000-000000000030', 'WITHDRAWN', '94000000-0000-4000-8000-000000000032');
INSERT INTO public.enrolment_units (id, enrolment_id, subject_id, planned_start, planned_end, status) VALUES
  ('94000000-0000-4000-8000-000000000048', '94000000-0000-4000-8000-000000000047', '94000000-0000-4000-8000-000000000034', CURRENT_DATE - 30, CURRENT_DATE + 30, 'ACTIVE');
INSERT INTO public.grade_columns (id, subject_id, created_by, title) VALUES
  ('94000000-0000-4000-8000-000000000039', '94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000024', 'Synthetic grade');
INSERT INTO public.attendance_sessions (id, subject_id, faculty_id, section_id, attendance_date, period) VALUES
  ('94000000-0000-4000-8000-000000000040', '94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000024', '94000000-0000-4000-8000-000000000032', CURRENT_DATE, 1);
INSERT INTO public.parent_student_relations (parent_id, student_id, relationship) VALUES
  ('94000000-0000-4000-8000-000000000025', '94000000-0000-4000-8000-000000000022', 'guardian'),
  ('94000000-0000-4000-8000-000000000025', '94000000-0000-4000-8000-000000000026', 'invalid cross-campus link');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000022', true);
SELECT set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000022","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.users WHERE id = '94000000-0000-4000-8000-000000000022'), 1, 'authenticated user can read own profile');
SELECT is((SELECT count(*)::integer FROM public.users WHERE id = '94000000-0000-4000-8000-000000000026'), 0, 'student cannot read another tenant user');
SELECT ok(NOT has_column_privilege('authenticated', 'public.assignments', 'questions', 'SELECT'), 'authenticated clients cannot read quiz answer keys');
SELECT ok(NOT has_column_privilege('authenticated', 'public.assignments', 'test_cases', 'SELECT'), 'authenticated clients cannot read coding expectations');
SELECT ok(NOT has_table_privilege('anon', 'public.submissions', 'SELECT'), 'anonymous callers cannot read submissions');
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000037'), 1, 'student fallback section grants its assigned course');
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000044'), 1, 'course-wide tasks are visible through the section course relationship');
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000043'), 0, 'same-program course without a section relationship stays hidden');
SELECT is((SELECT count(*)::integer FROM public.subjects WHERE id = '94000000-0000-4000-8000-000000000042'), 0, 'student cannot list every course in their program');
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000046'), 0, 'fallback cannot read a task targeted to a different section');
SELECT is((SELECT count(*)::integer FROM public.timetable_weeks WHERE id = '94000000-0000-4000-8000-000000000050'), 1, 'fallback student can read their validated section week');
SELECT is((SELECT count(*)::integer FROM public.timetable_weeks WHERE id = '94000000-0000-4000-8000-000000000051'), 0, 'fallback student cannot read another section week');
SELECT throws_ok($sql$INSERT INTO public.assignments (subject_id, faculty_id, title, type, section_ids)
  VALUES ('94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000022', 'Forged assignment', 'Assignment', ARRAY['94000000-0000-4000-8000-000000000032'::uuid])$sql$,
  '42501', NULL, 'student cannot create assignments');
SELECT lives_ok($sql$INSERT INTO public.submissions (assignment_id, student_id, quiz_answers, status)
  VALUES ('94000000-0000-4000-8000-000000000037', '94000000-0000-4000-8000-000000000022', '[1]', 'pending')$sql$,
  'student can submit their own authorized course work');
SELECT throws_ok($sql$UPDATE public.submissions SET grade = 100 WHERE assignment_id = '94000000-0000-4000-8000-000000000037' AND student_id = '94000000-0000-4000-8000-000000000022'$sql$,
  '42501', NULL, 'student cannot change their grade');
SELECT throws_ok($sql$INSERT INTO public.submissions (assignment_id, student_id, grade, feedback, status)
  VALUES ('94000000-0000-4000-8000-000000000037', '94000000-0000-4000-8000-000000000022', 100, 'forged', 'graded')$sql$,
  '42501', NULL, 'student cannot set a grade on insert');
SELECT is((SELECT count(*)::integer FROM public.submissions WHERE student_id = '94000000-0000-4000-8000-000000000023'), 0, 'student cannot read a withdrawn peer submission');
SELECT lives_ok($sql$INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('assignments', '94000000-0000-4000-8000-000000000022/student_work.pdf', '94000000-0000-4000-8000-000000000022')$sql$,
  'student can upload under own id');
SELECT throws_ok($sql$INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('assignments', '94000000-0000-4000-8000-000000000023/other_student.pdf', '94000000-0000-4000-8000-000000000022')$sql$,
  '42501', NULL, 'student cannot upload into another student folder');
SELECT lives_ok($sql$INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('resumes', 'resumes/94000000-0000-4000-8000-000000000022/new_resume.pdf', '94000000-0000-4000-8000-000000000022')$sql$,
  'student can upload own resume');
SELECT is((SELECT count(*)::integer FROM storage.objects
  WHERE bucket_id = 'resumes' AND name = 'resumes/94000000-0000-4000-8000-000000000023/existing_resume.pdf'),
  0, 'student cannot list another owner resume');
SELECT is((SELECT count(*)::integer FROM storage.objects
  WHERE bucket_id = 'resumes' AND name = 'resumes/94000000-0000-4000-8000-000000000022/new_resume.pdf'),
  1, 'student can read own resume');
SELECT throws_ok($sql$INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('resumes', 'resumes/94000000-0000-4000-8000-000000000023/forged.pdf', '94000000-0000-4000-8000-000000000022')$sql$,
  '42501', NULL, 'student cannot upload a resume under another owner');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000024', true);
SELECT set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000024","role":"authenticated"}', true);
SELECT lives_ok($sql$INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('assignments', 'faculty-94000000-0000-4000-8000-000000000024/course_resource.pdf', '94000000-0000-4000-8000-000000000024')$sql$,
  'faculty can upload under own faculty folder');
SELECT throws_ok($sql$INSERT INTO storage.objects (bucket_id, name, owner_id)
  VALUES ('assignments', 'faculty-94000000-0000-4000-8000-000000000022/forged_resource.pdf', '94000000-0000-4000-8000-000000000024')$sql$,
  '42501', NULL, 'faculty cannot upload under another user folder');
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000037'), 1, 'assigned faculty can read course assignments');
SELECT lives_ok($sql$INSERT INTO public.assignments (subject_id, faculty_id, title, type, section_ids)
  VALUES ('94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000024', 'Faculty assignment', 'Assignment', ARRAY['94000000-0000-4000-8000-000000000032'::uuid])$sql$,
  'assigned faculty can create a course assignment');
SELECT lives_ok($sql$INSERT INTO public.attendance_sessions (subject_id, faculty_id, section_id, attendance_date, period)
  VALUES ('94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000024', '94000000-0000-4000-8000-000000000032', CURRENT_DATE, 2)$sql$,
  'assigned faculty can create an attendance session');
SELECT lives_ok($sql$INSERT INTO public.attendance_records (session_id, student_id, status)
  VALUES ('94000000-0000-4000-8000-000000000040', '94000000-0000-4000-8000-000000000022', 'PRESENT')$sql$,
  'faculty can mark a student in the session roster');
SELECT lives_ok($sql$INSERT INTO public.grade_columns (subject_id, created_by, title)
  VALUES ('94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000024', 'Faculty grade')$sql$,
  'assigned faculty can create a grade column');
SELECT lives_ok($sql$INSERT INTO public.grade_entries (column_id, student_id, score, graded_by)
  VALUES ('94000000-0000-4000-8000-000000000039', '94000000-0000-4000-8000-000000000022', 9, '94000000-0000-4000-8000-000000000024')$sql$,
  'assigned faculty can grade a student in the assigned section');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000027', true);
SELECT set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000027","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000037'), 0, 'unassigned faculty cannot read another faculty course');
SELECT throws_ok($sql$INSERT INTO public.assignments (subject_id, faculty_id, title, type, section_ids)
  VALUES ('94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000027', 'Unassigned assignment', 'Assignment', ARRAY['94000000-0000-4000-8000-000000000032'::uuid])$sql$,
  '42501', NULL, 'unassigned faculty cannot create course assignments');
SELECT throws_ok($sql$INSERT INTO public.attendance_sessions (subject_id, faculty_id, section_id, attendance_date, period)
  VALUES ('94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000027', '94000000-0000-4000-8000-000000000032', CURRENT_DATE, 3)$sql$,
  '42501', NULL, 'unassigned faculty cannot create attendance sessions');
SELECT throws_ok($sql$INSERT INTO public.grade_columns (subject_id, created_by, title)
  VALUES ('94000000-0000-4000-8000-000000000034', '94000000-0000-4000-8000-000000000027', 'Unassigned grade')$sql$,
  '42501', NULL, 'unassigned faculty cannot create grade columns');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000023', true);
SELECT set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000023","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000037'), 0, 'withdrawn formal enrollment blocks section fallback');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000028', true);
SELECT set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000028","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000037'), 1, 'current active formal enrollment grants its course');
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000046'), 0, 'formal enrollment does not grant a task in a different section');
SELECT is((SELECT count(*)::integer FROM public.timetable_weeks WHERE id = '94000000-0000-4000-8000-000000000050'), 1, 'formal enrollment grants its section timetable week');
SELECT is((SELECT count(*)::integer FROM public.timetable_weeks WHERE id = '94000000-0000-4000-8000-000000000051'), 0, 'formal enrollment does not grant a different section week');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000026', true);
SELECT set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000026","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000037'), 0, 'student in another tenant cannot read the course');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000025', true);
SELECT set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000025","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000037'), 1, 'parent can read linked student course work');
SELECT is((SELECT count(*)::integer FROM public.assignments WHERE id = '94000000-0000-4000-8000-000000000041'), 0, 'parent cannot expand access to another campus');
SELECT is(public.user_is_linked_student('94000000-0000-4000-8000-000000000022'), true, 'same-institution parent relationship is recognized');
SELECT is(public.user_is_linked_student('94000000-0000-4000-8000-000000000026'), false, 'cross-institution parent relationship is rejected');
SELECT ok(NOT has_function_privilege('anon', 'public.admissions_generate_offer(uuid,uuid)', 'execute'), 'anonymous privileged RPC is denied');
SELECT ok(NOT has_function_privilege('authenticated', 'public.delete_organization_cascade(uuid)', 'execute'), 'authenticated privileged RPC is denied');
SELECT * FROM finish();
ROLLBACK;
