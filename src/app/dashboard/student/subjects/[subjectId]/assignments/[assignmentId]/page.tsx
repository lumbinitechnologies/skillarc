import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { StudentAssignmentSolveClient } from "./student-assignment-solve-client"

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

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const adminClient = createSupabaseAdminClient()

  const { data: profile } = await adminClient
    .from("users")
    .select("id, name, role")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) redirect("/dashboard")

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
    .eq("student_id", user.id)
    .maybeSingle()

  const finalSubjectId = assignment.subject_id || subjectId || ""

  return (
    <StudentAssignmentSolveClient
      studentId={user.id}
      studentName={profile.name || "Student"}
      subjectId={finalSubjectId}
      assignment={assignment}
      initialSubmission={submission}
    />
  )
}
