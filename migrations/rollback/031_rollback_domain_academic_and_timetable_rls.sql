-- ==============================================================================
-- Safe Rollback for Migration 031: Academic Hierarchy & Timetable Domain RLS
-- ==============================================================================
-- Fail-Closed Strategy: Restrict reads to authenticated users within the same
-- institution, denying cross-tenant and public unauthenticated access.
-- ==============================================================================

-- organizations
DROP POLICY IF EXISTS "organizations_select_scoped" ON public.organizations;
DROP POLICY IF EXISTS "organizations_rollback_safe" ON public.organizations;
CREATE POLICY "organizations_rollback_safe" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.organization_id = organizations.id
    )
  );

-- institutions
DROP POLICY IF EXISTS "institutions_select_scoped" ON public.institutions;
DROP POLICY IF EXISTS "institutions_rollback_safe" ON public.institutions;
CREATE POLICY "institutions_rollback_safe" ON public.institutions
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR institutions.id = public.current_user_institution_id()
  );

-- departments, programs, intakes, sections, subjects, faculty_subjects, timetable_slots, periods
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'departments', 'programs', 'intakes', 'sections',
    'subjects', 'faculty_subjects', 'timetable_slots', 'periods'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_scoped ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_rollback_safe ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY %I_rollback_safe ON public.%I FOR SELECT TO authenticated
      USING (
        public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
        OR %I.institution_id = public.current_user_institution_id()
      )
    $p$, t, t, t);
  END LOOP;
END $$;
