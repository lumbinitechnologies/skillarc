import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import { DepartmentsClientPage } from "./departments-client"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function DepartmentsPage() {
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
  const { data: departments = [] } = await supabase
    .from("departments")
    .select("*")
    .eq("institution_id", institutionId)
    .order("name")
  const batchMs = performance.now() - tBatchStart
  const totalMs = performance.now() - tPageStart

  console.info(
    `[DashboardInstitutionAdminDepartments] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)}`
  )

  return (
    <DepartmentsClientPage
      initialDepartments={departments ?? []}
      institutionId={context.institution_id}
    />
  )
}