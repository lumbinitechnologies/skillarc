-- ==============================================================================
-- Safe Rollback for Migration 030: User & Student Profile Domain RLS
-- ==============================================================================
-- Fail-Closed Strategy: In case of policy rollback, access is restricted to
-- administrators and self-reads only. NEVER reverts to open "USING (true)".
-- ==============================================================================

-- 1. users
DROP POLICY IF EXISTS "users_select_scoped" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_rollback_safe_select" ON public.users;
CREATE POLICY "users_rollback_safe_select" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
  );

-- 2. students
DROP POLICY IF EXISTS "students_select_scoped" ON public.students;
DROP POLICY IF EXISTS "students_admin_manage" ON public.students;
DROP POLICY IF EXISTS "students_rollback_safe_select" ON public.students;
CREATE POLICY "students_rollback_safe_select" ON public.students
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
  );

-- 3. staff
DROP POLICY IF EXISTS "staff_select_scoped" ON public.staff;
DROP POLICY IF EXISTS "staff_admin_manage" ON public.staff;
DROP POLICY IF EXISTS "staff_rollback_safe_select" ON public.staff;
CREATE POLICY "staff_rollback_safe_select" ON public.staff
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
  );

-- 4. parent_student_relations
DROP POLICY IF EXISTS "parent_student_relations_select" ON public.parent_student_relations;
DROP POLICY IF EXISTS "parent_student_relations_manage" ON public.parent_student_relations;
DROP POLICY IF EXISTS "parent_student_relations_rollback_safe" ON public.parent_student_relations;
CREATE POLICY "parent_student_relations_rollback_safe" ON public.parent_student_relations
  FOR SELECT TO authenticated
  USING (
    parent_id = (SELECT auth.uid())
    OR student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN')
  );
