BEGIN;
INSERT INTO public.institutions (id, organization_id, name) VALUES
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic India'),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Synthetic Australia'),
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','Other campus in same organization');
INSERT INTO public.users VALUES
 ('10000000-0000-4000-8000-000000000001','INSTITUTION_ADMIN',true,'30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002','INSTITUTION_ADMIN',true,'30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002'),
 ('10000000-0000-4000-8000-000000000003','STUDENT',true,'30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000004','INSTITUTION_ADMIN',false,'30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.institutions WHERE academic_time_zone IS NOT NULL) THEN
    RAISE EXCEPTION 'Timezone must not get a blanket default';
  END IF;
  IF has_function_privilege('anon','public.set_institution_academic_time_zone(uuid,uuid,uuid,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.set_institution_academic_time_zone(uuid,uuid,uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Untrusted roles can invoke the configuration RPC';
  END IF;
END $$;

SET LOCAL ROLE service_role;
DO $$ DECLARE bad_actor uuid; bad_zone text; BEGIN
  FOREACH bad_actor IN ARRAY ARRAY[
    '10000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid,
    '10000000-0000-4000-8000-000000000004'::uuid
  ] LOOP
    BEGIN
      PERFORM public.set_institution_academic_time_zone(bad_actor,
        '30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Asia/Kolkata');
      RAISE EXCEPTION 'Cross-tenant/wrong-role/inactive actor was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
  BEGIN
    PERFORM public.set_institution_academic_time_zone('10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Asia/Kolkata');
    RAISE EXCEPTION 'Forged organization was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.set_institution_academic_time_zone('10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','Asia/Kolkata');
    RAISE EXCEPTION 'Another institution in the same organization was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  FOREACH bad_zone IN ARRAY ARRAY['IST','+05:30','Asia/Unknown',''] LOOP
    BEGIN
      PERFORM public.set_institution_academic_time_zone('10000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',bad_zone);
      RAISE EXCEPTION 'Invalid timezone was allowed';
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  END LOOP;
END $$;

SELECT public.set_institution_academic_time_zone('10000000-0000-4000-8000-000000000001',
 '30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Asia/Kolkata');
SELECT public.set_institution_academic_time_zone('10000000-0000-4000-8000-000000000001',
 '30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Asia/Kolkata');
-- Australian timezone is an explicit fixture, not the unknown real campus.
SELECT public.set_institution_academic_time_zone('10000000-0000-4000-8000-000000000002',
 '30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Australia/Sydney');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.audit_logs) <> 2 THEN RAISE EXCEPTION 'Audit must occur once per change, not retry'; END IF;
  IF (SELECT academic_time_zone FROM public.institutions WHERE name = 'Synthetic India') <> 'Asia/Kolkata' THEN RAISE EXCEPTION 'India configuration changed'; END IF;
  IF (SELECT academic_time_zone FROM public.institutions WHERE name = 'Synthetic Australia') <> 'Australia/Sydney' THEN RAISE EXCEPTION 'Australian fixture incorrect'; END IF;
END $$;

SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    UPDATE public.institutions SET academic_time_zone = NULL WHERE name = 'Synthetic India';
    RAISE EXCEPTION 'Direct Data API write bypassed the server path';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.institutions (id,organization_id,academic_time_zone) VALUES
      (gen_random_uuid(),'20000000-0000-4000-8000-000000000001','Asia/Kolkata');
    RAISE EXCEPTION 'Insert bypassed the server path';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.set_institution_academic_time_zone('10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',NULL);
    RAISE EXCEPTION 'Authenticated RPC bypass';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    UPDATE public.institutions SET academic_time_zone = 'UTC' WHERE name = 'Synthetic India';
    RAISE EXCEPTION 'Anonymous direct write bypass';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

RESET ROLE;
CREATE FUNCTION public.test_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Synthetic audit failure'; END $$;
CREATE TRIGGER test_reject_audit BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.test_reject_audit();
SET LOCAL ROLE service_role;
DO $$ BEGIN
  BEGIN
    PERFORM public.set_institution_academic_time_zone('10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','UTC');
    RAISE EXCEPTION 'Audit failure did not abort';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Synthetic audit failure' THEN RAISE; END IF;
  END;
  IF (SELECT academic_time_zone FROM public.institutions WHERE name = 'Synthetic India') <> 'Asia/Kolkata' THEN
    RAISE EXCEPTION 'Timezone committed without audit';
  END IF;
END $$;
RESET ROLE;
DROP TRIGGER test_reject_audit ON public.audit_logs;
SET LOCAL ROLE service_role;
SELECT public.set_institution_academic_time_zone('10000000-0000-4000-8000-000000000001',
 '30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',NULL);
DO $$ BEGIN
  IF (SELECT academic_time_zone FROM public.institutions WHERE name = 'Synthetic India') IS NOT NULL THEN RAISE EXCEPTION 'Explicit clear failed'; END IF;
  IF (SELECT count(*) FROM public.audit_logs) <> 3 THEN RAISE EXCEPTION 'Clear was not audited'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: timezone validation, tenant/role denial, direct-write guard, atomic audit, retry and explicit clear' AS result;
