import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import AttendanceClient from "./attendance-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { measureServer } from "@/lib/perf"

export default async function AttendancePage() {
  const context = await getCurrentDashboardSession()
  if (!context) redirect("/auth/login")

  const supabase = await createSupabaseServerClient()
  const profile = context

  if (!profile || ![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(profile.role as any)) {
    redirect("/dashboard")
  }

  if (!profile.institution_id) redirect("/dashboard")
  const institutionId = profile.institution_id

  const { data: facultyAssignments } = await supabase
    .from("faculty_subjects")
    .select("subject_id, section_id, semester")
    .eq("faculty_id", profile.id)
    .eq("institution_id", institutionId)

  const subjectIds = (facultyAssignments ?? []).map((row: any) => row.subject_id)
  const sectionIds = (facultyAssignments ?? [])
    .map((row: any) => row.section_id)
    .filter(Boolean)

  const [programsResult, sectionsResult, subjectsResult] = await measureServer("dashboard.faculty.attendance.data", () => Promise.all([
    supabase
      .from("programs")
      .select("id,name")
      .eq("institution_id", institutionId)
      .order("name"),
    supabase
      .from("sections")
      .select("id,name,semester,program_id")
      .eq("institution_id", institutionId)
      .order("semester"),
    subjectIds.length
      ? supabase
          .from("subjects")
          .select("id,name,code,semester")
          .in("id", subjectIds)
          .order("semester")
      : Promise.resolve({ data: [] }),
  ]))

  const programs = programsResult.data ?? []
  const sections = sectionsResult.data ?? []
  const subjects = subjectsResult.data ?? []

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
        .select("id, name, email, role, profile_image_url")
        .in("id", studentIds)
    : { data: [] }

  // Merge student + user data
  const students = (studentRecords ?? []).map((s: any) => {
    const user = (userRecords ?? []).find((u: any) => u.id === s.id)
    return {
      ...s,
      name: user?.name || "Unknown",
      email: user?.email || "",
      role: user?.role || "",
      profile_image_url: user?.profile_image_url || null,
    }
  })

  // Filter by section if faculty teaches specific sections
  let filteredStudents = students
  if (sectionIds.length) {
    filteredStudents = students.filter((s: any) => sectionIds.includes(s.section_id))
  }

  // Fetch leave applications for this institution
  const { data: rawLeaves = [] } = await supabase
    .from("leave_applications")
    .select("id, student_id, section_id, advisor_id, from_date, to_date, reason, notes, status, created_at, approved_at, approved_by")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })

  const studentMap = new Map(students.map((s: any) => [s.id, s]))
  const sectionMap = new Map((sections ?? []).map((sec: any) => [sec.id, sec.name]))

  const leaveApplications = (rawLeaves ?? []).map((leave: any) => {
    const st = studentMap.get(leave.student_id)
    return {
      ...leave,
      studentName: st?.name || "Student",
      studentEmail: st?.email || "",
      studentProfileImageUrl: st?.profile_image_url || null,
      registrationNumber: st?.registration_number || "—",
      sectionName: sectionMap.get(leave.section_id) || "—",
    }
  })

  return (
    <AttendanceClient
      facultyId={profile.id}
      institutionId={institutionId}
      programs={programs ?? []}
      sections={sections ?? []}
      subjects={subjects ?? []}
      students={filteredStudents ?? []}
      initialLeaveApplications={leaveApplications ?? []}
    />
  )
}
