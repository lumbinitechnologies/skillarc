-- Close the gap between the checked-in policies and the live Data API.
-- This migration is additive/forward-only: existing rows are retained.

ALTER TABLE public.admission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_fee_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrolment_timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warning_letters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT u.organization_id
  FROM public.users AS u
  WHERE u.id = (SELECT auth.uid())
    AND u.is_active IS TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT u.role
  FROM public.users AS u
  WHERE u.id = (SELECT auth.uid())
    AND u.is_active IS TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_institution_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT u.institution_id
  FROM public.users AS u
  WHERE u.id = (SELECT auth.uid())
    AND u.is_active IS TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_is_in_current_tenant(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS actor
    JOIN public.users AS target ON target.id = p_user_id
    WHERE actor.id = (SELECT auth.uid())
      AND actor.is_active IS TRUE
      AND target.is_active IS TRUE
      AND (
        actor.role = 'SUPER_ADMIN'
        OR (
          actor.role = 'ORG_ADMIN'
          AND EXISTS (
            SELECT 1
            FROM public.institutions AS target_institution
            WHERE target_institution.id = target.institution_id
              AND target_institution.organization_id = actor.organization_id
          )
        )
        OR (
          actor.role IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
          AND actor.institution_id IS NOT NULL
          AND actor.institution_id = target.institution_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_linked_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student_relations AS relation
    JOIN public.users AS actor
      ON actor.id = relation.parent_id
    JOIN public.users AS student_user
      ON student_user.id = relation.student_id
    JOIN public.students AS student
      ON student.id = relation.student_id
    WHERE actor.id = (SELECT auth.uid())
      AND actor.role = 'PARENT'
      AND actor.is_active IS TRUE
      AND student_user.role = 'STUDENT'
      AND student_user.is_active IS TRUE
      AND student.institution_id = actor.institution_id
      AND relation.student_id = p_student_id
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_access_institution(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS actor
    WHERE actor.id = (SELECT auth.uid())
      AND actor.is_active IS TRUE
      AND (
        actor.role = 'SUPER_ADMIN'
        OR (
          actor.role = 'ORG_ADMIN'
          AND EXISTS (
            SELECT 1 FROM public.institutions AS institution
            WHERE institution.id = p_institution_id
              AND institution.organization_id = actor.organization_id
          )
        )
        OR (
          actor.role IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
          AND actor.institution_id = p_institution_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_access_student_section(
  p_student_id uuid,
  p_section_id uuid,
  p_institution_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS actor
    JOIN public.students AS student ON student.id = p_student_id
    JOIN public.sections AS section ON section.id = p_section_id
    WHERE actor.id = (SELECT auth.uid())
      AND actor.is_active IS TRUE
      AND student.institution_id = p_institution_id
      AND section.institution_id = p_institution_id
      AND (
        (actor.role = 'STUDENT' AND actor.id = student.id)
        OR (actor.role = 'PARENT' AND public.user_is_linked_student(student.id))
      )
      AND (
        (
          EXISTS (SELECT 1 FROM public.enrolments AS any_enrolment WHERE any_enrolment.student_id = student.id)
          AND EXISTS (
            SELECT 1
            FROM public.enrolments AS enrolment
            JOIN public.enrolment_units AS unit ON unit.enrolment_id = enrolment.id
            WHERE enrolment.student_id = student.id
              AND enrolment.institution_id = student.institution_id
              AND enrolment.status IN ('ENROLLED', 'ACTIVE')
              AND enrolment.started_at <= CURRENT_DATE
              AND (enrolment.ended_at IS NULL OR enrolment.ended_at >= CURRENT_DATE)
              AND enrolment.section_id = section.id
              AND unit.status = 'ACTIVE'
              AND unit.planned_start <= CURRENT_DATE
              AND unit.planned_end >= CURRENT_DATE
          )
        )
        OR (
          NOT EXISTS (SELECT 1 FROM public.enrolments AS any_enrolment WHERE any_enrolment.student_id = student.id)
          AND student.section_id = section.id
          AND (student.program_id IS NULL OR section.program_id = student.program_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_subject(
  p_subject_id uuid,
  p_section_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS actor
    JOIN public.subjects AS subject ON subject.id = p_subject_id
    WHERE actor.id = (SELECT auth.uid())
      AND actor.is_active IS TRUE
      AND (
        actor.role = 'SUPER_ADMIN'
        OR (actor.role = 'ORG_ADMIN' AND EXISTS (
          SELECT 1 FROM public.institutions AS institution
          WHERE institution.id = subject.institution_id
            AND institution.organization_id = actor.organization_id
        ))
        OR (actor.role IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'TEACHER')
          AND actor.institution_id = subject.institution_id)
        OR (actor.role = 'FACULTY' AND EXISTS (
          SELECT 1 FROM public.faculty_subjects AS assignment
          WHERE assignment.faculty_id = actor.id
            AND assignment.subject_id = subject.id
            AND assignment.institution_id = subject.institution_id
            AND (p_section_id IS NULL OR assignment.section_id IS NULL OR assignment.section_id = p_section_id)
        ))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_assignment(
  p_subject_id uuid,
  p_section_ids uuid[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN NOT public.current_user_can_manage_subject(p_subject_id) THEN false
    WHEN public.current_user_role() <> 'FACULTY' THEN
      NOT EXISTS (
        SELECT 1
        FROM unnest(coalesce(p_section_ids, ARRAY[]::uuid[])) AS target(section_id)
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.sections AS section
          JOIN public.subjects AS subject ON subject.id = p_subject_id
          WHERE section.id = target.section_id
            AND section.institution_id = subject.institution_id
        )
      )
    ELSE
      cardinality(coalesce(p_section_ids, ARRAY[]::uuid[])) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(p_section_ids) AS target(section_id)
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.faculty_subjects AS assignment
          WHERE assignment.faculty_id = (SELECT auth.uid())
            AND assignment.subject_id = p_subject_id
            AND assignment.institution_id = public.current_user_institution_id()
            AND (assignment.section_id IS NULL OR assignment.section_id = target.section_id)
        )
      )
  END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_section_subject_relationship(
  p_student_id uuid,
  p_subject_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students AS student
    JOIN public.sections AS section ON section.id = student.section_id
    JOIN public.subjects AS subject ON subject.id = p_subject_id
    WHERE student.id = p_student_id
      AND student.section_id IS NOT NULL
      AND student.institution_id = subject.institution_id
      AND section.institution_id = student.institution_id
      AND (student.program_id IS NULL OR section.program_id = student.program_id)
      AND (
        EXISTS (
          SELECT 1 FROM public.faculty_subjects AS assignment
          WHERE assignment.subject_id = subject.id
            AND assignment.institution_id = subject.institution_id
            AND assignment.section_id = student.section_id
        )
        OR EXISTS (
          SELECT 1 FROM public.timetable_slots AS slot
          WHERE slot.subject_id = subject.id
            AND slot.institution_id = subject.institution_id
            AND slot.section_id = student.section_id
        )
        OR EXISTS (
          SELECT 1 FROM public.assignments AS assignment
          WHERE assignment.subject_id = subject.id
            AND student.section_id = ANY(coalesce(assignment.section_ids, ARRAY[]::uuid[]))
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_access_student_subject(
  p_student_id uuid,
  p_subject_id uuid,
  p_section_ids uuid[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS actor
    JOIN public.students AS student ON student.id = p_student_id
    JOIN public.subjects AS subject ON subject.id = p_subject_id
    WHERE actor.id = (SELECT auth.uid())
      AND actor.is_active IS TRUE
      AND student.institution_id = subject.institution_id
      AND (
        (actor.role = 'STUDENT' AND actor.id = student.id)
        OR (actor.role = 'PARENT' AND public.user_is_linked_student(student.id))
      )
      AND (
        (
          EXISTS (SELECT 1 FROM public.enrolments AS any_enrolment WHERE any_enrolment.student_id = student.id)
          AND EXISTS (
            SELECT 1
            FROM public.enrolments AS enrolment
            JOIN public.enrolment_units AS unit ON unit.enrolment_id = enrolment.id
            WHERE enrolment.student_id = student.id
              AND enrolment.institution_id = student.institution_id
              AND enrolment.status IN ('ENROLLED', 'ACTIVE')
              AND enrolment.started_at <= CURRENT_DATE
              AND (enrolment.ended_at IS NULL OR enrolment.ended_at >= CURRENT_DATE)
              AND (cardinality(coalesce(p_section_ids, ARRAY[]::uuid[])) = 0
                OR enrolment.section_id = ANY(p_section_ids))
              AND unit.subject_id = subject.id
              AND unit.status = 'ACTIVE'
              AND unit.planned_start <= CURRENT_DATE
              AND unit.planned_end >= CURRENT_DATE
          )
        )
        OR (
          NOT EXISTS (SELECT 1 FROM public.enrolments AS any_enrolment WHERE any_enrolment.student_id = student.id)
          AND student.section_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.sections AS section
            WHERE section.id = student.section_id
              AND section.institution_id = student.institution_id
              AND (student.program_id IS NULL OR section.program_id = student.program_id)
          )
          AND (
            cardinality(coalesce(p_section_ids, ARRAY[]::uuid[])) = 0
            OR student.section_id = ANY(p_section_ids)
          )
          AND public.current_user_has_section_subject_relationship(student.id, subject.id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_read_subject(p_subject_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.current_user_can_manage_subject(p_subject_id)
    OR EXISTS (
      SELECT 1
      FROM public.users AS actor
      JOIN public.students AS student ON student.id = actor.id
      JOIN public.subjects AS subject ON subject.id = p_subject_id
      WHERE actor.id = (SELECT auth.uid())
        AND actor.role = 'STUDENT'
        AND actor.is_active IS TRUE
        AND public.current_user_can_access_student_subject(
          student.id, subject.id,
          CASE WHEN EXISTS (
            SELECT 1 FROM public.enrolments AS enrolment
            WHERE enrolment.student_id = student.id
          ) THEN ARRAY[]::uuid[] ELSE ARRAY(
            SELECT section_id FROM (
              SELECT faculty_assignment.section_id
              FROM public.faculty_subjects AS faculty_assignment
              JOIN public.sections AS section ON section.id = faculty_assignment.section_id
              WHERE faculty_assignment.subject_id = subject.id
                AND faculty_assignment.institution_id = subject.institution_id
                AND section.institution_id = subject.institution_id
              UNION
              SELECT slot.section_id
              FROM public.timetable_slots AS slot
              JOIN public.sections AS section ON section.id = slot.section_id
              WHERE slot.subject_id = subject.id
                AND slot.institution_id = subject.institution_id
                AND section.institution_id = subject.institution_id
              UNION
              SELECT target.section_id
              FROM public.assignments AS assignment
              CROSS JOIN LATERAL unnest(coalesce(assignment.section_ids, ARRAY[]::uuid[])) AS target(section_id)
              JOIN public.sections AS section ON section.id = target.section_id
              WHERE assignment.subject_id = subject.id
                AND section.institution_id = subject.institution_id
            ) AS relationships
          ) END
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.users AS actor
      JOIN public.parent_student_relations AS relation ON relation.parent_id = actor.id
      JOIN public.students AS student ON student.id = relation.student_id
      JOIN public.subjects AS subject ON subject.id = p_subject_id
      WHERE actor.id = (SELECT auth.uid())
        AND actor.role = 'PARENT'
        AND actor.is_active IS TRUE
        AND public.current_user_can_access_student_subject(
          student.id, subject.id,
          CASE WHEN EXISTS (
            SELECT 1 FROM public.enrolments AS enrolment
            WHERE enrolment.student_id = student.id
          ) THEN ARRAY[]::uuid[] ELSE ARRAY(
            SELECT section_id FROM (
              SELECT faculty_assignment.section_id
              FROM public.faculty_subjects AS faculty_assignment
              JOIN public.sections AS section ON section.id = faculty_assignment.section_id
              WHERE faculty_assignment.subject_id = subject.id
                AND faculty_assignment.institution_id = subject.institution_id
                AND section.institution_id = subject.institution_id
              UNION
              SELECT slot.section_id
              FROM public.timetable_slots AS slot
              JOIN public.sections AS section ON section.id = slot.section_id
              WHERE slot.subject_id = subject.id
                AND slot.institution_id = subject.institution_id
                AND section.institution_id = subject.institution_id
              UNION
              SELECT target.section_id
              FROM public.assignments AS assignment
              CROSS JOIN LATERAL unnest(coalesce(assignment.section_ids, ARRAY[]::uuid[])) AS target(section_id)
              JOIN public.sections AS section ON section.id = target.section_id
              WHERE assignment.subject_id = subject.id
                AND section.institution_id = subject.institution_id
            ) AS relationships
          ) END
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_read_attendance_session(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.attendance_sessions AS session
    WHERE session.id = p_session_id
      AND (
        public.current_user_can_manage_subject(session.subject_id, session.section_id)
        OR public.current_user_can_access_student_subject(
          (SELECT auth.uid()), session.subject_id, ARRAY[session.section_id]
        )
        OR EXISTS (
          SELECT 1 FROM public.parent_student_relations AS relation
          WHERE relation.parent_id = (SELECT auth.uid())
            AND public.current_user_can_access_student_subject(
              relation.student_id, session.subject_id, ARRAY[session.section_id]
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.attendance_records AS record
          WHERE record.session_id = session.id
            AND (record.student_id = (SELECT auth.uid())
              OR public.user_is_linked_student(record.student_id))
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_organization_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_is_in_current_tenant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_is_linked_student(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_access_institution(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_access_student_section(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_manage_subject(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_manage_assignment(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_has_section_subject_relationship(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_access_student_subject(uuid, uuid, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_read_subject(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_read_attendance_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_organization_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_is_in_current_tenant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_is_linked_student(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_access_institution(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_access_student_section(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_manage_subject(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_manage_assignment(uuid, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_has_section_subject_relationship(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_access_student_subject(uuid, uuid, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_read_subject(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_read_attendance_session(uuid) TO authenticated, service_role;

ALTER FUNCTION public.current_user_institution_id() SET search_path = pg_catalog, public;
ALTER FUNCTION public.current_user_role() SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_meeting_host(uuid, uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_meeting_participant(uuid, uuid) SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.current_user_institution_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_meeting_host(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_meeting_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_institution_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_meeting_host(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_meeting_participant(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_meeting_host(p_meeting_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.meetings AS meeting
      WHERE meeting.id = p_meeting_id
        AND meeting.faculty_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_meeting_participant(p_meeting_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.meeting_participants AS participant
      WHERE participant.meeting_id = p_meeting_id
        AND participant.user_id = p_user_id
    );
$$;

-- These privileged RPCs are only called by server code that has already
-- verified the actor. Never let a Data API caller supply a forged actor id.
REVOKE ALL ON FUNCTION public.admissions_generate_offer(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admissions_generate_offer(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.delete_organization_cascade(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_organization_cascade(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.sync_offer_letter_currency() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS institutions_select_scoped ON public.institutions;
DROP POLICY IF EXISTS institutions_select_scoped ON public.institutions;
CREATE POLICY institutions_select_scoped ON public.institutions
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND organization_id = current_user_organization_id())
    OR id = current_user_institution_id()
  );
DROP POLICY IF EXISTS users_select_scoped ON public.users;
DROP POLICY IF EXISTS users_select_scoped ON public.users;
CREATE POLICY users_select_scoped ON public.users
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND organization_id = current_user_organization_id())
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD')
      AND institution_id = current_user_institution_id())
    OR user_is_linked_student(id)
    OR (current_user_role() = 'FACULTY' AND EXISTS (
      SELECT 1
      FROM public.students AS student
      JOIN public.faculty_subjects AS faculty_assignment
        ON faculty_assignment.section_id = student.section_id
      WHERE student.id = users.id
        AND student.institution_id = current_user_institution_id()
        AND faculty_assignment.faculty_id = (SELECT auth.uid())
        AND faculty_assignment.institution_id = student.institution_id
    ))
  );

DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS users_update_tenant_admin ON public.users;
CREATE POLICY users_update_tenant_admin ON public.users
  FOR UPDATE TO authenticated
  USING (
    id <> (SELECT auth.uid())
    AND (
      current_user_role() = 'SUPER_ADMIN'
      OR (current_user_role() = 'ORG_ADMIN' AND organization_id = current_user_organization_id())
      OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
    )
  )
  WITH CHECK (
    id <> (SELECT auth.uid())
    AND (
      current_user_role() = 'SUPER_ADMIN'
      OR (
        current_user_role() = 'ORG_ADMIN'
        AND organization_id = current_user_organization_id()
        AND (institution_id IS NULL OR EXISTS (
          SELECT 1 FROM public.institutions AS i
          WHERE i.id = users.institution_id
            AND i.organization_id = current_user_organization_id()
        ))
      )
      OR (
        current_user_role() = 'INSTITUTION_ADMIN'
        AND institution_id = current_user_institution_id()
        AND organization_id = current_user_organization_id()
      )
    )
  );

REVOKE ALL ON public.users FROM anon;

DROP POLICY IF EXISTS academic_calendar_events_read ON public.academic_calendar_events;
DROP POLICY IF EXISTS academic_calendar_events_admin_manage ON public.academic_calendar_events;
DROP POLICY IF EXISTS academic_calendar_events_admin_manage_scoped ON public.academic_calendar_events;
CREATE POLICY academic_calendar_events_admin_manage_scoped ON public.academic_calendar_events
  FOR ALL TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = academic_calendar_events.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  )
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = academic_calendar_events.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  );
DROP POLICY IF EXISTS academic_calendar_events_read ON public.academic_calendar_events;
CREATE POLICY academic_calendar_events_read ON public.academic_calendar_events
  FOR SELECT TO authenticated
  USING (
    institution_id IS NULL
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = academic_calendar_events.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR institution_id = current_user_institution_id()
  );

DROP POLICY IF EXISTS all_settings ON public.institution_timetable_settings;
DROP POLICY IF EXISTS select_settings ON public.institution_timetable_settings;
DROP POLICY IF EXISTS institution_timetable_settings_read_scoped ON public.institution_timetable_settings;
CREATE POLICY institution_timetable_settings_read_scoped ON public.institution_timetable_settings
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = institution_timetable_settings.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR institution_id = current_user_institution_id()
  );
DROP POLICY IF EXISTS institution_timetable_settings_manage_scoped ON public.institution_timetable_settings;
CREATE POLICY institution_timetable_settings_manage_scoped ON public.institution_timetable_settings
  FOR ALL TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = institution_timetable_settings.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  )
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = institution_timetable_settings.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  );

DROP POLICY IF EXISTS companies_select ON public.companies;
DROP POLICY IF EXISTS companies_select_scoped ON public.companies;
CREATE POLICY companies_select_scoped ON public.companies
  FOR SELECT TO authenticated
  USING (
    institution_id IS NULL
    OR current_user_role() = 'SUPER_ADMIN'
    OR institution_id = current_user_institution_id()
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = companies.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
  );

DROP POLICY IF EXISTS announcement_replies_all ON public.announcement_replies;
DROP POLICY IF EXISTS announcement_replies_read_scoped ON public.announcement_replies;
CREATE POLICY announcement_replies_read_scoped ON public.announcement_replies
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.subject_announcements AS announcement
    JOIN public.subjects AS subject ON subject.id = announcement.subject_id
    WHERE announcement.id = announcement_replies.post_id
      AND (subject.institution_id = current_user_institution_id()
        OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
          SELECT 1 FROM public.institutions AS i
          WHERE i.id = subject.institution_id
            AND i.organization_id = current_user_organization_id()
        ))
        OR current_user_role() = 'SUPER_ADMIN')
  ));

DROP POLICY IF EXISTS subject_announcements_all ON public.subject_announcements;
DROP POLICY IF EXISTS subject_announcements_read_scoped ON public.subject_announcements;
CREATE POLICY subject_announcements_read_scoped ON public.subject_announcements
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.subjects AS subject
      JOIN public.institutions AS i ON i.id = subject.institution_id
      WHERE subject.id = subject_announcements.subject_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR EXISTS (
      SELECT 1 FROM public.subjects AS subject
      WHERE subject.id = subject_announcements.subject_id
        AND subject.institution_id = current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS timetable_slots_select ON public.timetable_slots;
DROP POLICY IF EXISTS timetable_slots_manage ON public.timetable_slots;
DROP POLICY IF EXISTS timetable_slots_select_scoped ON public.timetable_slots;
DROP POLICY IF EXISTS timetable_slots_builder_manage ON public.timetable_slots;
DROP POLICY IF EXISTS timetable_slots_manage_scoped ON public.timetable_slots;
CREATE POLICY timetable_slots_select_scoped ON public.timetable_slots
  FOR SELECT TO authenticated
  USING (
    public.current_user_can_manage_subject(subject_id, section_id)
    OR public.current_user_can_access_student_subject((SELECT auth.uid()), subject_id, ARRAY[section_id])
    OR EXISTS (
      SELECT 1 FROM public.parent_student_relations AS relation
      WHERE relation.parent_id = (SELECT auth.uid())
        AND public.current_user_can_access_student_subject(relation.student_id, subject_id, ARRAY[section_id])
    )
  );
CREATE POLICY timetable_slots_manage_scoped ON public.timetable_slots
  FOR ALL TO authenticated
  USING (
    public.current_user_can_manage_subject(subject_id, section_id)
    AND EXISTS (
      SELECT 1 FROM public.sections AS section
      JOIN public.subjects AS subject ON subject.id = timetable_slots.subject_id
      WHERE section.id = timetable_slots.section_id
        AND section.institution_id = subject.institution_id
        AND timetable_slots.institution_id = subject.institution_id
    )
  )
  WITH CHECK (
    public.current_user_can_manage_subject(subject_id, section_id)
    AND (public.current_user_role() <> 'FACULTY' OR faculty_id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.sections AS section
      JOIN public.subjects AS subject ON subject.id = timetable_slots.subject_id
      WHERE section.id = timetable_slots.section_id
        AND section.institution_id = subject.institution_id
        AND timetable_slots.institution_id = subject.institution_id
    )
  );

DROP POLICY IF EXISTS allow_authenticated_all_attendance_warnings ON public.attendance_warning_letters;
DROP POLICY IF EXISTS attendance_warning_letters_read_scoped ON public.attendance_warning_letters;
CREATE POLICY attendance_warning_letters_read_scoped ON public.attendance_warning_letters
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = attendance_warning_letters.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'FACULTY')
      AND institution_id = current_user_institution_id())
  );

DROP POLICY IF EXISTS enrolments_all ON public.enrolments;
DROP POLICY IF EXISTS enrolments_read_scoped ON public.enrolments;
CREATE POLICY enrolments_read_scoped ON public.enrolments
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR user_is_linked_student(student_id)
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = enrolments.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD')
      AND institution_id = current_user_institution_id())
    OR (current_user_role() = 'FACULTY' AND (
      trainer_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.faculty_subjects AS faculty_assignment
        WHERE faculty_assignment.faculty_id = (SELECT auth.uid())
          AND faculty_assignment.institution_id = enrolments.institution_id
          AND faculty_assignment.section_id = enrolments.section_id
      )
    ))
  );
REVOKE ALL ON public.enrolments FROM anon, authenticated;
GRANT SELECT ON public.enrolments TO authenticated;
GRANT ALL ON public.enrolments TO service_role;

DROP POLICY IF EXISTS parent_student_relations_manage ON public.parent_student_relations;
DROP POLICY IF EXISTS parent_student_relations_select ON public.parent_student_relations;
DROP POLICY IF EXISTS parent_student_relations_read_scoped ON public.parent_student_relations;
CREATE POLICY parent_student_relations_read_scoped ON public.parent_student_relations
  FOR SELECT TO authenticated
  USING (
    parent_id = (SELECT auth.uid())
    OR student_id = (SELECT auth.uid())
    OR user_is_in_current_tenant(student_id)
  );
DROP POLICY IF EXISTS parent_student_relations_manage_scoped ON public.parent_student_relations;
CREATE POLICY parent_student_relations_manage_scoped ON public.parent_student_relations
  FOR ALL TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(student_id))
  )
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(student_id)
      AND user_is_in_current_tenant(parent_id))
  );
REVOKE ALL ON public.parent_student_relations FROM anon;

DROP POLICY IF EXISTS "Allow authenticated users" ON public.leave_applications;
DROP POLICY IF EXISTS leave_applications_select ON public.leave_applications;
DROP POLICY IF EXISTS leave_applications_insert ON public.leave_applications;
DROP POLICY IF EXISTS leave_applications_read_scoped ON public.leave_applications;
CREATE POLICY leave_applications_read_scoped ON public.leave_applications
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR (advisor_id = (SELECT auth.uid()) AND institution_id = current_user_institution_id())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = leave_applications.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'FACULTY')
      AND institution_id = current_user_institution_id())
  );
DROP POLICY IF EXISTS leave_applications_student_insert_scoped ON public.leave_applications;
CREATE POLICY leave_applications_student_insert_scoped ON public.leave_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND current_user_role() = 'STUDENT'
    AND institution_id = current_user_institution_id()
    AND status = 'PENDING'
    AND approved_by IS NULL
    AND EXISTS (
      SELECT 1 FROM public.students AS student
      WHERE student.id = (SELECT auth.uid())
        AND student.institution_id = leave_applications.institution_id
        AND (leave_applications.section_id IS NULL OR student.section_id = leave_applications.section_id)
    )
  );
REVOKE ALL ON public.leave_applications FROM anon;
GRANT SELECT, INSERT ON public.leave_applications TO authenticated;
GRANT ALL ON public.leave_applications TO service_role;

DROP POLICY IF EXISTS manage_timetable_weeks ON public.timetable_weeks;
DROP POLICY IF EXISTS select_timetable_weeks ON public.timetable_weeks;
DROP POLICY IF EXISTS timetable_weeks_read_scoped ON public.timetable_weeks;
CREATE POLICY timetable_weeks_read_scoped ON public.timetable_weeks
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = timetable_weeks.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD')
      AND institution_id = current_user_institution_id())
    OR public.current_user_can_access_student_section(
      (SELECT auth.uid()), timetable_weeks.section_id, timetable_weeks.institution_id
    )
    OR EXISTS (
      SELECT 1 FROM public.timetable_slots AS slot
      WHERE slot.week_id = timetable_weeks.id
        AND slot.faculty_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.parent_student_relations AS relation
      WHERE relation.parent_id = (SELECT auth.uid())
        AND public.current_user_can_access_student_section(
          relation.student_id, timetable_weeks.section_id, timetable_weeks.institution_id
        )
    )
  );
DROP POLICY IF EXISTS timetable_weeks_manage_scoped ON public.timetable_weeks;
CREATE POLICY timetable_weeks_manage_scoped ON public.timetable_weeks
  FOR ALL TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = timetable_weeks.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD')
      AND institution_id = current_user_institution_id())
    OR EXISTS (
      SELECT 1 FROM public.user_permissions AS up
      JOIN public.permissions AS permission ON permission.id = up.permission_id
      WHERE up.user_id = (SELECT auth.uid())
        AND permission.name = 'timetable_builder'
        AND institution_id = current_user_institution_id()
    )
  )
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = timetable_weeks.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD')
      AND institution_id = current_user_institution_id())
    OR EXISTS (
      SELECT 1 FROM public.user_permissions AS up
      JOIN public.permissions AS permission ON permission.id = up.permission_id
      WHERE up.user_id = (SELECT auth.uid())
        AND permission.name = 'timetable_builder'
        AND institution_id = current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS payment_plans_read_scoped ON public.payment_plans;
CREATE POLICY payment_plans_read_scoped ON public.payment_plans
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR user_is_linked_student(student_id)
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = payment_plans.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  );
DROP POLICY IF EXISTS payment_plans_admin_insert ON public.payment_plans;
CREATE POLICY payment_plans_admin_insert ON public.payment_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    (current_user_role() = 'SUPER_ADMIN'
      OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
        SELECT 1 FROM public.institutions AS i WHERE i.id = payment_plans.institution_id AND i.organization_id = current_user_organization_id()
      ))
      OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id()))
    AND EXISTS (
      SELECT 1 FROM public.students AS student
      WHERE student.id = payment_plans.student_id
        AND student.institution_id = payment_plans.institution_id
    )
  );
DROP POLICY IF EXISTS payment_plans_admin_update ON public.payment_plans;
CREATE POLICY payment_plans_admin_update ON public.payment_plans
  FOR UPDATE TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i WHERE i.id = payment_plans.institution_id AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  )
  WITH CHECK (
    (current_user_role() = 'SUPER_ADMIN'
      OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
        SELECT 1 FROM public.institutions AS i WHERE i.id = payment_plans.institution_id AND i.organization_id = current_user_organization_id()
      ))
      OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id()))
    AND EXISTS (
      SELECT 1 FROM public.students AS student
      WHERE student.id = payment_plans.student_id
        AND student.institution_id = payment_plans.institution_id
    )
  );
DROP POLICY IF EXISTS payment_plans_admin_delete ON public.payment_plans;
CREATE POLICY payment_plans_admin_delete ON public.payment_plans
  FOR DELETE TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i WHERE i.id = payment_plans.institution_id AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  );

DROP POLICY IF EXISTS invoices_read_scoped ON public.invoices;
CREATE POLICY invoices_read_scoped ON public.invoices
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.payment_plans AS plan
    WHERE plan.id = invoices.payment_plan_id
      AND (
        plan.student_id = (SELECT auth.uid())
        OR user_is_linked_student(plan.student_id)
        OR current_user_role() = 'SUPER_ADMIN'
        OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
          SELECT 1 FROM public.institutions AS i
          WHERE i.id = plan.institution_id
            AND i.organization_id = current_user_organization_id()
        ))
        OR (current_user_role() = 'INSTITUTION_ADMIN' AND plan.institution_id = current_user_institution_id())
      )
  ));
DROP POLICY IF EXISTS invoices_admin_insert ON public.invoices;
CREATE POLICY invoices_admin_insert ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.payment_plans AS plan
    WHERE plan.id = invoices.payment_plan_id
      AND (
        current_user_role() = 'SUPER_ADMIN'
        OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
          SELECT 1 FROM public.institutions AS i
          WHERE i.id = plan.institution_id
            AND i.organization_id = current_user_organization_id()
        ))
        OR (current_user_role() = 'INSTITUTION_ADMIN' AND plan.institution_id = current_user_institution_id())
      )
  ));
DROP POLICY IF EXISTS invoices_admin_update ON public.invoices;
CREATE POLICY invoices_admin_update ON public.invoices
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.payment_plans AS plan
    WHERE plan.id = invoices.payment_plan_id
      AND (
        current_user_role() = 'SUPER_ADMIN'
        OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
          SELECT 1 FROM public.institutions AS i
          WHERE i.id = plan.institution_id
            AND i.organization_id = current_user_organization_id()
        ))
        OR (current_user_role() = 'INSTITUTION_ADMIN' AND plan.institution_id = current_user_institution_id())
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.payment_plans AS plan
    WHERE plan.id = invoices.payment_plan_id
      AND (
        current_user_role() = 'SUPER_ADMIN'
        OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
          SELECT 1 FROM public.institutions AS i
          WHERE i.id = plan.institution_id
            AND i.organization_id = current_user_organization_id()
        ))
        OR (current_user_role() = 'INSTITUTION_ADMIN' AND plan.institution_id = current_user_institution_id())
      )
  ));
