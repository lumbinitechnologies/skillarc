import { redirect } from "next/navigation"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { StudentAssignmentSolveClient } from "../../subjects/[subjectId]/assignments/[assignmentId]/student-assignment-solve-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{
    quizId: string
  }>
}

export default async function DirectStudentSingularQuizPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params)
  const { quizId } = resolvedParams || {}

  if (!quizId) {
    redirect("/dashboard/student")
  }

  const context = await getCurrentDashboardSession()
  if (!context) redirect("/auth/login")

  const adminClient = createSupabaseAdminClient()
  const profile = context

  // 1. Fetch Quiz Info
  const { data: assignment } = await adminClient
    .from("assignments")
    .select("*")
    .eq("id", quizId)
    .maybeSingle()

  if (!assignment) {
    redirect("/dashboard/student/todo")
  }

  // 2. Fetch Student's Submission
  const { data: submission } = await adminClient
    .from("submissions")
    .select("*")
    .eq("assignment_id", quizId)
    .eq("student_id", context.id)
    .maybeSingle()

  const subjectId = assignment.subject_id || ""

  return (
    <StudentAssignmentSolveClient
      studentId={context.id}
      studentName={profile.name || "Student"}
      subjectId={subjectId}
      assignment={assignment}
      initialSubmission={submission}
    />
  )
}
