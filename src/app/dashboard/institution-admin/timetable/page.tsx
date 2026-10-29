import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import { TimetableClientPage } from "./timetable-client"

export default async function TimetablePage() {
  const supabase = await createSupabaseServerClient()
  const adminClient = createSupabaseAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await adminClient
    .from("users")
    .select("role, institution_id")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/dashboard")
  }

  let hasAccess = [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.INSTITUTION_ADMIN, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(profile.role as any)

  if (!hasAccess && user.id) {
    const { data: perm } = await adminClient
      .from("permissions")
      .select("id")
      .eq("name", "timetable_builder")
      .maybeSingle()

    if (perm?.id) {
      const { data: userPerm } = await adminClient
        .from("user_permissions")
        .select("id")
        .eq("user_id", user.id)
        .eq("permission_id", perm.id)
        .maybeSingle()

      if (userPerm?.id) {
        hasAccess = true
      }
    }
  }

  if (!hasAccess) {
    redirect("/dashboard")
  }

  let institutionId = profile.institution_id
  if (!institutionId && (profile.role === ROLES.SUPER_ADMIN || profile.role === ROLES.ORG_ADMIN)) {
    const { data: inst } = await adminClient.from("institutions").select("id").limit(1).maybeSingle()
    institutionId = inst?.id ?? null
  }

  const [departmentsRes, programsRes, sectionsRes] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .eq("institution_id", institutionId)
      .order("name"),
    supabase
      .from("programs")
      .select("id, name, department_id")
      .eq("institution_id", institutionId)
      .order("name"),
    supabase
      .from("sections")
      .select("id, name, semester, program_id")
      .eq("institution_id", institutionId)
      .order("semester")
      .order("name"),
  ])

  const departmentsData = departmentsRes.data
  const programsData = programsRes.data
  const sectionsData = sectionsRes.data

  return (
    <TimetableClientPage
      departments={departmentsData ?? []}
      programs={programsData ?? []}
      sections={sectionsData ?? []}
      institutionId={institutionId ?? ""}
    />
  )
}