DROP POLICY IF EXISTS invoices_admin_delete ON public.invoices;
CREATE POLICY invoices_admin_delete ON public.invoices
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.payment_plans AS plan
    WHERE plan.id = invoices.payment_plan_id
      AND (
        current_user_role() = 'SUPER_ADMIN'
        OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
          SELECT 1 FROM public.institutions AS i
          WHERE i.id = plan.institution_id
            AND i.organization_id = current_user_organization_id()
        ))
        OR (current_user_role() = 'INSTITUTION_ADMIN' AND plan.institution_id = current_user_institution_id())
      )
  ));

DROP POLICY IF EXISTS payments_admin_insert ON public.payments;
CREATE POLICY payments_admin_insert ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.invoices AS invoice
    JOIN public.payment_plans AS plan ON plan.id = invoice.payment_plan_id
    WHERE invoice.id = payments.invoice_id
      AND (
        current_user_role() = 'SUPER_ADMIN'
        OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
          SELECT 1 FROM public.institutions AS i
          WHERE i.id = plan.institution_id
            AND i.organization_id = current_user_organization_id()
        ))
        OR (current_user_role() = 'INSTITUTION_ADMIN' AND plan.institution_id = current_user_institution_id())
      )
  ));

DROP POLICY IF EXISTS "Allow authenticated users" ON public.leave_applications;

