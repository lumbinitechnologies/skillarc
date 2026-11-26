-- ==============================================================================
-- Safe Rollback for Migration 032: Classroom, Attendance & Assessment Domain RLS
-- ==============================================================================
-- Fail-Closed Strategy: Strictly locks down grades, submissions, and attendance
-- to own records and institution staff only. Never opens tables to public/other users.
-- ==============================================================================

-- 1. attendance
DROP POLICY IF EXISTS "attendance_sessions_select" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions_rollback_safe" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_rollback_safe" ON public.attendance_sessions
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.sections sec
      WHERE sec.id = attendance_sessions.section_id
        AND sec.institution_id = public.current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_rollback_safe" ON public.attendance_records;
CREATE POLICY "attendance_records_rollback_safe" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'FACULTY')
  );

-- 2. assignments & submissions
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
DROP POLICY IF EXISTS "assignments_rollback_safe" ON public.assignments;
CREATE POLICY "assignments_rollback_safe" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.subjects sub
      WHERE sub.id = assignments.subject_id
        AND sub.institution_id = public.current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS "submissions_select" ON public.submissions;
DROP POLICY IF EXISTS "submissions_student_insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions_student_update" ON public.submissions;
DROP POLICY IF EXISTS "submissions_rollback_safe_select" ON public.submissions;
CREATE POLICY "submissions_rollback_safe_select" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'FACULTY')
  );

-- 3. gradebook
DROP POLICY IF EXISTS "grade_columns_select" ON public.grade_columns;
DROP POLICY IF EXISTS "grade_columns_rollback_safe" ON public.grade_columns;
CREATE POLICY "grade_columns_rollback_safe" ON public.grade_columns
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'FACULTY')
  );

DROP POLICY IF EXISTS "grade_entries_select" ON public.grade_entries;
DROP POLICY IF EXISTS "grade_entries_rollback_safe" ON public.grade_entries;
CREATE POLICY "grade_entries_rollback_safe" ON public.grade_entries
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'FACULTY')
  );

-- 4. resources & projects
DROP POLICY IF EXISTS "resources_select" ON public.resources;
DROP POLICY IF EXISTS "resources_rollback_safe" ON public.resources;
CREATE POLICY "resources_rollback_safe" ON public.resources
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.subjects sub
      WHERE sub.id = resources.subject_id
        AND sub.institution_id = public.current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_rollback_safe" ON public.projects;
CREATE POLICY "projects_rollback_safe" ON public.projects
  FOR SELECT TO authenticated
  USING (
    faculty_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.users faculty
      WHERE faculty.id = projects.faculty_id
        AND faculty.institution_id = public.current_user_institution_id()
    )
  );
