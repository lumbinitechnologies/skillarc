import { redirect } from "next/navigation"
import { StudentAssignmentSolveClient } from "./student-assignment-solve-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { loadStudentAssignment } from "@/lib/student-assignment-read"

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

  const loaded = await loadStudentAssignment(assignmentId, { subjectId })
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