DROP POLICY IF EXISTS announcements_select ON public.announcements;
DROP POLICY IF EXISTS announcements_select_scoped ON public.announcements;
CREATE POLICY announcements_select_scoped ON public.announcements
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = announcements.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR institution_id = current_user_institution_id()
  );

DROP POLICY IF EXISTS announcements_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_insert_scoped ON public.announcements;
CREATE POLICY announcements_insert_scoped ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    (current_user_role() = 'SUPER_ADMIN'
      OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
        SELECT 1 FROM public.institutions AS i
        WHERE i.id = announcements.institution_id
          AND i.organization_id = current_user_organization_id()
      ))
      OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
        AND institution_id = current_user_institution_id()))
  );
DROP POLICY IF EXISTS announcements_update ON public.announcements;
DROP POLICY IF EXISTS announcements_update_scoped ON public.announcements;
CREATE POLICY announcements_update_scoped ON public.announcements
  FOR UPDATE TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = announcements.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
      AND institution_id = current_user_institution_id())
  )
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = announcements.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
      AND institution_id = current_user_institution_id())
  );
DROP POLICY IF EXISTS announcements_delete ON public.announcements;
DROP POLICY IF EXISTS announcements_delete_scoped ON public.announcements;
CREATE POLICY announcements_delete_scoped ON public.announcements
  FOR DELETE TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = announcements.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
      AND institution_id = current_user_institution_id())
  );

