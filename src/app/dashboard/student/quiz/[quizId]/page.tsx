import { redirect } from "next/navigation"
import { StudentAssignmentSolveClient } from "../../subjects/[subjectId]/assignments/[assignmentId]/student-assignment-solve-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { loadStudentAssignment } from "@/lib/student-assignment-read"

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

  const loaded = await loadStudentAssignment(quizId, { expectedType: "Quiz" })
  if (!loaded || loaded.studentId !== context.id) redirect("/dashboard/student/todo")

  const { assignment, submission } = loaded

  return (
    <StudentAssignmentSolveClient
      studentId={loaded.studentId}
      studentName={loaded.studentName}
      subjectId={loaded.subjectId}
      assignment={assignment}
      initialSubmission={submission}
    />
  )
}
