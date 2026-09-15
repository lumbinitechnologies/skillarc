import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import AttendanceClient from "./attendance-client"
import { getCurrentUserContext } from "@/lib/user-context"
import { getInstitutionAllAttendanceAnalyticsAction } from "../../faculty/attendance/actions"

export default async function AttendancePage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentUserContext()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")
  if (!context.institution_id) redirect("/dashboard")

  const institutionId = context.institution_id
  const supabase = await createSupabaseServerClient()

  // Consolidated parallel batch: Fetch programs, sections, subjects, joined students, departments, and analytics in ONE single Promise.all
  const tBatchStart = performance.now()
  const [
    programsRes,
    sectionsRes,
    subjectsRes,
    studentsRes,
    departmentsRes,
    statsRes,
  ] = await Promise.all([
    supabase
      .from("programs")
      .select("id, name, department_id")
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
      .eq("institution_id", institutionId),
    supabase
      .from("departments")
      .select("id, name")
      .eq("institution_id", institutionId)
      .order("name"),
    getInstitutionAllAttendanceAnalyticsAction(institutionId),
  ])
  const batchMs = performance.now() - tBatchStart
  const totalMs = performance.now() - tPageStart

  const programs = programsRes.data ?? []
  const sections = sectionsRes.data ?? []
  const subjects = subjectsRes.data ?? []
  const rawStudents = (studentsRes.data ?? []) as any[]
  const departments = departmentsRes.data ?? []
  const allStats = statsRes.success ? statsRes.stats || [] : []

  const students = rawStudents.map((s) => {
    const user = Array.isArray(s.users) ? s.users[0] : s.users
    return {
      ...s,
      name: user?.name || "Unknown Student",
      email: user?.email || "",
      role: user?.role || "STUDENT",
      profile_image_url: user?.profile_image_url || null,
    }
  })

  console.info(
    `[DashboardInstitutionAdminAttendance] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)}`
  )

  return (
    <AttendanceClient
      institutionId={institutionId}
      programs={programs}
      sections={sections}
      subjects={subjects}
      students={students}
      departments={departments}
      allStats={allStats}
    />
  )
}