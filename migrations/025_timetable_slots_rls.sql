-- Scope timetable slot access by authenticated user and institution.
-- Organization scope is resolved through institutions because legacy slots
-- may have a NULL organization_id.

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS timetable_slots_select ON public.timetable_slots;
CREATE POLICY timetable_slots_select
  ON public.timetable_slots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (
          u.role = 'SUPER_ADMIN'
          OR (
            u.role = 'ORG_ADMIN'
            AND EXISTS (
              SELECT 1
              FROM public.institutions i
              WHERE i.id = timetable_slots.institution_id
                AND i.organization_id = u.organization_id
            )
          )
          OR (
            u.role IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD')
            AND u.institution_id = timetable_slots.institution_id
          )
          OR (u.role = 'FACULTY' AND u.id = timetable_slots.faculty_id)
          OR (
            u.role = 'STUDENT'
            AND EXISTS (
              SELECT 1
              FROM public.students s
              WHERE s.id = u.id
                AND s.institution_id = timetable_slots.institution_id
                AND s.section_id = timetable_slots.section_id
            )
          )
          OR (
            u.role = 'PARENT'
            AND EXISTS (
              SELECT 1
              FROM public.parent_student_relations psr
              JOIN public.students s ON s.id = psr.student_id
              WHERE psr.parent_id = u.id
                AND s.institution_id = timetable_slots.institution_id
                AND s.section_id = timetable_slots.section_id
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS timetable_slots_manage ON public.timetable_slots;
CREATE POLICY timetable_slots_manage
  ON public.timetable_slots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (
          u.role = 'SUPER_ADMIN'
          OR (
            u.role = 'ORG_ADMIN'
            AND EXISTS (
              SELECT 1
              FROM public.institutions i
              WHERE i.id = timetable_slots.institution_id
                AND i.organization_id = u.organization_id
            )
          )
          OR (
            u.role = 'INSTITUTION_ADMIN'
            AND u.institution_id = timetable_slots.institution_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND (
          u.role = 'SUPER_ADMIN'
          OR (
            u.role = 'ORG_ADMIN'
            AND EXISTS (
              SELECT 1
              FROM public.institutions i
              WHERE i.id = timetable_slots.institution_id
                AND i.organization_id = u.organization_id
            )
          )
          OR (
            u.role = 'INSTITUTION_ADMIN'
            AND u.institution_id = timetable_slots.institution_id
          )
        )
    )
  );