DROP POLICY IF EXISTS parent_student_relations_manage ON public.parent_student_relations;

DROP POLICY IF EXISTS admission_documents_client_access ON public.admission_documents;
REVOKE ALL ON public.admission_documents FROM anon, authenticated;
REVOKE ALL ON public.admissions_applications FROM anon, authenticated;
REVOKE ALL ON public.offer_letters FROM anon, authenticated;
REVOKE ALL ON public.online_sessions FROM anon, authenticated;
REVOKE ALL ON public.online_session_participants FROM anon, authenticated;
REVOKE ALL ON public.education_agents FROM anon, authenticated;
GRANT ALL ON public.admission_documents, public.admissions_applications, public.offer_letters,
  public.online_sessions, public.online_session_participants, public.education_agents TO service_role;

REVOKE ALL ON public.permissions FROM anon, authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;

REVOKE ALL ON public.user_permissions FROM anon, authenticated;
GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
DROP POLICY IF EXISTS user_permissions_read_scoped ON public.user_permissions;
DROP POLICY IF EXISTS user_permissions_read_scoped ON public.user_permissions;
CREATE POLICY user_permissions_read_scoped ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR user_is_in_current_tenant(user_id)
  );

REVOKE ALL ON public.warning_letters FROM anon, authenticated;
GRANT SELECT ON public.warning_letters TO authenticated;
GRANT ALL ON public.warning_letters TO service_role;
DROP POLICY IF EXISTS warning_letters_read_scoped ON public.warning_letters;
CREATE POLICY warning_letters_read_scoped ON public.warning_letters
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.institutions AS i
      WHERE i.id = warning_letters.institution_id
        AND i.organization_id = current_user_organization_id()
    ))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  );

DROP POLICY IF EXISTS permissions_read_authenticated ON public.permissions;
CREATE POLICY permissions_read_authenticated ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON public.payment_plans FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_plans TO authenticated;
GRANT ALL ON public.payment_plans TO service_role;
REVOKE ALL ON public.invoices FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
REVOKE ALL ON public.payments FROM anon, authenticated;
GRANT INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

