import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { ROLES } from "@/constants/roles"
import { StudentReportCardClient } from "./student-report-card-client"

export const dynamic = "force-dynamic"

export default async function StudentReportCardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const adminClient = createSupabaseAdminClient()

  const { data: userProfile } = await adminClient
    .from("users")
    .select("id, name, role, institution_id")
    .eq("id", user.id)
    .single()

  if (!userProfile || userProfile.role !== ROLES.STUDENT) redirect("/dashboard")

  const { data: studentData } = await adminClient
    .from("students")
    .select("id, section_id, program_id, semester")
    .eq("id", user.id)
    .single()

  const profile = {
    id: user.id,
    name: userProfile.name || "Student",
    institution_id: userProfile.institution_id,
    ...studentData,
  }

  // 1. Fetch Enrolled Subjects for student section
  const { data: timetableRows = [] } = profile.section_id
    ? await adminClient
        .from("timetable_slots")
        .select("subject_id")
        .eq("institution_id", profile.institution_id)
        .eq("section_id", profile.section_id)
    : { data: [] }

  let subjectIds = Array.from(new Set((timetableRows as Array<any>).map((slot) => slot.subject_id).filter(Boolean))) as string[]

  if (subjectIds.length === 0 && (profile.program_id || profile.institution_id)) {
    let subQuery = adminClient
      .from("subjects")
      .select("id")
    if (profile.program_id) {
      subQuery = subQuery.eq("program_id", profile.program_id)
    } else if (profile.institution_id) {
      subQuery = subQuery.eq("institution_id", profile.institution_id)
    }
    if (profile.semester) {
      subQuery = subQuery.eq("semester", profile.semester)
    }
    const { data: programSubjects } = await subQuery
    if (programSubjects?.length) {
      subjectIds = programSubjects.map((s: any) => s.id)
    }
  }

  if (!subjectIds.length) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-white border border-slate-100 rounded-3xl shadow-sm my-8">
        <h3 className="text-xl font-semibold text-gray-700">No Academic Records</h3>
        <p className="text-gray-400 mt-2 text-sm">No subjects are assigned to your section.</p>
      </div>
    )
  }

  const [subjectsResult, assignmentsResult, submissionsResult, gradeColumnsResult] = await Promise.all([
    adminClient.from("subjects").select("id, name, code").in("id", subjectIds),
    adminClient
      .from("assignments")
      .select("id, subject_id, title, description, type, max_score, due_date, section_ids, created_at")
      .in("subject_id", subjectIds),
    adminClient.from("submissions").select("*").eq("student_id", user.id),
    adminClient
      .from("grade_columns")
      .select("*")
      .in("subject_id", subjectIds)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
  ])

  const subjects = subjectsResult.data ?? []
  const allAssignments = assignmentsResult.data ?? []

  // Filter assignments targeted at the student's section (excluding Materials and Syllabus)
  const sectionId = profile.section_id
  const sectionAssignments = (allAssignments ?? []).filter((a: any) => {
    if (a.type === "Material" || a.type === "Syllabus") return false
    if (!a.section_ids || a.section_ids.length === 0) return true
    return a.section_ids.includes(sectionId)
  })

  // 3. Fetch Student Submissions
  const columnIds = (gradeColumnsResult.data ?? []).map((column: any) => column.id)
  const gradeEntries = columnIds.length
    ? await adminClient
        .from("grade_entries")
        .select("*")
        .eq("student_id", user.id)
        .in("column_id", columnIds)
    : { data: [] }

  return (
    <StudentReportCardClient
      studentName={profile.name}
      subjects={subjects ?? []}
      assignments={sectionAssignments}
      submissions={submissionsResult.data ?? []}
      gradeColumns={gradeColumnsResult.data ?? []}
      gradeEntries={gradeEntries.data ?? []}
    />
  )
}
