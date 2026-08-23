import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import SuperAdminDashboardClient from "./super-admin-dashboard-client"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function SuperAdminDashboardPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  if (!context.isSuperAdmin) redirect("/auth/login")

  const supabase = await createSupabaseServerClient()
  const profile = context

  // Stat counts
  const [
    { count: orgCount },
    { count: orgAdminCount },
    { count: institutionCount },
    { count: userCount },
  ] = await Promise.all([
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", ROLES.ORG_ADMIN),
    supabase.from("institutions").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }),
  ])

  // Organizations with institution count
  const { data: organizations } = await supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      created_at,
      institutions(count)
    `
    )
    .order("created_at", { ascending: false })

  // Org admins with their org name
  const { data: orgAdmins } = await supabase
    .from("users")
    .select(
      `
      id,
      name,
      email,
      created_at,
      organization_id,
      organizations(name)
    `
    )
    .eq("role", "ORG_ADMIN")
    .order("created_at", { ascending: false })

  return (
    <SuperAdminDashboardClient
      admin={{
        name: profile.name ?? context.email ?? "Super Admin",
        email: context.email ?? "",
      }}
      stats={{
        organizations: orgCount ?? 0,
        orgAdmins: orgAdminCount ?? 0,
        institutions: institutionCount ?? 0,
        users: userCount ?? 0,
      }}
      organizations={(organizations ?? []).map((org) => ({
        id: org.id,
        name: org.name,
        created_at: org.created_at,
        institution_count:
          // @ts-ignore supabase returns count as array
          Array.isArray(org.institutions)
            ? (org.institutions[0]?.count ?? 0)
            : 0,
      }))}
      orgAdmins={(orgAdmins ?? []).map((u) => ({
        id: u.id,
        name: u.name ?? "",
        email: u.email ?? "",
        created_at: u.created_at,
        organization_id: u.organization_id ?? "",
        // @ts-ignore
        organization_name: u.organizations?.name ?? "—",
      }))}
    />
  )
}
