-- Hosted previews ONLY. No Auth accounts, fixed passwords, real records or uploads.
INSERT INTO public.organizations (id, name)
VALUES ('90000000-0000-4000-8000-000000000001', 'Synthetic preview organization');
INSERT INTO public.institutions (id, organization_id, name, domain) VALUES
 ('90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001','Synthetic India preview','india.preview.invalid'),
 ('90000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000001','Synthetic Australia preview','australia.preview.invalid');
-- Timezone support may be the feature being previewed, or not yet merged.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='institutions' AND column_name='academic_time_zone') THEN
    UPDATE public.institutions SET academic_time_zone = CASE id
      WHEN '90000000-0000-4000-8000-000000000002'::uuid THEN 'Asia/Kolkata'
      ELSE 'Australia/Sydney' END
      WHERE id IN ('90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003');
  END IF;
END $$;
