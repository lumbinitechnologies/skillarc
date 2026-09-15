-- ==============================================================================
-- Migration 030: User & Student Profile Domain RLS Hardening (Domain 1)
-- ==============================================================================
-- 1. Creates SECURITY DEFINER helpers for role/institution lookups to prevent RLS recursion.
-- 2. Enables RLS on public.users, public.students, public.staff, public.parent_student_relations.
-- 3. Replaces open "USING (true)" development policies with strict tenant & role isolation.
-- ==============================================================================

-- -------------------------------------------------------------
-- 0. Non-recursive Security Definer Context Helpers
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.users WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_institution_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT institution_id FROM public.users WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_institution_id() TO authenticated;

-- -------------------------------------------------------------
-- 1. public.users
-- -------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_scoped" ON public.users;
CREATE POLICY "users_select_scoped" ON public.users
  FOR SELECT TO authenticated
  USING (
    -- User reading own record
    id = (SELECT auth.uid())
    -- Global administrators reading anyone
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    -- Institution members reading other users in same institution
    OR (
      institution_id IS NOT NULL
      AND institution_id = public.current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() = 'INSTITUTION_ADMIN'
      AND users.institution_id = public.current_user_institution_id()
    )
  );

-- -------------------------------------------------------------
-- 2. public.students
-- -------------------------------------------------------------
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_all" ON public.students;
DROP POLICY IF EXISTS "students_select_scoped" ON public.students;
CREATE POLICY "students_select_scoped" ON public.students
  FOR SELECT TO authenticated
  USING (
    -- Student viewing own student record
    id = (SELECT auth.uid())
    -- Global admins
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    -- Institution staff / admins viewing students in their own institution
    OR (
      students.institution_id = public.current_user_institution_id()
      AND public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
    )
    -- Linked parents viewing their children
    OR EXISTS (
      SELECT 1 FROM public.parent_student_relations psr
      WHERE psr.parent_id = (SELECT auth.uid())
        AND psr.student_id = students.id
    )
  );

DROP POLICY IF EXISTS "students_admin_manage" ON public.students;
CREATE POLICY "students_admin_manage" ON public.students
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() = 'INSTITUTION_ADMIN'
      AND students.institution_id = public.current_user_institution_id()
    )
  )
  WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() = 'INSTITUTION_ADMIN'
      AND students.institution_id = public.current_user_institution_id()
    )
  );

-- -------------------------------------------------------------
-- 3. public.staff
-- -------------------------------------------------------------
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all" ON public.staff;
DROP POLICY IF EXISTS "staff_select_scoped" ON public.staff;
CREATE POLICY "staff_select_scoped" ON public.staff
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR staff.institution_id = public.current_user_institution_id()
  );

DROP POLICY IF EXISTS "staff_admin_manage" ON public.staff;
CREATE POLICY "staff_admin_manage" ON public.staff
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() = 'INSTITUTION_ADMIN'
      AND staff.institution_id = public.current_user_institution_id()
    )
  )
  WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR (
      public.current_user_role() = 'INSTITUTION_ADMIN'
      AND staff.institution_id = public.current_user_institution_id()
    )
  );

-- -------------------------------------------------------------
-- 4. public.parent_student_relations
-- -------------------------------------------------------------
ALTER TABLE public.parent_student_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_student_relations_select" ON public.parent_student_relations;
CREATE POLICY "parent_student_relations_select" ON public.parent_student_relations
  FOR SELECT TO authenticated
  USING (
    parent_id = (SELECT auth.uid())
    OR student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
  );

DROP POLICY IF EXISTS "parent_student_relations_manage" ON public.parent_student_relations;
CREATE POLICY "parent_student_relations_manage" ON public.parent_student_relations
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
  )
  WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
  );
