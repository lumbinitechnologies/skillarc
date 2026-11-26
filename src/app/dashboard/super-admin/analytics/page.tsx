import { createSupabaseServerClient } from "@/lib/supabase-server"
import AnalyticsClient from "./analytics-client"

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient()

  const [
    { count: organizations },
    { count: institutions },
    { count: users },
    { count: faculty },
    { count: students },
  ] = await Promise.all([
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase.from("institutions").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "faculty"),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "student"),
  ])

  return (
    <AnalyticsClient
      growth={{
        users: [{ label: "Today", value: users ?? 0 }],
        organizations: [{ label: "Today", value: organizations ?? 0 }],
        institutions: [{ label: "Today", value: institutions ?? 0 }],
      }}
      orgStats={[]}
      recentActivity={[]}
      summary={{
        totalUsers: users ?? 0,
        totalOrgs: organizations ?? 0,
        totalInstitutions: institutions ?? 0,
        newUsersThisMonth: 0,
        newOrgsThisMonth: 0,
        activeAdmins: 0,
      }}
    />
  )
}