REVOKE ALL ON public.enrolments FROM anon;
REVOKE ALL ON public.parent_student_relations FROM anon;
REVOKE ALL ON public.announcement_replies FROM anon;
REVOKE ALL ON public.subject_announcements FROM anon;
REVOKE ALL ON public.attendance_warning_letters FROM anon;

-- Admission applications, offers, admission documents and their audit/config
-- tables are accessed through server handlers, which verify the actor before
-- using the service role. They are not direct Data API resources.
DROP POLICY IF EXISTS admission_documents_v2_scoped ON public.admission_documents_v2;
DROP POLICY IF EXISTS admission_fee_configurations_scoped ON public.admission_fee_configurations;
DROP POLICY IF EXISTS admission_status_history_scoped ON public.admission_status_history;
DROP POLICY IF EXISTS admission_templates_scoped ON public.admission_templates;
REVOKE ALL ON public.admission_documents_v2, public.admission_fee_configurations,
  public.admission_status_history, public.admission_templates FROM anon, authenticated;
GRANT ALL ON public.admission_documents_v2, public.admission_fee_configurations,
  public.admission_status_history, public.admission_templates TO service_role;
REVOKE ALL ON FUNCTION public.admissions_convert_to_enrolment(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admissions_convert_to_enrolment(uuid, uuid, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.delete_institution_cascade(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_institution_cascade(uuid) TO service_role;

DROP POLICY IF EXISTS admission_documents_client_access ON public.admission_documents;

DROP POLICY IF EXISTS applications_select ON public.applications;
DROP POLICY IF EXISTS applications_select_scoped ON public.applications;
CREATE POLICY applications_select_scoped ON public.applications
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.job_posts AS post
      WHERE post.id = applications.job_post_id
        AND current_user_can_access_institution(post.institution_id)
    )
  );
DROP POLICY IF EXISTS applications_insert ON public.applications;
DROP POLICY IF EXISTS applications_insert_self_scoped ON public.applications;
CREATE POLICY applications_insert_self_scoped ON public.applications
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.job_posts AS post
      WHERE post.id = applications.job_post_id
        AND post.institution_id = current_user_institution_id()
    )
  );

DROP POLICY IF EXISTS assignments_select ON public.assignments;
DROP POLICY IF EXISTS assignments_select_scoped ON public.assignments;
CREATE POLICY assignments_select_scoped ON public.assignments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.subjects AS subject
    WHERE subject.id = assignments.subject_id
      AND (
        subject.institution_id = current_user_institution_id()
        OR current_user_can_access_institution(subject.institution_id)
      )
  ));

DROP POLICY IF EXISTS attendance_records_select ON public.attendance_records;
DROP POLICY IF EXISTS attendance_records_select_scoped ON public.attendance_records;
CREATE POLICY attendance_records_select_scoped ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR user_is_linked_student(student_id)
    OR public.current_user_can_read_attendance_session(session_id)
  );
DROP POLICY IF EXISTS attendance_sessions_select ON public.attendance_sessions;
DROP POLICY IF EXISTS attendance_sessions_select_scoped ON public.attendance_sessions;
CREATE POLICY attendance_sessions_select_scoped ON public.attendance_sessions
  FOR SELECT TO authenticated
  USING (public.current_user_can_read_attendance_session(id));

DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_scoped ON public.audit_logs;
CREATE POLICY audit_logs_select_scoped ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(user_id))
  );

DROP POLICY IF EXISTS complaints_select ON public.complaints;
DROP POLICY IF EXISTS complaints_select_scoped ON public.complaints;
CREATE POLICY complaints_select_scoped ON public.complaints
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD')
      AND user_is_in_current_tenant(student_id))
  );

DROP POLICY IF EXISTS departments_select_scoped ON public.departments;
DROP POLICY IF EXISTS departments_select_scoped ON public.departments;
CREATE POLICY departments_select_scoped ON public.departments
  FOR SELECT TO authenticated
  USING (institution_id = current_user_institution_id()
    OR current_user_can_access_institution(institution_id));

DROP POLICY IF EXISTS admission_status_history_scoped ON public.admission_status_history;
DROP POLICY IF EXISTS enrolment_timetable_slots_scoped ON public.enrolment_timetable_slots;
DROP POLICY IF EXISTS enrolment_units_scoped ON public.enrolment_units;
REVOKE ALL ON public.enrolment_timetable_slots, public.enrolment_units FROM anon, authenticated;
GRANT ALL ON public.enrolment_timetable_slots, public.enrolment_units TO service_role;

DROP POLICY IF EXISTS event_registrations_select ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_select_scoped ON public.event_registrations;
CREATE POLICY event_registrations_select_scoped ON public.event_registrations
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events AS event
      WHERE event.id = event_registrations.event_id
        AND current_user_can_access_institution(event.institution_id)
    )
  );
DROP POLICY IF EXISTS event_registrations_insert ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_insert_scoped ON public.event_registrations;
CREATE POLICY event_registrations_insert_scoped ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.events AS event
      WHERE event.id = event_registrations.event_id
        AND (event.institution_id = current_user_institution_id()
          OR current_user_can_access_institution(event.institution_id))
    )
  );
DROP POLICY IF EXISTS event_registrations_delete ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_delete_scoped ON public.event_registrations;
CREATE POLICY event_registrations_delete_scoped ON public.event_registrations
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events AS event
      WHERE event.id = event_registrations.event_id
        AND current_user_can_access_institution(event.institution_id)
    )
  );

DROP POLICY IF EXISTS events_select ON public.events;
DROP POLICY IF EXISTS events_select_scoped ON public.events;
CREATE POLICY events_select_scoped ON public.events
  FOR SELECT TO authenticated
  USING (institution_id = current_user_institution_id()
    OR current_user_can_access_institution(institution_id));
DROP POLICY IF EXISTS events_insert ON public.events;
DROP POLICY IF EXISTS events_insert_scoped ON public.events;
CREATE POLICY events_insert_scoped ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    (current_user_role() = 'SUPER_ADMIN'
      OR (current_user_role() = 'ORG_ADMIN' AND current_user_can_access_institution(institution_id))
      OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
        AND institution_id = current_user_institution_id()))
  );
DROP POLICY IF EXISTS events_update ON public.events;
DROP POLICY IF EXISTS events_update_scoped ON public.events;
CREATE POLICY events_update_scoped ON public.events
  FOR UPDATE TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND current_user_can_access_institution(institution_id))
    OR (institution_id = current_user_institution_id()
      AND (created_by = (SELECT auth.uid())
        OR current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')))
  )
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND current_user_can_access_institution(institution_id))
    OR (institution_id = current_user_institution_id()
      AND (created_by = (SELECT auth.uid())
        OR current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')))
  );
DROP POLICY IF EXISTS events_delete ON public.events;
DROP POLICY IF EXISTS events_delete_scoped ON public.events;
CREATE POLICY events_delete_scoped ON public.events
  FOR DELETE TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND current_user_can_access_institution(institution_id))
    OR (institution_id = current_user_institution_id()
      AND (created_by = (SELECT auth.uid()) OR current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')))
  );

DROP POLICY IF EXISTS faculty_subjects_select_scoped ON public.faculty_subjects;
DROP POLICY IF EXISTS faculty_subjects_select_scoped ON public.faculty_subjects;
CREATE POLICY faculty_subjects_select_scoped ON public.faculty_subjects
  FOR SELECT TO authenticated
  USING (
    faculty_id = (SELECT auth.uid())
    OR current_user_can_access_institution(institution_id)
    OR (section_id IS NULL AND public.current_user_can_read_subject(subject_id))
    OR (section_id IS NOT NULL AND (
      public.current_user_can_access_student_subject((SELECT auth.uid()), subject_id, ARRAY[section_id])
      OR EXISTS (
        SELECT 1 FROM public.parent_student_relations AS relation
        WHERE relation.parent_id = (SELECT auth.uid())
          AND public.current_user_can_access_student_subject(relation.student_id, subject_id, ARRAY[section_id])
      )
    ))
  );

DROP POLICY IF EXISTS files_scoped_select ON public.files;
DROP POLICY IF EXISTS files_select_scoped ON public.files;
CREATE POLICY files_select_scoped ON public.files
  FOR SELECT TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (organization_id = current_user_organization_id() AND current_user_role() = 'ORG_ADMIN')
    OR (institution_id = current_user_institution_id()
      AND current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY'))
  );

DROP POLICY IF EXISTS grade_columns_select ON public.grade_columns;
DROP POLICY IF EXISTS grade_columns_select_scoped ON public.grade_columns;
CREATE POLICY grade_columns_select_scoped ON public.grade_columns
  FOR SELECT TO authenticated
  USING (public.current_user_can_read_subject(subject_id));
DROP POLICY IF EXISTS grade_entries_select ON public.grade_entries;
DROP POLICY IF EXISTS grade_entries_select_scoped ON public.grade_entries;
CREATE POLICY grade_entries_select_scoped ON public.grade_entries
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR user_is_linked_student(student_id)
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND EXISTS (
      SELECT 1 FROM public.grade_columns AS column_row
      JOIN public.subjects AS subject ON subject.id = column_row.subject_id
      WHERE column_row.id = grade_entries.column_id
        AND current_user_can_access_institution(subject.institution_id)
    ))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY') AND EXISTS (
      SELECT 1 FROM public.grade_columns AS column_row
      JOIN public.subjects AS subject ON subject.id = column_row.subject_id
      WHERE column_row.id = grade_entries.column_id
        AND subject.institution_id = current_user_institution_id()
    ))
  );

