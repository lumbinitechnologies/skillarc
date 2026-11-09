import { measureServer } from "@/lib/perf"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { SectionsClientPage } from "./sections-client"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

export const dynamic = "force-dynamic"

export default async function SectionsPage() {


  const context = await measureServer("app.dashboard.institution-admin.sections.context", () => getCurrentUserContext())


  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")
  if (!context.institution_id) redirect("/dashboard")

  const institutionId = context.institution_id
  const supabase = await createSupabaseServerClient()


  const [
    sectionsRes,
    programsRes,
    facultyRes,
  ] = await measureServer("app.dashboard.institution-admin.sections.data", () => Promise.all([
    supabase
      .from("sections")
      .select(`
        *,
        faculty_advisor:faculty_advisor_id(
          id,
          name,
          email
        ),
        program:program_id(
          id,
          name
        )
      `)
      .eq("institution_id", institutionId)
      .order("semester", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("programs")
      .select("id, name")
      .eq("institution_id", institutionId),
    supabase
      .from("users")
      .select("id, name, email")
      .eq("institution_id", institutionId)
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD]),
  ]))



  const sections = sectionsRes.data ?? []
  const programs = programsRes.data ?? []
  const faculty = facultyRes.data ?? []



  return (
    <SectionsClientPage
      initialSections={sections || []}
      programs={programs || []}
      facultyAdvisors={faculty || []}
      institutionId={institutionId}
    />
  )
}