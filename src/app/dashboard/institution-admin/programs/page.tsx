import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import { ProgramsClientPage } from "./programs-client"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function ProgramsPage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentUserContext()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")
  if (!context.institution_id || !context.organization_id) redirect("/dashboard")

  const institutionId = context.institution_id
  const organizationId = context.organization_id
  const supabase = await createSupabaseServerClient()

  const tBatchStart = performance.now()
  const [programsRes, departmentsRes] = await Promise.all([
    supabase
      .from("programs")
      .select(`
        *,
        department:department_id(
          id,
          name
        )
      `)
      .eq("institution_id", institutionId)
      .order("name"),
    supabase
      .from("departments")
      .select("id, name")
      .eq("institution_id", institutionId)
      .order("name"),
  ])
  const batchMs = performance.now() - tBatchStart
  const totalMs = performance.now() - tPageStart

  const programs = programsRes.data ?? []
  const departments = departmentsRes.data ?? []

  console.info(
    `[DashboardInstitutionAdminPrograms] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)}`
  )

  return (
    <ProgramsClientPage
      initialPrograms={programs}
      departments={departments}
      institutionId={institutionId}
      organizationId={context.organization_id}
    />
  )
}