DROP POLICY IF EXISTS group_members_select ON public.group_members;
DROP POLICY IF EXISTS group_members_select_scoped ON public.group_members;
CREATE POLICY group_members_select_scoped ON public.group_members
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND user_is_in_current_tenant(student_id))
    OR EXISTS (
      SELECT 1 FROM public.project_groups AS project_group
      JOIN public.projects AS project ON project.id = project_group.project_id
      WHERE project_group.id = group_members.group_id
        AND (project.faculty_id = (SELECT auth.uid())
          OR user_is_in_current_tenant(project.faculty_id))
    )
  );

DROP POLICY IF EXISTS intakes_select_scoped ON public.intakes;
DROP POLICY IF EXISTS intakes_select_scoped ON public.intakes;
CREATE POLICY intakes_select_scoped ON public.intakes
  FOR SELECT TO authenticated
  USING (institution_id = current_user_institution_id()
    OR current_user_can_access_institution(institution_id));

DROP POLICY IF EXISTS job_posts_select ON public.job_posts;
DROP POLICY IF EXISTS job_posts_select_scoped ON public.job_posts;
CREATE POLICY job_posts_select_scoped ON public.job_posts
  FOR SELECT TO authenticated
  USING (institution_id = current_user_institution_id()
    OR current_user_can_access_institution(institution_id));
DROP POLICY IF EXISTS job_posts_insert ON public.job_posts;
DROP POLICY IF EXISTS job_posts_insert_scoped ON public.job_posts;
CREATE POLICY job_posts_insert_scoped ON public.job_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND current_user_can_access_institution(institution_id))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
      AND institution_id = current_user_institution_id())
  );
DROP POLICY IF EXISTS job_posts_update ON public.job_posts;
DROP POLICY IF EXISTS job_posts_update_scoped ON public.job_posts;
CREATE POLICY job_posts_update_scoped ON public.job_posts
  FOR UPDATE TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND current_user_can_access_institution(institution_id))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
      AND institution_id = current_user_institution_id())
  )
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND current_user_can_access_institution(institution_id))
    OR (current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
      AND institution_id = current_user_institution_id())
  );

DROP POLICY IF EXISTS meetings_scoped_select ON public.meetings;
DROP POLICY IF EXISTS meetings_scoped_select ON public.meetings;
CREATE POLICY meetings_scoped_select ON public.meetings
  FOR SELECT TO authenticated
  USING (
    faculty_id = (SELECT auth.uid())
    OR is_meeting_participant(id, (SELECT auth.uid()))
    OR current_user_can_access_institution(institution_id)
  );
DROP POLICY IF EXISTS participants_scoped_select ON public.meeting_participants;
DROP POLICY IF EXISTS participants_scoped_select ON public.meeting_participants;
CREATE POLICY participants_scoped_select ON public.meeting_participants
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_meeting_host(meeting_id, (SELECT auth.uid()))
    OR current_user_role() = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.meetings AS meeting
      WHERE meeting.id = meeting_participants.meeting_id
        AND current_user_can_access_institution(meeting.institution_id)
    )
  );
DROP POLICY IF EXISTS messages_scoped_select ON public.meeting_messages;
DROP POLICY IF EXISTS messages_scoped_select ON public.meeting_messages;
CREATE POLICY messages_scoped_select ON public.meeting_messages
  FOR SELECT TO authenticated
  USING (
    is_meeting_participant(meeting_id, (SELECT auth.uid()))
    OR is_meeting_host(meeting_id, (SELECT auth.uid()))
    OR current_user_can_access_institution(institution_id)
  );

DROP POLICY IF EXISTS periods_select_scoped ON public.periods;
DROP POLICY IF EXISTS periods_select_scoped ON public.periods;
CREATE POLICY periods_select_scoped ON public.periods
  FOR SELECT TO authenticated
  USING (institution_id = current_user_institution_id()
    OR current_user_can_access_institution(institution_id));
DROP POLICY IF EXISTS programs_select_scoped ON public.programs;
DROP POLICY IF EXISTS programs_select_scoped ON public.programs;
CREATE POLICY programs_select_scoped ON public.programs
  FOR SELECT TO authenticated
  USING (
    current_user_can_access_institution(institution_id)
    OR EXISTS (
      SELECT 1 FROM public.students AS student
      WHERE student.id = (SELECT auth.uid())
        AND student.program_id = programs.id
        AND student.institution_id = programs.institution_id
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_relations AS relation
      JOIN public.students AS student ON student.id = relation.student_id
      WHERE relation.parent_id = (SELECT auth.uid())
        AND student.program_id = programs.id
        AND student.institution_id = programs.institution_id
    )
  );
DROP POLICY IF EXISTS sections_select_scoped ON public.sections;
DROP POLICY IF EXISTS sections_select_scoped ON public.sections;
CREATE POLICY sections_select_scoped ON public.sections
  FOR SELECT TO authenticated
  USING (
    current_user_can_access_institution(institution_id)
    OR public.current_user_can_access_student_section(
      (SELECT auth.uid()), sections.id, sections.institution_id
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_relations AS relation
      WHERE relation.parent_id = (SELECT auth.uid())
        AND public.current_user_can_access_student_section(
          relation.student_id, sections.id, sections.institution_id
        )
    )
  );
DROP POLICY IF EXISTS subjects_select_scoped ON public.subjects;
DROP POLICY IF EXISTS subjects_select_scoped ON public.subjects;
CREATE POLICY subjects_select_scoped ON public.subjects
  FOR SELECT TO authenticated
  USING (public.current_user_can_read_subject(id));
DROP POLICY IF EXISTS resources_select ON public.resources;
DROP POLICY IF EXISTS resources_select_scoped ON public.resources;
CREATE POLICY resources_select_scoped ON public.resources
  FOR SELECT TO authenticated
  USING (public.current_user_can_read_subject(subject_id));

DROP POLICY IF EXISTS staff_select_scoped ON public.staff;
DROP POLICY IF EXISTS staff_select_scoped ON public.staff;
CREATE POLICY staff_select_scoped ON public.staff
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR institution_id = current_user_institution_id()
    OR current_user_can_access_institution(institution_id)
  );
DROP POLICY IF EXISTS staff_admin_manage ON public.staff;
DROP POLICY IF EXISTS staff_admin_manage_scoped ON public.staff;
CREATE POLICY staff_admin_manage_scoped ON public.staff
  FOR ALL TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND current_user_can_access_institution(institution_id))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  )
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND current_user_can_access_institution(institution_id))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  );

DROP POLICY IF EXISTS students_select_scoped ON public.students;
DROP POLICY IF EXISTS students_select_scoped ON public.students;
CREATE POLICY students_select_scoped ON public.students
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR user_is_linked_student(id)
    OR (current_user_role() IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD')
      AND current_user_can_access_institution(institution_id))
    OR (current_user_role() = 'FACULTY' AND EXISTS (
      SELECT 1 FROM public.faculty_subjects AS faculty_assignment
      WHERE faculty_assignment.faculty_id = (SELECT auth.uid())
        AND faculty_assignment.institution_id = students.institution_id
        AND faculty_assignment.section_id = students.section_id
    ))
  );
DROP POLICY IF EXISTS students_admin_manage ON public.students;
DROP POLICY IF EXISTS students_admin_manage_scoped ON public.students;
CREATE POLICY students_admin_manage_scoped ON public.students
  FOR ALL TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND current_user_can_access_institution(institution_id))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  )
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() = 'ORG_ADMIN' AND current_user_can_access_institution(institution_id))
    OR (current_user_role() = 'INSTITUTION_ADMIN' AND institution_id = current_user_institution_id())
  );

DROP POLICY IF EXISTS student_addresses_select_scoped ON public.student_addresses;
DROP POLICY IF EXISTS student_addresses_select_scoped ON public.student_addresses;
CREATE POLICY student_addresses_select_scoped ON public.student_addresses
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR (current_user_role() = 'SUPER_ADMIN')
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(student_id))
  );
DROP POLICY IF EXISTS student_communications_select_scoped ON public.student_communications;
DROP POLICY IF EXISTS student_communications_select_scoped ON public.student_communications;
CREATE POLICY student_communications_select_scoped ON public.student_communications
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(student_id))
  );
DROP POLICY IF EXISTS student_emergency_contacts_select_scoped ON public.student_emergency_contacts;
DROP POLICY IF EXISTS student_emergency_contacts_select_scoped ON public.student_emergency_contacts;
CREATE POLICY student_emergency_contacts_select_scoped ON public.student_emergency_contacts
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(student_id))
  );
