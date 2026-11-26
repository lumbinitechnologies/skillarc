-- ==============================================================================
-- Migration 031: Academic Hierarchy & Timetable Domain RLS Hardening (Domain 2)
-- ==============================================================================
-- 1. Enables RLS on organizations, institutions, departments, programs, intakes,
--    sections, subjects, faculty_subjects, timetable_slots, periods.
-- 2. Multi-tenant isolation enforced via institution_id / organization_id.
-- ==============================================================================

-- -------------------------------------------------------------
-- 1. organizations & institutions
-- -------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_scoped" ON public.organizations;
CREATE POLICY "organizations_select_scoped" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid()) AND u.organization_id = organizations.id
    )
  );

DROP POLICY IF EXISTS "institutions_select_scoped" ON public.institutions;
CREATE POLICY "institutions_select_scoped" ON public.institutions
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR institutions.id = public.current_user_institution_id()
  );

-- -------------------------------------------------------------
-- 2. departments, programs, intakes
-- -------------------------------------------------------------
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_scoped" ON public.departments;
CREATE POLICY "departments_select_scoped" ON public.departments
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR departments.institution_id = public.current_user_institution_id()
  );

DROP POLICY IF EXISTS "programs_select_scoped" ON public.programs;
CREATE POLICY "programs_select_scoped" ON public.programs
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR programs.institution_id = public.current_user_institution_id()
  );

DROP POLICY IF EXISTS "intakes_all" ON public.intakes;
DROP POLICY IF EXISTS "intakes_select_scoped" ON public.intakes;
CREATE POLICY "intakes_select_scoped" ON public.intakes
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR intakes.institution_id = public.current_user_institution_id()
  );

-- -------------------------------------------------------------
-- 3. sections, subjects, faculty_subjects
-- -------------------------------------------------------------
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sections_select_scoped" ON public.sections;
CREATE POLICY "sections_select_scoped" ON public.sections
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR sections.institution_id = public.current_user_institution_id()
  );

DROP POLICY IF EXISTS "subjects_select_scoped" ON public.subjects;
CREATE POLICY "subjects_select_scoped" ON public.subjects
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR subjects.institution_id = public.current_user_institution_id()
  );

DROP POLICY IF EXISTS "faculty_subjects_select_scoped" ON public.faculty_subjects;
CREATE POLICY "faculty_subjects_select_scoped" ON public.faculty_subjects
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR faculty_subjects.institution_id = public.current_user_institution_id()
  );

-- -------------------------------------------------------------
-- 4. timetable_slots & periods
-- -------------------------------------------------------------
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timetable_slots_select_scoped" ON public.timetable_slots;
CREATE POLICY "timetable_slots_select_scoped" ON public.timetable_slots
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR timetable_slots.institution_id = public.current_user_institution_id()
  );

DROP POLICY IF EXISTS "periods_select_scoped" ON public.periods;
CREATE POLICY "periods_select_scoped" ON public.periods
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR periods.institution_id = public.current_user_institution_id()
  );
