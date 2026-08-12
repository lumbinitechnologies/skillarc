import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import { StudentReportCardClient } from "./student-report-card-client"

export const dynamic = "force-dynamic"

export default async function StudentReportCardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: userProfile } = await supabase
    .from("users")
    .select("id, name, role, institution_id")
    .eq("id", user.id)
    .single()

  if (!userProfile || userProfile.role !== ROLES.STUDENT) redirect("/dashboard")

  const { data: studentData } = await supabase
    .from("students")
    .select("id, section_id, program_id, semester")
    .eq("id", user.id)
    .single()

  const profile = { ...userProfile, ...studentData }

  // 1. Fetch Enrolled Subjects for student section
  const { data: timetableRows = [] } = profile.section_id
    ? await supabase
        .from("timetable_slots")
        .select("subject_id")
        .eq("institution_id", profile.institution_id)
        .eq("section_id", profile.section_id)
    : { data: [] }

  let subjectIds = Array.from(new Set((timetableRows as Array<any>).map((slot) => slot.subject_id).filter(Boolean))) as string[]

  if (subjectIds.length === 0 && (profile.program_id || profile.institution_id)) {
    let subQuery = supabase
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
      <div className="max-w-4xl mx-auto p-8 text-center bg-white border rounded-3xl shadow-sm">
        <h3 className="text-xl font-semibold text-gray-700">No Academic Records</h3>
        <p className="text-gray-400 mt-2 text-sm">No subjects are assigned to your section.</p>
      </div>
    )
  }

  // Fetch subjects details
  const { data: subjects = [] } = await supabase
    .from("subjects")
    .select("id, name, code")
    .in("id", subjectIds)

  // 2. Fetch Assignments for these subjects
  const { data: allAssignments = [] } = await supabase
    .from("assignments")
    .select("*")
    .in("subject_id", subjectIds)

  // Filter assignments targeted at the student's section (excluding Materials)
  const sectionId = profile.section_id
  const sectionAssignments = (allAssignments ?? []).filter((a: any) => {
    if (a.type === "Material") return false
    if (!a.section_ids || a.section_ids.length === 0) return true
    return a.section_ids.includes(sectionId)
  })

  // 3. Fetch Student Submissions
  const { data: submissions = [] } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", user.id)

  // 4. Fetch custom gradebook columns and values for the student's subjects
  const gradeColumns = subjectIds.length
    ? await supabase
        .from("grade_columns")
        .select("*")
        .in("subject_id", subjectIds)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
    : { data: [] }

  const columnIds = (gradeColumns.data ?? []).map((column: any) => column.id)
  const gradeEntries = columnIds.length
    ? await supabase
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
      submissions={submissions ?? []}
      gradeColumns={gradeColumns.data ?? []}
      gradeEntries={gradeEntries.data ?? []}
    />
  )
}