DROP POLICY IF EXISTS student_notes_select_scoped ON public.student_notes;
DROP POLICY IF EXISTS student_notes_select_scoped ON public.student_notes;
CREATE POLICY student_notes_select_scoped ON public.student_notes
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(student_id))
  );
DROP POLICY IF EXISTS student_documents_select_scoped ON public.student_documents;
DROP POLICY IF EXISTS student_documents_select_scoped ON public.student_documents;
CREATE POLICY student_documents_select_scoped ON public.student_documents
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(student_id))
  );
DROP POLICY IF EXISTS student_documents_insert_scoped ON public.student_documents;
DROP POLICY IF EXISTS student_documents_insert_scoped ON public.student_documents;
CREATE POLICY student_documents_insert_scoped ON public.student_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND current_user_can_access_institution(institution_id)
    AND EXISTS (
      SELECT 1 FROM public.students AS target
      WHERE target.id = student_documents.student_id
        AND target.institution_id = student_documents.institution_id
    )
  );
DROP POLICY IF EXISTS student_documents_update_scoped ON public.student_documents;
DROP POLICY IF EXISTS student_documents_update_scoped ON public.student_documents;
CREATE POLICY student_documents_update_scoped ON public.student_documents
  FOR UPDATE TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(student_id))
  )
  WITH CHECK (
    current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(student_id)
      AND current_user_can_access_institution(institution_id))
  );
DROP POLICY IF EXISTS student_profile_details_select_scoped ON public.student_profile_details;
DROP POLICY IF EXISTS student_profile_details_select_scoped ON public.student_profile_details;
CREATE POLICY student_profile_details_select_scoped ON public.student_profile_details
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(student_id))
  );
DROP POLICY IF EXISTS student_portal_access_scoped ON public.student_portal_access;
DROP POLICY IF EXISTS student_portal_access_scoped ON public.student_portal_access;
CREATE POLICY student_portal_access_scoped ON public.student_portal_access
  FOR SELECT TO authenticated
  USING (
    auth_user_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR (current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN')
      AND user_is_in_current_tenant(auth_user_id))
  );

DROP POLICY IF EXISTS submissions_select ON public.submissions;
DROP POLICY IF EXISTS submissions_select_scoped ON public.submissions;
CREATE POLICY submissions_select_scoped ON public.submissions
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR user_is_linked_student(student_id)
    OR current_user_role() = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.assignments AS assignment
      JOIN public.subjects AS subject ON subject.id = assignment.subject_id
      WHERE assignment.id = submissions.assignment_id
        AND (subject.institution_id = current_user_institution_id()
          OR current_user_can_access_institution(subject.institution_id))
        AND current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
    )
  );
DROP POLICY IF EXISTS submissions_student_update ON public.submissions;
DROP POLICY IF EXISTS submissions_update_scoped ON public.submissions;
CREATE POLICY submissions_update_scoped ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR (current_user_role() = 'SUPER_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.assignments AS assignment
      JOIN public.subjects AS subject ON subject.id = assignment.subject_id
      WHERE assignment.id = submissions.assignment_id
        AND (subject.institution_id = current_user_institution_id()
          OR current_user_can_access_institution(subject.institution_id))
        AND current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
    )
  )
  WITH CHECK (
    student_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.assignments AS assignment
      JOIN public.subjects AS subject ON subject.id = assignment.subject_id
      WHERE assignment.id = submissions.assignment_id
        AND (subject.institution_id = current_user_institution_id()
          OR current_user_can_access_institution(subject.institution_id))
        AND current_user_role() IN ('ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'PROGRAM_HEAD', 'FACULTY')
    )
  );

DROP POLICY IF EXISTS projects_select ON public.projects;
DROP POLICY IF EXISTS projects_select_scoped ON public.projects;
CREATE POLICY projects_select_scoped ON public.projects
  FOR SELECT TO authenticated
  USING (
    faculty_id = (SELECT auth.uid())
    OR current_user_role() = 'SUPER_ADMIN'
    OR user_is_in_current_tenant(faculty_id)
  );
DROP POLICY IF EXISTS project_groups_select ON public.project_groups;
DROP POLICY IF EXISTS project_groups_select_scoped ON public.project_groups;
CREATE POLICY project_groups_select_scoped ON public.project_groups
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'SUPER_ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.projects AS project
      WHERE project.id = project_groups.project_id
        AND (project.faculty_id = (SELECT auth.uid())
          OR user_is_in_current_tenant(project.faculty_id))
    )
  );

-- Assignment submissions and resumes contain private student documents.
-- Public buckets bypass Storage RLS when files are downloaded, so migrate only
-- the buckets with private content to the private access model. Existing object
-- keys and rows are retained; callers resolve them through authorized routes.
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments', 'assignments', false), ('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, public = false, updated_at = now();

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to resumes" ON storage.objects;

DROP POLICY IF EXISTS assignments_student_upload_own_folder ON storage.objects;
CREATE POLICY assignments_student_upload_own_folder ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assignments'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND current_user_role() = 'STUDENT'
  );

DROP POLICY IF EXISTS assignments_faculty_upload_own_folder ON storage.objects;
CREATE POLICY assignments_faculty_upload_own_folder ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assignments'
    AND (storage.foldername(name))[1] = 'faculty-' || (SELECT auth.uid())::text
    AND current_user_role() = 'FACULTY'
  );

DROP POLICY IF EXISTS resumes_owner_select ON storage.objects;
CREATE POLICY resumes_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = 'resumes'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND current_user_role() = 'STUDENT'
  );

DROP POLICY IF EXISTS resumes_owner_insert ON storage.objects;
CREATE POLICY resumes_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = 'resumes'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND current_user_role() = 'STUDENT'
  );

-- Avatar images are public by product design; writes stay restricted to the
-- owner's path. Event-image writes are server-mediated by the existing route.
DROP POLICY IF EXISTS "Avatars authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatars authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Avatars authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_upload ON storage.objects;
CREATE POLICY avatars_owner_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
DROP POLICY IF EXISTS avatars_owner_update ON storage.objects;
CREATE POLICY avatars_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
DROP POLICY IF EXISTS avatars_owner_delete ON storage.objects;
CREATE POLICY avatars_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Event images authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Event images authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Event images authenticated delete" ON storage.objects;

-- Student academic records are relationship-scoped. A current section is a
-- fallback only when no formal enrolment record exists; once any enrolment
-- history exists, only a current eligible enrolment unit grants course access.
DROP POLICY IF EXISTS assignments_select_scoped ON public.assignments;
CREATE POLICY assignments_select_scoped ON public.assignments
  FOR SELECT TO authenticated
  USING (
    public.current_user_can_manage_subject(subject_id)
    OR public.current_user_can_access_student_subject((SELECT auth.uid()), subject_id, section_ids)
    OR EXISTS (
      SELECT 1 FROM public.parent_student_relations AS relation
      WHERE relation.parent_id = (SELECT auth.uid())
        AND public.current_user_can_access_student_subject(relation.student_id, subject_id, section_ids)
    )
  );
DROP POLICY IF EXISTS assignments_insert_scoped ON public.assignments;
CREATE POLICY assignments_insert_scoped ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_can_manage_assignment(subject_id, section_ids)
    AND (
      (public.current_user_role() = 'FACULTY' AND faculty_id = (SELECT auth.uid()))
      OR (public.current_user_role() <> 'FACULTY' AND EXISTS (
        SELECT 1 FROM public.subjects AS subject
        JOIN public.users AS faculty ON faculty.id = assignments.faculty_id
        WHERE subject.id = assignments.subject_id
          AND faculty.role = 'FACULTY'
          AND faculty.is_active IS TRUE
          AND faculty.institution_id = subject.institution_id
      ))
    )
  );
DROP POLICY IF EXISTS assignments_update_scoped ON public.assignments;
CREATE POLICY assignments_update_scoped ON public.assignments
  FOR UPDATE TO authenticated
  USING (
    public.current_user_can_manage_assignment(subject_id, section_ids)
    AND (public.current_user_role() <> 'FACULTY' OR faculty_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    public.current_user_can_manage_assignment(subject_id, section_ids)
    AND (
      (public.current_user_role() = 'FACULTY' AND faculty_id = (SELECT auth.uid()))
      OR (public.current_user_role() <> 'FACULTY' AND EXISTS (
        SELECT 1 FROM public.subjects AS subject
        JOIN public.users AS faculty ON faculty.id = assignments.faculty_id
        WHERE subject.id = assignments.subject_id
          AND faculty.role = 'FACULTY'
          AND faculty.is_active IS TRUE
          AND faculty.institution_id = subject.institution_id
      ))
    )
  );
DROP POLICY IF EXISTS assignments_delete_scoped ON public.assignments;
CREATE POLICY assignments_delete_scoped ON public.assignments
  FOR DELETE TO authenticated
  USING (
    public.current_user_can_manage_assignment(subject_id, section_ids)
    AND (public.current_user_role() <> 'FACULTY' OR faculty_id = (SELECT auth.uid()))
  );

-- Quiz answer keys and coding test expectations are server-only. Authenticated
-- clients receive the remaining assignment columns; trusted server components
-- use the service role only after verifying the actor and relationship.
REVOKE SELECT ON public.assignments FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, subject_id, faculty_id, title, description, due_date, created_at,
  updated_at, type, max_score, language, section_ids, files)
  ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;

