-- =============================================================
-- Gradebook tables and access policies
-- =============================================================

CREATE TABLE IF NOT EXISTS public.grade_columns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'custom',
  max_score numeric(10,2) NOT NULL DEFAULT 100,
  weight numeric(10,2) NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grade_columns_pkey PRIMARY KEY (id),
  CONSTRAINT grade_columns_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE,
  CONSTRAINT grade_columns_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.grade_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL,
  student_id uuid NOT NULL,
  score numeric(10,2),
  feedback text,
  graded_by uuid,
  graded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grade_entries_pkey PRIMARY KEY (id),
  CONSTRAINT grade_entries_column_id_fkey
    FOREIGN KEY (column_id) REFERENCES public.grade_columns(id) ON DELETE CASCADE,
  CONSTRAINT grade_entries_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT grade_entries_graded_by_fkey
    FOREIGN KEY (graded_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT grade_entries_unique UNIQUE (column_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_grade_columns_subject_active
  ON public.grade_columns(subject_id, is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_grade_entries_column_student
  ON public.grade_entries(column_id, student_id);

ALTER TABLE public.grade_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_entries ENABLE ROW LEVEL SECURITY;

-- Student can read their own grade entries and all active columns for their enrolled subjects.
CREATE POLICY grade_columns_select_student
ON public.grade_columns
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.timetable_slots ts
    JOIN public.students s ON s.section_id = ts.section_id
    WHERE ts.subject_id = grade_columns.subject_id
      AND s.id = auth.uid()
      AND grade_columns.is_active = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.subjects sub
    WHERE sub.id = grade_columns.subject_id
      AND sub.institution_id = (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
      )
  )
);

CREATE POLICY grade_entries_select_student
ON public.grade_entries
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.grade_columns gc
    JOIN public.subjects sub ON sub.id = gc.subject_id
    WHERE gc.id = grade_entries.column_id
      AND sub.institution_id = (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.parent_student_relations psr
    WHERE psr.parent_id = auth.uid()
      AND psr.student_id = grade_entries.student_id
  )
);

-- Faculty / HOD / Program Head can read and manage grade columns and entries for their subject sections.
CREATE POLICY grade_columns_all_staff
ON public.grade_columns
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.subjects sub
    JOIN public.users u ON u.id = auth.uid()
    WHERE sub.id = grade_columns.subject_id
      AND sub.institution_id = u.institution_id
      AND u.role IN ('FACULTY', 'HOD', 'PROGRAM_HEAD', 'INSTITUTION_ADMIN')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.subjects sub
    JOIN public.users u ON u.id = auth.uid()
    WHERE sub.id = grade_columns.subject_id
      AND sub.institution_id = u.institution_id
      AND u.role IN ('FACULTY', 'HOD', 'PROGRAM_HEAD', 'INSTITUTION_ADMIN')
  )
);

CREATE POLICY grade_entries_all_staff
ON public.grade_entries
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.grade_columns gc
    JOIN public.subjects sub ON sub.id = gc.subject_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE gc.id = grade_entries.column_id
      AND sub.institution_id = u.institution_id
      AND u.role IN ('FACULTY', 'HOD', 'PROGRAM_HEAD', 'INSTITUTION_ADMIN')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.grade_columns gc
    JOIN public.subjects sub ON sub.id = gc.subject_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE gc.id = grade_entries.column_id
      AND sub.institution_id = u.institution_id
      AND u.role IN ('FACULTY', 'HOD', 'PROGRAM_HEAD', 'INSTITUTION_ADMIN')
  )
);

-- Parents can read the linked child's grade entries.
CREATE POLICY grade_entries_select_parent
ON public.grade_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_student_relations psr
    WHERE psr.parent_id = auth.uid()
      AND psr.student_id = grade_entries.student_id
  )
);

-- Institution admins can read all grades in their institution.
CREATE POLICY grade_columns_select_institution_admin
ON public.grade_columns
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.subjects sub
    JOIN public.users u ON u.id = auth.uid()
    WHERE sub.id = grade_columns.subject_id
      AND sub.institution_id = u.institution_id
      AND u.role = 'INSTITUTION_ADMIN'
  )
);

CREATE POLICY grade_entries_select_institution_admin
ON public.grade_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.grade_columns gc
    JOIN public.subjects sub ON sub.id = gc.subject_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE gc.id = grade_entries.column_id
      AND sub.institution_id = u.institution_id
      AND u.role = 'INSTITUTION_ADMIN'
  )
);

-- Org admins can read all grades across their organization.
CREATE POLICY grade_columns_select_org_admin
ON public.grade_columns
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.subjects sub
    JOIN public.institutions inst ON inst.id = sub.institution_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE sub.id = grade_columns.subject_id
      AND inst.organization_id = u.organization_id
      AND u.role = 'ORG_ADMIN'
  )
);

CREATE POLICY grade_entries_select_org_admin
ON public.grade_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.grade_columns gc
    JOIN public.subjects sub ON sub.id = gc.subject_id
    JOIN public.institutions inst ON inst.id = sub.institution_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE gc.id = grade_entries.column_id
      AND inst.organization_id = u.organization_id
      AND u.role = 'ORG_ADMIN'
  )
);

-- Ensure students cannot write grades.
CREATE POLICY grade_columns_student_insert_block
ON public.grade_columns
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY grade_columns_student_update_block
ON public.grade_columns
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY grade_columns_student_delete_block
ON public.grade_columns
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY grade_entries_student_insert_block
ON public.grade_entries
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY grade_entries_student_update_block
ON public.grade_entries
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY grade_entries_student_delete_block
ON public.grade_entries
FOR DELETE
TO authenticated
USING (false);
