import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { StudentAssignmentSolveClient } from "../../subjects/[subjectId]/assignments/[assignmentId]/student-assignment-solve-client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{
    quizId: string
  }> | {
    quizId: string
  }
}

export default async function DirectStudentSingularQuizPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params)
  const { quizId } = resolvedParams || {}

  if (!quizId) {
    redirect("/dashboard/student")
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
    .eq("student_id", user.id)
    .maybeSingle()

  const subjectId = assignment.subject_id || ""

  return (
    <StudentAssignmentSolveClient
      studentId={user.id}
      studentName={profile.name || "Student"}
      subjectId={subjectId}
      assignment={assignment}
      initialSubmission={submission}
    />
  )
}
