import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { SectionsClientPage } from "./sections-client"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

export const dynamic = "force-dynamic"

export default async function SectionsPage() {
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
  const [
    sectionsRes,
    programsRes,
    facultyRes,
  ] = await Promise.all([
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
  ])
  const batchMs = performance.now() - tBatchStart
  const totalMs = performance.now() - tPageStart

  const sections = sectionsRes.data ?? []
  const programs = programsRes.data ?? []
  const faculty = facultyRes.data ?? []

  console.info(
    `[DashboardInstitutionAdminSections] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)}`
  )

  return (
    <SectionsClientPage
      initialSections={sections || []}
      programs={programs || []}
      facultyAdvisors={faculty || []}
      institutionId={institutionId}
    />
  )
}