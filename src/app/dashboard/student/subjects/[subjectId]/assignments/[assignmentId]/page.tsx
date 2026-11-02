import { redirect } from "next/navigation"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { StudentAssignmentSolveClient } from "./student-assignment-solve-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import type { Json, Tables } from "@/lib/database.types"
import type { CodingTestCase, QuizQuestion } from "@/lib/academic-content-types"

type AssignmentForClient = Omit<Tables<"assignments">, "questions" | "test_cases"> & {
  questions: QuizQuestion[] | null
  test_cases: CodingTestCase[] | null
}
type SubmissionForClient = Omit<Tables<"submissions">, "quiz_answers"> & {
  quiz_answers: number[] | null
}

function parseQuestions(value: Json | null): QuizQuestion[] | null {
  if (!Array.isArray(value)) return null
  const questions: QuizQuestion[] = []
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null
    if (typeof item.q !== "string" || !Array.isArray(item.options) || !item.options.every((option) => typeof option === "string") || typeof item.answer !== "number") return null
    questions.push({ q: item.q, options: item.options, answer: item.answer })
  }
  return questions
}

function parseTestCases(value: Json | null): CodingTestCase[] | null {
  if (!Array.isArray(value)) return null
  const cases: CodingTestCase[] = []
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null
    if (typeof item.input !== "string" || typeof item.output !== "string") return null
    cases.push({ input: item.input, output: item.output })
  }
  return cases
}

function parseQuizAnswers(value: Json | null): number[] | null {
  if (!Array.isArray(value) || !value.every((answer) => typeof answer === "number" && Number.isInteger(answer))) return null
  return value.filter((answer): answer is number => typeof answer === "number")
}

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{
    subjectId: string
    assignmentId: string
  }>
}

export default async function StudentAssignmentPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params)
  const { subjectId, assignmentId } = resolvedParams || {}

  if (!assignmentId) {
    redirect(subjectId ? `/dashboard/student/subjects/${subjectId}` : "/dashboard/student")
  }

  const context = await getCurrentDashboardSession()
  if (!context) redirect("/auth/login")

  const adminClient = createSupabaseAdminClient()
  const profile = context

  // 1. Fetch Assignment Info
  const { data: assignment } = await adminClient
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle()

  if (!assignment) {
    redirect(subjectId ? `/dashboard/student/subjects/${subjectId}` : "/dashboard/student")
  }

  // 2. Fetch Student's Submission for this assignment
  const { data: submission } = await adminClient
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_id", context.id)
    .maybeSingle()

  const assignmentForClient: AssignmentForClient = {
    ...assignment,
    questions: parseQuestions(assignment.questions),
    test_cases: parseTestCases(assignment.test_cases),
  }
  const submissionForClient: SubmissionForClient | null = submission
    ? { ...submission, quiz_answers: parseQuizAnswers(submission.quiz_answers) }
    : null

  const finalSubjectId = assignment.subject_id || subjectId || ""

  return (
    <StudentAssignmentSolveClient
      studentId={context.id}
      studentName={profile.name || "Student"}
      subjectId={finalSubjectId}
      assignment={assignmentForClient}
      initialSubmission={submissionForClient}
    />
  )
}
