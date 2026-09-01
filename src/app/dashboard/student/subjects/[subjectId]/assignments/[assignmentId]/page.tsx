import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { ROLES } from "@/constants/roles"
import { StudentAssignmentSolveClient } from "./student-assignment-solve-client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{
    subjectId: string
    assignmentId: string
  }>
}

export default async function StudentAssignmentPage({ params }: PageProps) {
  const { subjectId, assignmentId } = await params
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
    .single()

  if (!profile || profile.role !== ROLES.STUDENT) redirect("/dashboard")

  // 1. Fetch Assignment Info
  const { data: assignment } = await adminClient
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .single()

  if (!assignment) {
    redirect(`/dashboard/student/subjects/${subjectId}`)
  }

  // 2. Fetch Student's Submission for this assignment
  const { data: submission } = await adminClient
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle()

  return (
    <StudentAssignmentSolveClient
      studentId={user.id}
      studentName={profile.name}
      subjectId={subjectId}
      assignment={assignment}
      initialSubmission={submission}
    />
  )
}
