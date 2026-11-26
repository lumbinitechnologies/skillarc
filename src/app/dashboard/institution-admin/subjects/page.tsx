import { relationOne } from "@/lib/academic-content-types"
import { measureServer } from "@/lib/perf"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import { SubjectsClientPage } from "./subjects-client"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function SubjectsPage() {


  const context = await measureServer("app.dashboard.institution-admin.subjects.context", () => getCurrentUserContext())


  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")
  if (!context.institution_id) redirect("/dashboard")

  const institutionId = context.institution_id
  const supabase = await createSupabaseServerClient()


  const [subjectsRes, departmentsRes, programsRes] = await measureServer("app.dashboard.institution-admin.subjects.data", () => Promise.all([
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
  ]))



  const subjects = (subjectsRes.data ?? []).map(row => { const program = relationOne(row.program); return { ...row, program: program ? { ...program, department: relationOne(program.department) } : null } })
  const departments = departmentsRes.data ?? []
  const programs = (programsRes.data ?? []).map(row => ({ ...row, department: relationOne(row.department) }))



  return (
    <SubjectsClientPage
      initialSubjects={subjects}
      departments={departments}
      programs={programs}
      institutionId={institutionId}
    />
  )
}