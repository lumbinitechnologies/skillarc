import { redirect } from "next/navigation"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { StudentAssignmentSolveClient } from "./student-assignment-solve-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"

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

  const finalSubjectId = assignment.subject_id || subjectId || ""

  return (
    <StudentAssignmentSolveClient
      studentId={context.id}
      studentName={profile.name || "Student"}
      subjectId={finalSubjectId}
      assignment={assignment}
      initialSubmission={submission}
    />
  )
}
