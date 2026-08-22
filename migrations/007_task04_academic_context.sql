-- Task 04: bounded, caller-authorized academic aggregates.
-- These functions intentionally return display-safe aggregates only.

CREATE OR REPLACE FUNCTION public.get_student_attendance_summary(
  p_student_id uuid,
  p_since date,
  p_limit integer DEFAULT 12
)
RETURNS TABLE(subject_name text, subject_code text, present_count bigint, total_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.name, s.code,
         count(*) FILTER (WHERE ar.status IN ('PRESENT', 'LATE')),
         count(*)
  FROM attendance_records ar
  JOIN attendance_sessions ats ON ats.id = ar.session_id
  JOIN subjects s ON s.id = ats.subject_id
  WHERE ar.student_id = p_student_id
    AND ats.attendance_date >= p_since
    AND auth.uid() = p_student_id
  GROUP BY s.name, s.code
  ORDER BY s.name, s.code
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 12), 0), 12);
$$;

CREATE OR REPLACE FUNCTION public.get_faculty_attendance_summary(
  p_faculty_id uuid,
  p_since date,
  p_limit integer DEFAULT 12
)
RETURNS TABLE(subject_name text, subject_code text, present_count bigint, total_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.name, s.code,
         count(*) FILTER (WHERE ar.status IN ('PRESENT', 'LATE')),
         count(*)
  FROM attendance_sessions ats
  JOIN attendance_records ar ON ar.session_id = ats.id
  JOIN subjects s ON s.id = ats.subject_id
  WHERE ats.faculty_id = p_faculty_id
    AND ats.attendance_date >= p_since
    AND auth.uid() = p_faculty_id
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = p_faculty_id
        AND u.role IN ('FACULTY', 'HOD', 'PROGRAM_HEAD')
    )
  GROUP BY s.name, s.code
  ORDER BY s.name, s.code
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 12), 0), 12);
$$;

CREATE OR REPLACE FUNCTION public.get_parent_academic_context(
  p_parent_id uuid,
  p_since date,
  p_limit integer DEFAULT 3
)
RETURNS TABLE(
  child_name text,
  relationship text,
  program_name text,
  section_name text,
  semester integer,
  attendance jsonb,
  grades jsonb,
  pending_assignments jsonb,
  timetable jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT child.name,
         rel.relationship,
         program.name,
         section.name,
         child_record.semester,
         COALESCE(attendance.summary, '[]'::jsonb),
         COALESCE(grades.summary, '[]'::jsonb),
         COALESCE(pending.summary, '[]'::jsonb),
         COALESCE(schedule.summary, '[]'::jsonb)
  FROM parent_student_relations rel
  JOIN users child ON child.id = rel.student_id
  JOIN students child_record ON child_record.id = rel.student_id
  LEFT JOIN programs program ON program.id = child_record.program_id
  LEFT JOIN sections section ON section.id = child_record.section_id
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'subject_name', x.subject_name, 'subject_code', x.subject_code,
      'present_count', x.present_count, 'total_count', x.total_count
    ) ORDER BY x.subject_name) AS summary
    FROM (
      SELECT s.name AS subject_name, s.code AS subject_code,
             count(*) FILTER (WHERE ar.status IN ('PRESENT', 'LATE')) AS present_count,
             count(*) AS total_count
      FROM attendance_records ar
      JOIN attendance_sessions ats ON ats.id = ar.session_id
      JOIN subjects s ON s.id = ats.subject_id
      WHERE ar.student_id = child.id AND ats.attendance_date >= p_since
      GROUP BY s.name, s.code
      ORDER BY s.name, s.code
      LIMIT 12
    ) x
  ) attendance ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(x.item ORDER BY x.submitted_at DESC) AS summary
    FROM (
      SELECT jsonb_build_object(
        'title', a.title, 'subject_name', s.name, 'grade', sub.grade,
        'max_score', a.max_score, 'feedback', left(COALESCE(sub.feedback, ''), 120)
      ) AS item, sub.submitted_at
      FROM submissions sub
      JOIN assignments a ON a.id = sub.assignment_id
      LEFT JOIN subjects s ON s.id = a.subject_id
      WHERE sub.student_id = child.id AND sub.status = 'graded'
      ORDER BY sub.submitted_at DESC
      LIMIT 12
    ) x
  ) grades ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(x.item ORDER BY x.due_date NULLS LAST) AS summary
    FROM (
      SELECT jsonb_build_object(
        'title', a.title, 'subject_name', s.name, 'due_date', a.due_date, 'type', a.type
      ) AS item, a.due_date
      FROM assignments a
      LEFT JOIN subjects s ON s.id = a.subject_id
      WHERE child_record.section_id = ANY(a.section_ids)
        AND NOT EXISTS (
          SELECT 1 FROM submissions sub
          WHERE sub.assignment_id = a.id AND sub.student_id = child.id
        )
      ORDER BY a.due_date NULLS LAST
      LIMIT 12
    ) x
  ) pending ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(x.item ORDER BY x.day, x.period) AS summary
    FROM (
      SELECT jsonb_build_object(
        'day', ts.day, 'period', ts.period, 'subject_name', s.name, 'subject_code', s.code
      ) AS item, ts.day, ts.period
      FROM timetable_slots ts
      LEFT JOIN subjects s ON s.id = ts.subject_id
      WHERE ts.section_id = child_record.section_id
        AND ts.semester = child_record.semester
      ORDER BY ts.day, ts.period
      LIMIT 12
    ) x
  ) schedule ON true
  WHERE rel.parent_id = p_parent_id
    AND auth.uid() = p_parent_id
    AND child.role = 'STUDENT'
  ORDER BY child.name
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 3), 0), 3);
$$;

REVOKE ALL ON FUNCTION public.get_student_attendance_summary(uuid, date, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_faculty_attendance_summary(uuid, date, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_parent_academic_context(uuid, date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_attendance_summary(uuid, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_faculty_attendance_summary(uuid, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_academic_context(uuid, date, integer) TO authenticated;