-- A student's direct submission writes cannot set grades, feedback, or a
-- graded state. Grading is performed by verified server actions.
DROP POLICY IF EXISTS submissions_student_insert ON public.submissions;
DROP POLICY IF EXISTS submissions_student_insert_scoped ON public.submissions;
CREATE POLICY submissions_student_insert_scoped ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND grade IS NULL
    AND feedback IS NULL
    AND status IN ('pending', 'resubmitted')
    AND EXISTS (
      SELECT 1 FROM public.assignments AS assignment
      WHERE assignment.id = submissions.assignment_id
        AND public.current_user_can_access_student_subject(
          (SELECT auth.uid()), assignment.subject_id, assignment.section_ids
        )
    )
  );
DROP POLICY IF EXISTS submissions_update_scoped ON public.submissions;
CREATE POLICY submissions_update_scoped ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.assignments AS assignment
      WHERE assignment.id = submissions.assignment_id
        AND public.current_user_can_access_student_subject(
          (SELECT auth.uid()), assignment.subject_id, assignment.section_ids
        )
    )
  )
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND status IN ('pending', 'resubmitted')
    AND grade IS NULL
    AND feedback IS NULL
    AND EXISTS (
      SELECT 1 FROM public.assignments AS assignment
      WHERE assignment.id = submissions.assignment_id
        AND public.current_user_can_access_student_subject(
          (SELECT auth.uid()), assignment.subject_id, assignment.section_ids
        )
    )
  );

DROP POLICY IF EXISTS submissions_select_scoped ON public.submissions;
CREATE POLICY submissions_select_scoped ON public.submissions
  FOR SELECT TO authenticated
  USING (
    (student_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.assignments AS assignment
        WHERE assignment.id = submissions.assignment_id
          AND public.current_user_can_access_student_subject(
            (SELECT auth.uid()), assignment.subject_id, assignment.section_ids
          )
      ))
    OR (public.current_user_role() = 'SUPER_ADMIN')
    OR EXISTS (
      SELECT 1 FROM public.assignments AS assignment
      WHERE assignment.id = submissions.assignment_id
        AND public.current_user_can_manage_assignment(assignment.subject_id, assignment.section_ids)
    )
    OR EXISTS (
      SELECT 1 FROM public.assignments AS assignment
      WHERE assignment.id = submissions.assignment_id
        AND public.current_user_role() = 'PARENT'
        AND public.user_is_linked_student(submissions.student_id)
        AND public.current_user_can_access_student_subject(
          submissions.student_id, assignment.subject_id, assignment.section_ids
        )
    )
  );
REVOKE ALL ON public.submissions FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.submissions TO authenticated;
GRANT INSERT (assignment_id, student_id, file_url, submitted_at, quiz_answers,
  code_content, language, status) ON public.submissions TO authenticated;
GRANT UPDATE (file_url, submitted_at, quiz_answers, code_content, language, status)
  ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;

-- Faculty attendance is limited to an assigned subject/section. A row must
-- belong to the same section as its session, preventing roster substitution.
DROP POLICY IF EXISTS attendance_sessions_manage_scoped ON public.attendance_sessions;
CREATE POLICY attendance_sessions_manage_scoped ON public.attendance_sessions
  FOR ALL TO authenticated
  USING (public.current_user_can_manage_subject(subject_id, section_id))
  WITH CHECK (
    public.current_user_can_manage_subject(subject_id, section_id)
    AND (faculty_id = (SELECT auth.uid()) OR public.current_user_role() <> 'FACULTY')
    AND EXISTS (
      SELECT 1 FROM public.sections AS section
      JOIN public.subjects AS subject ON subject.id = attendance_sessions.subject_id
      WHERE section.id = attendance_sessions.section_id
        AND section.institution_id = subject.institution_id
    )
  );
DROP POLICY IF EXISTS attendance_records_manage_scoped ON public.attendance_records;
CREATE POLICY attendance_records_manage_scoped ON public.attendance_records
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.attendance_sessions AS session
    WHERE session.id = attendance_records.session_id
      AND public.current_user_can_manage_subject(session.subject_id, session.section_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.attendance_sessions AS session
    JOIN public.students AS student ON student.id = attendance_records.student_id
    WHERE session.id = attendance_records.session_id
      AND student.institution_id = public.current_user_institution_id()
      AND student.section_id = session.section_id
      AND public.current_user_can_manage_subject(session.subject_id, session.section_id)
  ));

-- Gradebook writes are faculty/admin operations and are restricted to a
-- managed course plus the student's actual section.
DROP POLICY IF EXISTS grade_columns_insert_scoped ON public.grade_columns;
CREATE POLICY grade_columns_insert_scoped ON public.grade_columns
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.current_user_can_manage_subject(subject_id)
  );
DROP POLICY IF EXISTS grade_columns_update_scoped ON public.grade_columns;
CREATE POLICY grade_columns_update_scoped ON public.grade_columns
  FOR UPDATE TO authenticated
  USING (public.current_user_can_manage_subject(subject_id))
  WITH CHECK (public.current_user_can_manage_subject(subject_id));
DROP POLICY IF EXISTS grade_columns_delete_scoped ON public.grade_columns;
CREATE POLICY grade_columns_delete_scoped ON public.grade_columns
  FOR DELETE TO authenticated
  USING (public.current_user_can_manage_subject(subject_id));
DROP POLICY IF EXISTS grade_entries_select_scoped ON public.grade_entries;
CREATE POLICY grade_entries_select_scoped ON public.grade_entries
  FOR SELECT TO authenticated
  USING (
    (student_id = (SELECT auth.uid()) AND EXISTS (
      SELECT 1 FROM public.grade_columns AS column_row
      WHERE column_row.id = grade_entries.column_id
        AND public.current_user_can_read_subject(column_row.subject_id)
    ))
    OR (public.current_user_role() = 'PARENT'
      AND public.user_is_linked_student(student_id)
      AND EXISTS (
        SELECT 1 FROM public.grade_columns AS column_row
        WHERE column_row.id = grade_entries.column_id
          AND public.current_user_can_read_subject(column_row.subject_id)
      ))
    OR EXISTS (
      SELECT 1 FROM public.grade_columns AS column_row
      JOIN public.students AS student ON student.id = grade_entries.student_id
      WHERE column_row.id = grade_entries.column_id
        AND public.current_user_can_manage_subject(column_row.subject_id, student.section_id)
    )
  );
DROP POLICY IF EXISTS grade_entries_insert_scoped ON public.grade_entries;
CREATE POLICY grade_entries_insert_scoped ON public.grade_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    graded_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.grade_columns AS column_row
      JOIN public.students AS student ON student.id = grade_entries.student_id
      WHERE column_row.id = grade_entries.column_id
        AND public.current_user_can_manage_subject(column_row.subject_id, student.section_id)
    )
  );
DROP POLICY IF EXISTS grade_entries_update_scoped ON public.grade_entries;
CREATE POLICY grade_entries_update_scoped ON public.grade_entries
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.grade_columns AS column_row
    JOIN public.students AS student ON student.id = grade_entries.student_id
    WHERE column_row.id = grade_entries.column_id
      AND public.current_user_can_manage_subject(column_row.subject_id, student.section_id)
  ))
  WITH CHECK (
    graded_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.grade_columns AS column_row
      JOIN public.students AS student ON student.id = grade_entries.student_id
      WHERE column_row.id = grade_entries.column_id
        AND public.current_user_can_manage_subject(column_row.subject_id, student.section_id)
    )
  );
DROP POLICY IF EXISTS grade_entries_delete_scoped ON public.grade_entries;
CREATE POLICY grade_entries_delete_scoped ON public.grade_entries
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.grade_columns AS column_row
    WHERE column_row.id = grade_entries.column_id
      AND public.current_user_can_manage_subject(column_row.subject_id)
  ));

DROP POLICY IF EXISTS faculty_subjects_manage_scoped ON public.faculty_subjects;
CREATE POLICY faculty_subjects_manage_scoped ON public.faculty_subjects
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'SUPER_ADMIN'
    OR (public.current_user_role() = 'ORG_ADMIN'
      AND public.current_user_can_access_institution(institution_id))
    OR (public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
      AND institution_id = public.current_user_institution_id())
  )
  WITH CHECK (
    (public.current_user_role() = 'SUPER_ADMIN'
      OR (public.current_user_role() = 'ORG_ADMIN'
        AND public.current_user_can_access_institution(institution_id))
      OR (public.current_user_role() IN ('INSTITUTION_ADMIN', 'HOD')
        AND institution_id = public.current_user_institution_id()))
    AND EXISTS (
      SELECT 1 FROM public.subjects AS subject
      JOIN public.users AS faculty ON faculty.id = faculty_subjects.faculty_id
      WHERE subject.id = faculty_subjects.subject_id
        AND subject.institution_id = faculty_subjects.institution_id
        AND faculty.institution_id = faculty_subjects.institution_id
        AND faculty.role = 'FACULTY'
        AND faculty.is_active IS TRUE
    )
  );
