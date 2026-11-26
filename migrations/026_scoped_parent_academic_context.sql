-- Task 13: scope parent assistant reads so a single-domain question does not
-- compute every child academic aggregate.

CREATE OR REPLACE FUNCTION public.get_parent_academic_context_scoped(
  p_parent_id uuid,
  p_since date,
  p_limit integer DEFAULT 3,
  p_scope text DEFAULT 'all'
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_scope NOT IN ('all', 'program_subjects', 'timetable', 'assignments', 'quizzes_grades', 'attendance') THEN
    RAISE EXCEPTION 'Unsupported parent academic scope';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_parent_id THEN
    RETURN;
  END IF;

  RETURN QUERY
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
      WHERE ar.student_id = child.id
        AND ats.attendance_date >= p_since
      GROUP BY s.name, s.code
      ORDER BY s.name, s.code
      LIMIT 12
    ) x
  ) attendance ON p_scope IN ('all', 'attendance')
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
      WHERE sub.student_id = child.id
        AND sub.status = 'graded'
      ORDER BY sub.submitted_at DESC
      LIMIT 12
    ) x
  ) grades ON p_scope IN ('all', 'quizzes_grades')
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
  ) pending ON p_scope IN ('all', 'assignments')
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
  ) schedule ON p_scope IN ('all', 'timetable')
  WHERE rel.parent_id = p_parent_id
    AND child.role = 'STUDENT'
    AND child_record.institution_id = (SELECT institution_id FROM users WHERE id = p_parent_id)
  ORDER BY child.name
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 3), 0), 3);
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_academic_context_scoped(uuid, date, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_academic_context_scoped(uuid, date, integer, text) TO authenticated;
