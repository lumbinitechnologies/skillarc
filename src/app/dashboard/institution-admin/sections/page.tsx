import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { SectionsClientPage } from "./sections-client"
import { ROLES } from "@/constants/roles"

export const dynamic = "force-dynamic"

export default async function SectionsPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  if (userProfile?.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")

  const institutionId = userProfile.institution_id

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