import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import AttendanceClient from "./attendance-client"

export default async function AttendancePage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, institution_id")
    .eq("id", user.id)
    .single()

  if (!profile || ![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(profile.role)) {
    redirect("/dashboard")
  }

  const institutionId = profile.institution_id

  const { data: facultyAssignments } = await supabase
    .from("faculty_subjects")
    .select("subject_id, section_id, semester")
    .eq("faculty_id", user.id)
    .eq("institution_id", institutionId)

  const subjectIds = (facultyAssignments ?? []).map((row: any) => row.subject_id)
  const sectionIds = (facultyAssignments ?? [])
    .map((row: any) => row.section_id)
    .filter(Boolean)

  const { data: programs = [] } = await supabase
    .from("programs")
    .select("id,name")
    .eq("institution_id", institutionId)
    .order("name")

  const { data: sections = [] } = await supabase
    .from("sections")
    .select("id,name,semester,program_id")
    .eq("institution_id", institutionId)
    .order("semester")

  const { data: subjects = [] } = subjectIds.length
    ? await supabase
        .from("subjects")
        .select("id,name,code,semester")
        .in("id", subjectIds)
        .order("semester")
    : { data: [] }

  let studentQuery = supabase
    .from("students")
    .select("id, institution_id, program_id, section_id, semester, registration_number, admission_year, dob, gender")
    .eq("institution_id", institutionId)
    .order("id")

  // Also need user names/emails - we'll join on id which references users.id
  // Fetch students data first
  const { data: studentRecords = [] } = await studentQuery

  // Now fetch corresponding user info
  const studentIds = (studentRecords ?? []).map((s: any) => s.id)
  const { data: userRecords = [] } = studentIds.length
    ? await supabase
        .from("users")
        .select("id, name, email, role")
        .in("id", studentIds)
    : { data: [] }

  // Merge student + user data
  const students = (studentRecords ?? []).map((s: any) => {
    const user = (userRecords ?? []).find((u: any) => u.id === s.id)
    return { ...s, name: user?.name || "Unknown", email: user?.email || "", role: user?.role || "" }
  })

  // Filter by section if faculty teaches specific sections
  let filteredStudents = students
  if (sectionIds.length) {
    filteredStudents = students.filter((s: any) => sectionIds.includes(s.section_id))
  }

  return (
    <AttendanceClient
      facultyId={user.id}
      institutionId={institutionId}
      programs={programs ?? []}
      sections={sections ?? []}
      subjects={subjects ?? []}
      students={filteredStudents ?? []}
    />
  )
}