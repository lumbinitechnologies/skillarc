import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import OrgAdminDashboardClient from "./org-admin-dashboard-client"
import { ROLES } from "@/constants/roles"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single()

  if (profile?.role !== ROLES.ORG_ADMIN) redirect("/dashboard")

  const orgId = profile.organization_id

  // Fetch institutions and stats in parallel
  const [institutionsRes, facultyRes, studentRes] = await Promise.all([
    supabase
      .from("institutions")
      .select("id, name, domain")
      .eq("organization_id", orgId)
      .order("name", { ascending: true }),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("role", ROLES.FACULTY),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("role", ROLES.STUDENT),
  ])

  const institutions = institutionsRes.data ?? []
  const facultyCount = facultyRes.count ?? 0
  const studentCount = studentRes.count ?? 0

  return (
    <OrgAdminDashboardClient
      institutions={institutions}
      stats={{
        institutions: institutions.length,
        faculty: facultyCount,
        students: studentCount,
      }}
    />
  )
}