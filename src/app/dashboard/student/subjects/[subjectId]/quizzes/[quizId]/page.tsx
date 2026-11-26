import { redirect } from "next/navigation"
import { StudentAssignmentSolveClient } from "../../assignments/[assignmentId]/student-assignment-solve-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { loadStudentAssignment } from "@/lib/student-assignment-read"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{
    subjectId: string
    quizId: string
  }>
}

export default async function StudentSubjectQuizPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params)
  const { subjectId, quizId } = resolvedParams || {}

  if (!quizId) {
    redirect(subjectId ? `/dashboard/student/subjects/${subjectId}` : "/dashboard/student")
  }

  const context = await getCurrentDashboardSession()
  if (!context) redirect("/auth/login")

  const loaded = await loadStudentAssignment(quizId, { subjectId, expectedType: "Quiz" })
  if (!loaded || loaded.studentId !== context.id) redirect(subjectId ? `/dashboard/student/subjects/${subjectId}` : "/dashboard/student")

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
