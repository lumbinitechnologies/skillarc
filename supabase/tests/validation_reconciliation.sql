BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;
SELECT plan(22);
SELECT has_column('public', 'organizations', 'org_type', 'school classification is replayed canonically');
SELECT col_default_is('public', 'organizations', 'org_type', 'college', 'existing organizations default to college');
SELECT has_column('public', 'users', 'phone', 'legacy phone addition is already in baseline');
SELECT is((SELECT count(*)::integer FROM pg_constraint WHERE conname IN (
  'parent_student_relations_student_id_fkey', 'parent_student_relations_parent_id_fkey',
  'notifications_user_id_fkey', 'notification_preferences_user_id_fkey') AND confdeltype='c'),
  4, 'all intended user-owned relations cascade');
SELECT ok(NOT has_function_privilege('anon', 'public.delete_institution_cascade(uuid)', 'execute'), 'anonymous institution deletion denied');
SELECT ok(NOT has_function_privilege('authenticated', 'public.delete_institution_cascade(uuid)', 'execute'), 'direct authenticated institution deletion denied');
SELECT ok(NOT has_function_privilege('anon', 'public.delete_organization_cascade(uuid)', 'execute'), 'anonymous organization deletion denied');
SELECT ok(NOT has_function_privilege('authenticated', 'public.admissions_convert_to_enrolment(uuid,uuid,jsonb)', 'execute'), 'conversion requires verified server boundary');
SELECT ok(has_function_privilege('service_role', 'public.delete_institution_cascade(uuid)', 'execute'), 'verified server can delete');
SELECT lives_ok($sql$INSERT INTO public.enrolments (student_id,institution_id,program_id,source_application_id)
 SELECT gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid() WHERE false
 ON CONFLICT (source_application_id) WHERE source_application_id IS NOT NULL DO NOTHING$sql$,
 'enrolment conflict target resolves to existing partial unique index');
SELECT lives_ok($sql$INSERT INTO public.payment_plans (student_id,institution_id,source_application_id)
 SELECT gen_random_uuid(),gen_random_uuid(),gen_random_uuid() WHERE false
 ON CONFLICT (source_application_id) WHERE source_application_id IS NOT NULL DO NOTHING$sql$,
 'payment conflict target resolves to existing partial unique index');
SELECT lives_ok($sql$INSERT INTO public.invoices (payment_plan_id,amount_due,due_date,source_application_id,installment_no)
 SELECT gen_random_uuid(),0,current_date,gen_random_uuid(),1 WHERE false
 ON CONFLICT (source_application_id,installment_no) WHERE source_application_id IS NOT NULL AND installment_no IS NOT NULL DO NOTHING$sql$,
 'invoice conflict target resolves to existing partial unique index');
SELECT throws_ok($sql$SELECT public.admissions_convert_to_enrolment('93000000-0000-4000-8000-000000000001',
 '93000000-0000-4000-8000-000000000002','{}')$sql$, '42501', 'Enrolment conversion is not authorized', 'unknown actor denied');
INSERT INTO public.organizations (id,name) VALUES ('93000000-0000-4000-8000-000000000001','Synthetic reconciliation');
SELECT throws_ok($sql$UPDATE public.organizations SET org_type='invalid' WHERE id='93000000-0000-4000-8000-000000000001'$sql$,
 '23514', NULL, 'invalid organization category rejected');
SELECT lives_ok($sql$UPDATE public.organizations SET org_type='school' WHERE id='93000000-0000-4000-8000-000000000001'$sql$,
 'school category accepted');
INSERT INTO public.organizations (id,name) VALUES ('93000000-0000-4000-8000-000000000002','Other synthetic tenant');
INSERT INTO public.institutions (id,organization_id,name) VALUES
 ('93000000-0000-4000-8000-000000000011','93000000-0000-4000-8000-000000000001','Local A'),
 ('93000000-0000-4000-8000-000000000012','93000000-0000-4000-8000-000000000002','Local B');
INSERT INTO public.users (id,role,organization_id,institution_id) VALUES
 ('93000000-0000-4000-8000-000000000021','ORG_ADMIN','93000000-0000-4000-8000-000000000001',NULL),
 ('93000000-0000-4000-8000-000000000022','INSTITUTION_ADMIN','93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000011'),
 ('93000000-0000-4000-8000-000000000023','STUDENT','93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000011'),
 ('93000000-0000-4000-8000-000000000024','STUDENT','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000012');
INSERT INTO public.admissions_applications (id,institution_id,first_name,last_name,email) VALUES
 ('93000000-0000-4000-8000-000000000031','93000000-0000-4000-8000-000000000012','Synthetic','Applicant','reconciliation@example.invalid');
SELECT throws_ok($sql$SELECT public.admissions_convert_to_enrolment('93000000-0000-4000-8000-000000000031',
 '93000000-0000-4000-8000-000000000021','{}')$sql$, '42501', 'Application is outside the actor institution', 'organization admin cannot convert another tenant');
SELECT throws_ok($sql$SELECT public.admissions_convert_to_enrolment('93000000-0000-4000-8000-000000000031',
 '93000000-0000-4000-8000-000000000022','{}')$sql$, '42501', 'Application is outside the actor institution', 'institution admin cannot convert another institution');
UPDATE public.users SET is_active=false WHERE id='93000000-0000-4000-8000-000000000021';
SELECT throws_ok($sql$SELECT public.admissions_convert_to_enrolment('93000000-0000-4000-8000-000000000031',
 '93000000-0000-4000-8000-000000000021','{}')$sql$, '42501', 'Enrolment conversion is not authorized', 'inactive actor denied');
INSERT INTO public.notifications (user_id,title,message) VALUES
 ('93000000-0000-4000-8000-000000000023','Synthetic A','Owned by deleted user'),
 ('93000000-0000-4000-8000-000000000024','Synthetic B','Must survive');
INSERT INTO public.notification_preferences (user_id,category) VALUES
 ('93000000-0000-4000-8000-000000000023','due_date');
DELETE FROM public.users WHERE id='93000000-0000-4000-8000-000000000023';
SELECT is((SELECT count(*)::integer FROM public.notifications WHERE user_id='93000000-0000-4000-8000-000000000023'),0,'deleted user notification cascades');
SELECT is((SELECT count(*)::integer FROM public.notifications WHERE user_id='93000000-0000-4000-8000-000000000024'),1,'other tenant notification survives');
SELECT is((SELECT count(*)::integer FROM public.notification_preferences WHERE user_id='93000000-0000-4000-8000-000000000023'),0,'deleted user preferences cascade');
SELECT lives_ok($sql$SELECT public.delete_institution_cascade('93000000-0000-4000-8000-000000000099')$sql$,
 'administrative deletion executes against the canonical schema for an absent institution');
SELECT * FROM finish();
ROLLBACK;
