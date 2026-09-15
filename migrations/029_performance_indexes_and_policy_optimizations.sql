-- ==============================================================================
-- Migration 029: Performance Indexes & Policy Optimizations (Low-Risk Phase 1)
-- ==============================================================================
-- 1. Adds composite indexes on high-frequency filter, join, and foreign key columns.
-- 2. Optimizes existing RLS policies by wrapping auth.uid() as (SELECT auth.uid())
--    so PostgreSQL evaluates the auth context once per query instead of per row.
-- ==============================================================================

-- -------------------------------------------------------------
-- 1. High-Performance Query & Foreign Key Indexes
-- -------------------------------------------------------------

-- Users table lookups (crucial for login, context resolution, role queries, and admin lists)
CREATE INDEX IF NOT EXISTS idx_users_institution_role ON public.users(institution_id, role);
CREATE INDEX IF NOT EXISTS idx_users_org_role ON public.users(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- Academic Hierarchy & Sections
CREATE INDEX IF NOT EXISTS idx_departments_institution ON public.departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_programs_department ON public.programs(department_id);
CREATE INDEX IF NOT EXISTS idx_programs_institution ON public.programs(institution_id);
CREATE INDEX IF NOT EXISTS idx_intakes_institution ON public.intakes(institution_id);
CREATE INDEX IF NOT EXISTS idx_sections_institution_program ON public.sections(institution_id, program_id);
CREATE INDEX IF NOT EXISTS idx_sections_faculty_advisor ON public.sections(faculty_advisor_id);

-- Subjects & Curriculum
CREATE INDEX IF NOT EXISTS idx_subjects_institution ON public.subjects(institution_id);
CREATE INDEX IF NOT EXISTS idx_subjects_program ON public.subjects(program_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_section ON public.faculty_subjects(section_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_faculty ON public.faculty_subjects(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_subject ON public.faculty_subjects(subject_id);

-- Timetable Engine
CREATE INDEX IF NOT EXISTS idx_timetable_slots_inst_sec ON public.timetable_slots(institution_id, section_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_faculty ON public.timetable_slots(faculty_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_subject ON public.timetable_slots(subject_id);
CREATE INDEX IF NOT EXISTS idx_periods_institution ON public.periods(institution_id);

-- Attendance Engine
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_sec_date ON public.attendance_sessions(section_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_faculty ON public.attendance_sessions(faculty_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_subject ON public.attendance_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_student ON public.attendance_records(session_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);

-- Coursework & Gradebook
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON public.assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_faculty ON public.assignments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student ON public.submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_columns_subject ON public.grade_columns(subject_id);
CREATE INDEX IF NOT EXISTS idx_grade_entries_column_student ON public.grade_entries(column_id, student_id);
CREATE INDEX IF NOT EXISTS idx_grade_entries_student ON public.grade_entries(student_id);

-- Relationships & Permissions
CREATE INDEX IF NOT EXISTS idx_parent_student_parent ON public.parent_student_relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student ON public.parent_student_relations(student_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_perm ON public.user_permissions(user_id, permission_id);

-- -------------------------------------------------------------
-- 2. Policy Optimization: Wrap auth.uid() as (SELECT auth.uid())
-- -------------------------------------------------------------

-- User profile details
DROP POLICY IF EXISTS "Users can view their own profile details" ON public.user_profile_details;
CREATE POLICY "Users can view their own profile details"
  ON public.user_profile_details FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own profile details" ON public.user_profile_details;
CREATE POLICY "Users can manage their own profile details"
  ON public.user_profile_details FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- User account settings
DROP POLICY IF EXISTS "Users can view their own account settings" ON public.user_account_settings;
CREATE POLICY "Users can view their own account settings"
  ON public.user_account_settings FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own account settings" ON public.user_account_settings;
CREATE POLICY "Users can manage their own account settings"
  ON public.user_account_settings FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Notification preferences
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage their own notification preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
