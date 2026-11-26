import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { toStudentAssignmentView } from "@/lib/student-assignment-view"

const STUDENT_ASSIGNMENT_COLUMNS =
  "id, subject_id, faculty_id, title, description, due_date, created_at, updated_at, type, max_score, language, section_ids, files"
const STUDENT_SUBMISSION_COLUMNS =
  "id, assignment_id, student_id, file_url, quiz_answers, code_content, language, grade, feedback, status, submitted_at"

export async function loadStudentAssignment(
  assignmentId: string,
  options: { subjectId?: string; expectedType?: string } = {},
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, name, role, is_active")
    .eq("id", user.id)
    .maybeSingle()
  if (profileError || profile?.role !== "STUDENT" || profile.is_active !== true) return null

  // This read is deliberately performed through the student's session. RLS
  // must authorize the row before service-role access can fetch quiz prompts.
  let assignmentQuery = supabase
    .from("assignments")
    .select(STUDENT_ASSIGNMENT_COLUMNS)
    .eq("id", assignmentId)
  if (options.subjectId) assignmentQuery = assignmentQuery.eq("subject_id", options.subjectId)
  if (options.expectedType) assignmentQuery = assignmentQuery.eq("type", options.expectedType)

  const { data: assignment, error: assignmentError } = await assignmentQuery.maybeSingle()
  if (assignmentError || !assignment) return null

  let questions: unknown = null
  if (assignment.type === "Quiz") {
    const { data: quiz, error: quizError } = await createSupabaseAdminClient()
      .from("assignments")
      .select("questions")
      .eq("id", assignment.id)
      .maybeSingle()
    if (quizError || !quiz) return null
    questions = quiz.questions
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select(STUDENT_SUBMISSION_COLUMNS)
    .eq("assignment_id", assignment.id)
    .eq("student_id", user.id)
    .maybeSingle()
  if (submissionError) return null

  return {
    studentId: user.id,
    studentName: profile.name || "Student",
    subjectId: assignment.subject_id || "",
    assignment: toStudentAssignmentView({
      ...assignment,
      questions,
      test_cases: null,
    }),
    submission,
  }
}
