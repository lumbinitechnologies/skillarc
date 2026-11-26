-- ==============================================================================
-- Migration 032: Classroom, Attendance & Assessment Domain RLS Hardening (Domain 3)
-- ==============================================================================
-- 1. Enables RLS on attendance_sessions, attendance_records, assignments,
--    submissions, submission_verifications, grade_columns, grade_entries, resources, projects.
-- 2. Prevents IDOR and ensures students only view their own submissions/grades
--    and parents only view linked children's records.
-- ==============================================================================

-- -------------------------------------------------------------
-- 1. Attendance Sessions & Records
-- -------------------------------------------------------------
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_sessions_select" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_select" ON public.attendance_sessions
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
CREATE POLICY "attendance_records_select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    -- Student viewing own attendance
    student_id = (SELECT auth.uid())
    -- Global admins
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    -- Staff/Admins in same institution
    OR (
      public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
      AND EXISTS (
        SELECT 1 FROM public.attendance_sessions ses
        JOIN public.sections sec ON sec.id = ses.section_id
        WHERE ses.id = attendance_records.session_id
          AND sec.institution_id = public.current_user_institution_id()
      )
    )
    -- Linked parent viewing child's attendance
    OR EXISTS (
      SELECT 1 FROM public.parent_student_relations psr
      WHERE psr.parent_id = (SELECT auth.uid())
        AND psr.student_id = attendance_records.student_id
    )
  );

-- -------------------------------------------------------------
-- 2. Assignments & Submissions
-- -------------------------------------------------------------
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
CREATE POLICY "assignments_select" ON public.assignments
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
CREATE POLICY "submissions_select" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    -- Student viewing own submission
    student_id = (SELECT auth.uid())
    -- Global admins
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    -- Teacher/Admin viewing submissions in same institution
    OR (
      public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
      AND EXISTS (
        SELECT 1 FROM public.assignments a
        JOIN public.subjects sub ON sub.id = a.subject_id
        WHERE a.id = submissions.assignment_id
          AND sub.institution_id = public.current_user_institution_id()
      )
    )
    -- Linked parent viewing child's submission
    OR EXISTS (
      SELECT 1 FROM public.parent_student_relations psr
      WHERE psr.parent_id = (SELECT auth.uid())
        AND psr.student_id = submissions.student_id
    )
  );

DROP POLICY IF EXISTS "submissions_student_insert" ON public.submissions;
CREATE POLICY "submissions_student_insert" ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "submissions_student_update" ON public.submissions;
CREATE POLICY "submissions_student_update" ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'FACULTY')
  );

-- -------------------------------------------------------------
-- 3. Gradebook (grade_columns & grade_entries)
-- -------------------------------------------------------------
ALTER TABLE public.grade_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grade_columns_select" ON public.grade_columns;
CREATE POLICY "grade_columns_select" ON public.grade_columns
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = grade_columns.subject_id
        AND s.institution_id = public.current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS "grade_entries_select" ON public.grade_entries;
CREATE POLICY "grade_entries_select" ON public.grade_entries
  FOR SELECT TO authenticated
  USING (
    -- Student viewing own grade
    student_id = (SELECT auth.uid())
    -- Global admins
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    -- Staff/Faculty/Admins in same institution
    OR (
      public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
      AND EXISTS (
        SELECT 1 FROM public.grade_columns gc
        JOIN public.subjects s ON s.id = gc.subject_id
        WHERE gc.id = grade_entries.column_id
          AND s.institution_id = public.current_user_institution_id()
      )
    )
    -- Linked parent
    OR EXISTS (
      SELECT 1 FROM public.parent_student_relations psr
      WHERE psr.parent_id = (SELECT auth.uid())
        AND psr.student_id = grade_entries.student_id
    )
  );

-- -------------------------------------------------------------
-- 4. Resources, Projects & Groups
-- -------------------------------------------------------------
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_select" ON public.resources;
CREATE POLICY "resources_select" ON public.resources
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
CREATE POLICY "projects_select" ON public.projects
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

DROP POLICY IF EXISTS "project_groups_select" ON public.project_groups;
CREATE POLICY "project_groups_select" ON public.project_groups
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.users faculty ON faculty.id = p.faculty_id
      WHERE p.id = project_groups.project_id
        AND (p.faculty_id = (SELECT auth.uid()) OR faculty.institution_id = public.current_user_institution_id())
    )
  );

DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
CREATE POLICY "group_members_select" ON public.group_members
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.project_groups pg
      JOIN public.projects p ON p.id = pg.project_id
      JOIN public.users faculty ON faculty.id = p.faculty_id
      WHERE pg.id = group_members.group_id
        AND (p.faculty_id = (SELECT auth.uid()) OR faculty.institution_id = public.current_user_institution_id())
    )
  );
