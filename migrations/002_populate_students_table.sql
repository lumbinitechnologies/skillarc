-- ============================================================
-- V1 SCHEMA MIGRATION: Create students table & populate from users
-- Date: 2026-07-19
-- Updated: Handles NULL constraints properly and creates supporting tables
-- 
-- This script:
-- 1. Creates the students table (1:1 with users)
-- 2. Populates it with existing students from the users table
-- 3. Adds indexes for performance
-- 4. Sets up RLS policies
-- ============================================================

-- Step 1: Verify users table structure
-- The users table should have these student-related columns:
-- - id, institution_id, program_id, section_id, semester, role

-- Step 2: Create intakes table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.intakes (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  name           text NOT NULL,
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  created_at     timestamp DEFAULT now(),
  CONSTRAINT intakes_pkey PRIMARY KEY (id),
  CONSTRAINT intakes_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE
);

-- Step 3: Create students table
CREATE TABLE IF NOT EXISTS public.students (
  id                  uuid NOT NULL,
  institution_id      uuid,
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
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL,
  CONSTRAINT students_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE SET NULL,
  CONSTRAINT students_section_id_fkey
    FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE SET NULL,
  CONSTRAINT students_intake_id_fkey
    FOREIGN KEY (intake_id) REFERENCES public.intakes(id) ON DELETE SET NULL
);

-- Step 4: Populate students table from existing users with role = STUDENT or student
-- This handles all existing students by copying from users table
INSERT INTO public.students (id, institution_id, program_id, section_id, intake_id, registration_number, admission_year, dob, gender, semester)
SELECT u.id, u.institution_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
FROM public.users u
WHERE (u.role = 'STUDENT' OR u.role = 'student')
  AND NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = u.id);

-- Step 5: Create staff table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.staff (
  id             uuid NOT NULL,
  institution_id uuid,
  employee_id    text,
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_id_fkey
    FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT staff_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL
);

-- Step 6: Create files table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.files (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
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
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT files_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE,
  CONSTRAINT files_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Step 7: Create enrolments table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.enrolments (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL,
  institution_id uuid,
  program_id     uuid,
  intake_id      uuid,
  status         text NOT NULL DEFAULT 'ENROLLED' CHECK (status = ANY (ARRAY[
                   'ENROLLED','ACTIVE','ON_LEAVE','COMPLETED','WITHDRAWN','DISCONTINUED'
                 ])),
  started_at     date NOT NULL DEFAULT CURRENT_DATE,
  ended_at       date,
  created_at     timestamp DEFAULT now(),
  CONSTRAINT enrolments_pkey PRIMARY KEY (id),
  CONSTRAINT enrolments_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
  CONSTRAINT enrolments_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE,
  CONSTRAINT enrolments_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE,
  CONSTRAINT enrolments_intake_id_fkey
    FOREIGN KEY (intake_id) REFERENCES public.intakes(id) ON DELETE SET NULL
);

-- Step 8: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_intakes_institution ON public.intakes(institution_id);

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

-- Step 9: Enable RLS (Row Level Security)
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.intakes ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies (permissive for development)
-- WARNING: These are development policies - tighten for production!
DROP POLICY IF EXISTS "students_all" ON public.students;
CREATE POLICY "students_all" ON public.students
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_all" ON public.staff;
CREATE POLICY "staff_all" ON public.staff
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "files_all" ON public.files;
CREATE POLICY "files_all" ON public.files
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "enrolments_all" ON public.enrolments;
CREATE POLICY "enrolments_all" ON public.enrolments
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "intakes_all" ON public.intakes;
CREATE POLICY "intakes_all" ON public.intakes
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- VERIFICATION QUERIES
-- Run these to verify the migration worked:
-- ============================================================
-- SELECT COUNT(*) as students_table_count FROM public.students;
-- SELECT COUNT(*) as users_student_count FROM public.users WHERE role IN ('STUDENT', 'student');
-- SELECT COUNT(*) as intakes_count FROM public.intakes;
-- SELECT * FROM public.students LIMIT 5;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
