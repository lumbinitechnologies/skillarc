import { measureServer } from "@/lib/perf"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import { ProgramsClientPage } from "./programs-client"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function ProgramsPage() {


  const context = await measureServer("app.dashboard.institution-admin.programs.context", () => getCurrentUserContext())


  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")
  if (!context.institution_id || !context.organization_id) redirect("/dashboard")

  const institutionId = context.institution_id
  const organizationId = context.organization_id
  const supabase = await createSupabaseServerClient()


  const [programsRes, departmentsRes] = await measureServer("app.dashboard.institution-admin.programs.data", () => Promise.all([
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
  ]))



  const programs = programsRes.data ?? []
  const departments = departmentsRes.data ?? []



  return (
    <ProgramsClientPage
      initialPrograms={programs}
      departments={departments}
      institutionId={institutionId}
      organizationId={context.organization_id}
    />
  )
}