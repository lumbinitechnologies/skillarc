import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import { SubjectsClientPage } from "./subjects-client"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function SubjectsPage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentUserContext()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")
  if (!context.institution_id) redirect("/dashboard")

  const institutionId = context.institution_id
  const supabase = await createSupabaseServerClient()

  const tBatchStart = performance.now()
  const [subjectsRes, departmentsRes, programsRes] = await Promise.all([
    supabase
      .from("subjects")
      .select(`
        *,
        program:program_id(
          id, name,
          department:department_id(id, name)
        )
      `)
      .eq("institution_id", institutionId)
      .order("semester")
      .order("name"),
    supabase
      .from("departments")
      .select("id, name")
      .eq("institution_id", institutionId)
      .order("name"),
    supabase
      .from("programs")
      .select("id, name, department_id, department:department_id(id, name)")
      .eq("institution_id", institutionId)
      .order("name"),
  ])
  const batchMs = performance.now() - tBatchStart
  const totalMs = performance.now() - tPageStart

  const subjects = subjectsRes.data ?? []
  const departments = departmentsRes.data ?? []
  const programs = programsRes.data ?? []

  console.info(
    `[DashboardInstitutionAdminSubjects] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)}`
  )

  return (
    <SubjectsClientPage
      initialSubjects={subjects}
      departments={departments}
      programs={programs}
      institutionId={institutionId}
    />
  )
}