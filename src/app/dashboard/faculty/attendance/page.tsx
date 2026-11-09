import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import AttendanceClient from "./attendance-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { measureServer } from "@/lib/perf"

export default async function AttendancePage() {


  const context = await measureServer("app.dashboard.faculty.attendance.context", () => getCurrentDashboardSession())


  if (!context) redirect("/auth/login")

  const supabase = await createSupabaseServerClient()
  const profile = context

  if (!profile || ![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].some(role => role === profile.role)) {
    redirect("/dashboard")
  }

  if (!profile.institution_id) redirect("/dashboard")
  const institutionId = profile.institution_id

  // Consolidated parallel batch: Fetch faculty assignments, programs, sections, subjects, joined students, and leave applications in ONE single Promise.all

  const [
    assignmentsRes,
    programsRes,
    sectionsRes,
    subjectsRes,
    studentsRes,
    leavesRes,
  ] = await measureServer("dashboard.faculty.attendance.data", () =>
    Promise.all([
      supabase
        .from("faculty_subjects")
        .select("subject_id, section_id, semester")
        .eq("faculty_id", profile.id)
        .eq("institution_id", institutionId),
      supabase
        .from("programs")
        .select("id, name")
        .eq("institution_id", institutionId)
        .order("name"),
      supabase
        .from("sections")
        .select("id, name, semester, program_id")
        .eq("institution_id", institutionId)
        .order("semester"),
      supabase
        .from("subjects")
        .select("id, name, code, semester")
        .eq("institution_id", institutionId)
        .order("semester"),
      supabase
        .from("students")
        .select(`
          id,
          institution_id,
          program_id,
          section_id,
          semester,
          registration_number,
          admission_year,
          dob,
          gender,
          users:users!id(id, name, email, role, profile_image_url)
        `)
        .eq("institution_id", institutionId)
        .order("id"),
      supabase
        .from("leave_applications")
        .select("id, student_id, section_id, advisor_id, from_date, to_date, reason, notes, status, created_at, approved_at, approved_by")
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false }),
    ])
  )


  const facultyAssignments = assignmentsRes.data ?? []
  const programs = programsRes.data ?? []
  const sections = sectionsRes.data ?? []
  const allSubjects = subjectsRes.data ?? []
  const rawStudents = (studentsRes.data ?? [])
  const rawLeaves = leavesRes.data ?? []

  const assignedSubjectIds = new Set(facultyAssignments.map((row) => row.subject_id))
  const assignedSectionIds = new Set(facultyAssignments.map((row) => row.section_id).filter(Boolean))

  const subjects = assignedSubjectIds.size > 0
    ? allSubjects.filter((s) => assignedSubjectIds.has(s.id))
    : allSubjects

  const students = rawStudents.map((s) => {
    const user = Array.isArray(s.users) ? s.users[0] : s.users
    return {
      ...s,
      name: user?.name || "Unknown",
      email: user?.email || "",
      role: user?.role || "",
      profile_image_url: user?.profile_image_url || null,
    }
  })

  // Filter by section if faculty teaches specific sections
  const filteredStudents = assignedSectionIds.size > 0
    ? students.filter((s) => assignedSectionIds.has(s.section_id))
    : students

  const studentMap = new Map(students.map((s) => [s.id, s]))
  const sectionMap = new Map((sections ?? []).map((sec) => [sec.id, sec.name]))

  const leaveApplications = (rawLeaves ?? []).map((leave) => {
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
