-- ============================================================
-- MIGRATION: Current Schema → SkillArc v1
-- Date: 2026-07-19
-- 
-- This migration script evolves the existing schema to v1
-- while preserving all existing data where possible.
-- ============================================================

-- Step 1: Create new tables that don't exist yet
-- ============================================================

-- intakes table (new)
CREATE TABLE IF NOT EXISTS public.intakes (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  name           text NOT NULL,
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  created_at     timestamp DEFAULT now(),
  CONSTRAINT intakes_pkey PRIMARY KEY (id),
  CONSTRAINT intakes_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);

-- Step 2: Create students table (new) - 1:1 with users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.students (
  id                  uuid NOT NULL,
  institution_id      uuid NOT NULL,
  program_id          uuid,
  section_id          uuid,
  intake_id           uuid,
  registration_number text,
  admission_year      integer,
  dob                 date,
  gender              text,
  semester            integer,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_id_fkey
    FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT students_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT students_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT students_section_id_fkey
    FOREIGN KEY (section_id) REFERENCES public.sections(id),
  CONSTRAINT students_intake_id_fkey
    FOREIGN KEY (intake_id) REFERENCES public.intakes(id),
  CONSTRAINT students_institution_regno_unique
    UNIQUE (institution_id, registration_number)
);

-- Step 3: Create staff table (new) - 1:1 with users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff (
  id             uuid NOT NULL,
  institution_id uuid NOT NULL,
  employee_id    text,
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_id_fkey
    FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT staff_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT staff_institution_empid_unique
    UNIQUE (institution_id, employee_id)
);

-- Step 4: Create files table (new)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.files (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  institution_id  uuid,
  module          text NOT NULL,
  bucket          text NOT NULL,
  file_url        text NOT NULL,
  size_bytes      bigint NOT NULL DEFAULT 0,
  uploaded_by     uuid,
  entity_type     text,
  entity_id       uuid,
  created_at      timestamp DEFAULT now(),
  CONSTRAINT files_pkey PRIMARY KEY (id),
  CONSTRAINT files_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT files_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT files_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);

-- Step 5: Create enrolments table (new) - student lifecycle history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enrolments (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL,
  institution_id uuid NOT NULL,
  program_id     uuid NOT NULL,
  intake_id      uuid,
  status         text NOT NULL DEFAULT 'ENROLLED' CHECK (status = ANY (ARRAY[
                   'ENROLLED','ACTIVE','ON_LEAVE','COMPLETED','WITHDRAWN','DISCONTINUED'
                 ])),
  started_at     date NOT NULL DEFAULT CURRENT_DATE,
  ended_at       date,
  created_at     timestamp DEFAULT now(),
  CONSTRAINT enrolments_pkey PRIMARY KEY (id),
  CONSTRAINT enrolments_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT enrolments_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT enrolments_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs(id),
  CONSTRAINT enrolments_intake_id_fkey
    FOREIGN KEY (intake_id) REFERENCES public.intakes(id)
);

-- Step 6: Migrate data from users to students/staff tables
-- ============================================================

-- For now, defer data migration. This requires:
-- 1. Identifying which users are students vs staff
-- 2. Populating students table with student users
-- 3. Populating staff table with faculty/staff users
-- 
-- This should be done carefully with business logic to determine
-- the correct institution_id and other fields for each user.
-- 
-- Example data migration (commented out - adjust as needed):
/*
INSERT INTO public.students (id, institution_id, program_id, section_id, semester)
SELECT u.id, u.institution_id, p.id, u.section_id, u.semester
FROM public.users u
LEFT JOIN public.programs p ON u.section_id = (SELECT program_id FROM public.sections WHERE id = u.section_id)
WHERE u.role = 'STUDENT'
  AND u.institution_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff (id, institution_id)
SELECT u.id, u.institution_id
FROM public.users u
WHERE u.role IN ('FACULTY', 'HOD', 'PROGRAM_HEAD', 'INSTITUTION_ADMIN')
  AND u.institution_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
*/

-- Step 7: Update uniqueness constraints on users.email
-- ============================================================

-- Check if current constraint exists before modifying
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_key' AND contype = 'u'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_email_key;
  END IF;
END
$$;

-- Add new org-scoped email uniqueness
ALTER TABLE public.users
ADD CONSTRAINT users_org_email_unique UNIQUE (organization_id, email);

-- Step 8: Add indexes for new tables
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_students_institution ON public.students(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_program ON public.students(program_id);
CREATE INDEX IF NOT EXISTS idx_students_section ON public.students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_intake ON public.students(intake_id);

CREATE INDEX IF NOT EXISTS idx_staff_institution ON public.staff(institution_id);

CREATE INDEX IF NOT EXISTS idx_files_org_module ON public.files(organization_id, module);
CREATE INDEX IF NOT EXISTS idx_files_institution ON public.files(institution_id);
CREATE INDEX IF NOT EXISTS idx_files_entity ON public.files(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_enrolments_student ON public.enrolments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrolments_institution ON public.enrolments(institution_id);
CREATE INDEX IF NOT EXISTS idx_enrolments_program ON public.enrolments(program_id);
CREATE INDEX IF NOT EXISTS idx_enrolments_status ON public.enrolments(status);

-- Step 9: Add RLS policies to new tables
-- ============================================================

-- Enable RLS (for the new tables - existing tables can be done separately)
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- TEMPORARY dev policies (replace with proper tenant-scoped policies before production)
CREATE POLICY IF NOT EXISTS "files_all" ON public.files
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "enrolments_all" ON public.enrolments
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "students_all" ON public.students
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "staff_all" ON public.staff
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- MANUAL STEPS REQUIRED
-- ============================================================
/*

1. DATA MIGRATION:
   After running this script, manually migrate existing users to students/staff:
   
   - Review users with role = 'STUDENT' and insert into students table
   - Review users with role IN ('FACULTY', 'HOD', etc) and insert into staff table
   - Ensure all registration_number values are unique per institution
   - Ensure all employee_id values are unique per institution

2. FIELD UPDATES:
   - If existing users have student-specific fields, map them to students table
   - If existing users have staff-specific fields, map them to staff table

3. SCHEMA CLEANUP (optional, after verifying data):
   - Remove old column from users if not needed (e.g., section_id if fully in students)
   - Drop old hierarchy tables (departments_hierarchy, programs_hierarchy) if migrated

4. RLS POLICY UPDATES:
   - Replace temporary dev policies with proper tenant-scoped policies:
     * students table should be filtered by institution_id + user's org/institution
     * staff table should be filtered by institution_id
     * files table should be filtered by organization_id/institution_id
     * enrolments table should be filtered by institution_id

5. TEST:
   - Verify all foreign keys work correctly
   - Test INSERT/UPDATE/DELETE on new tables
   - Verify RLS policies don't break existing queries

*/

-- ============================================================
-- END OF MIGRATION SCRIPT
-- ============================================================
