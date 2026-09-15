import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { FacultyClientPage } from "./faculty-client"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function FacultyPage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentUserContext()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")
  if (!context.institution_id) redirect("/dashboard")

  const institutionId = context.institution_id
  const supabase = await createSupabaseServerClient()

  // Consolidated parallel batch: Fetch faculty, faculty_subjects, sections, departments, and timetable builder permissions in ONE single Promise.all
  const tBatchStart = performance.now()
  const [
    facultyRes,
    facultySubjectsRes,
    sectionsRes,
    departmentsRes,
    userPermsRes,
  ] = await Promise.all([
    supabase
      .from("users")
      .select(`
        *,
        department:department_id(
          id,
          name
        )
      `)
      .eq("institution_id", institutionId)
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
      .order("name"),
    supabase
      .from("faculty_subjects")
      .select("faculty_id, subject_id"),
    supabase
      .from("sections")
      .select("id, faculty_advisor_id")
      .eq("institution_id", institutionId),
    supabase
      .from("departments")
      .select("id, name")
      .eq("institution_id", institutionId)
      .order("name"),
    supabase
      .from("user_permissions")
      .select("user_id, permissions!inner(name)")
      .eq("permissions.name", "timetable_builder"),
  ])
  const batchMs = performance.now() - tBatchStart

  const faculty = facultyRes.data ?? []
  const facultySubjects = facultySubjectsRes.data ?? []
  const sections = sectionsRes.data ?? []
  const departments = departmentsRes.data ?? []
  const userPerms = (userPermsRes.data ?? []) as any[]

  const builderUserIds = new Set(userPerms.map((up) => up.user_id))

  const facultyWithStats = faculty.map((f) => ({
    ...f,
    is_timetable_builder: builderUserIds.has(f.id),
    assignedSubjects: facultySubjects.filter((fs) => fs.faculty_id === f.id).length,
    assignedSections: sections.filter((s) => s.faculty_advisor_id === f.id).length,
  }))

  const totalMs = performance.now() - tPageStart
  console.info(
    `[DashboardInstitutionAdminFaculty] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)} facultyCount=${faculty.length}`
  )

  return (
    <FacultyClientPage
      initialFaculty={facultyWithStats}
      departments={departments}
      institutionId={institutionId}
    />
  )
}