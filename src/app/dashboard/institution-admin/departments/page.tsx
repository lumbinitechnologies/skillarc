import { measureServer } from "@/lib/perf"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import { DepartmentsClientPage } from "./departments-client"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function DepartmentsPage() {


  const context = await measureServer("app.dashboard.institution-admin.departments.context", () => getCurrentUserContext())


  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")
  if (!context.institution_id) redirect("/dashboard")

  const institutionId = context.institution_id
  const supabase = await createSupabaseServerClient()


  const { data: departments = [] } = await supabase
    .from("departments")
    .select("*")
    .eq("institution_id", institutionId)
    .order("name")





  return (
    <DepartmentsClientPage
      initialDepartments={departments ?? []}
      institutionId={context.institution_id}
    />
  )
}