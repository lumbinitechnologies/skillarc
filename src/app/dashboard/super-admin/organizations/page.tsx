import { createSupabaseServerClient } from "@/lib/supabase-server"
import OrganizationsClient from "./organizations-client"
import { createOrganization, deleteOrganization, editOrganization } from "../actions"

export default async function OrganizationsPage() {
  const supabase = await createSupabaseServerClient()

  const { data: organizationsRaw, error: orgError } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      created_at,
      institutions(count)
    `)
    .order("created_at", { ascending: false })

  if (orgError) console.error("Org fetch error:", orgError.message, orgError.details, orgError.hint)

  let featuresMap: Record<string, string[]> = {}
  try {
    const { data: featuresData } = await supabase
      .from("organizations")
      .select("id, features")
    
    if (featuresData) {
      featuresData.forEach((row: any) => {
        featuresMap[row.id] = row.features || []
      })
    }
  } catch (err) {
    console.warn("Features column does not exist yet. Please run migration: ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}'::text[];")
  }

  const { data: adminCounts, error: adminError } = await supabase
    .from("users")
    .select("organization_id")
    .eq("role", "ORG_ADMIN")

  if (adminError) console.error("Admin count error:", adminError.message, adminError.details, adminError.hint)

  console.log("organizationsRaw:", JSON.stringify(organizationsRaw, null, 2))
  console.log("adminCounts:", JSON.stringify(adminCounts, null, 2))

  const adminCountMap: Record<string, number> = {}
  for (const row of adminCounts ?? []) {
    if (row.organization_id) {
      adminCountMap[row.organization_id] = (adminCountMap[row.organization_id] ?? 0) + 1
    }
  }

  const organizations =
    organizationsRaw?.map((org: any) => ({
      id: org.id,
      name: org.name,
      created_at: org.created_at,
      institution_count: org.institutions?.[0]?.count ?? 0,
      admin_count: adminCountMap[org.id] ?? 0,
      features: featuresMap[org.id] || [],
    })) ?? []

  return (
    <OrganizationsClient
      organizations={organizations}
      onCreateOrg={createOrganization}
      onDeleteOrg={deleteOrganization}
      onEditOrg={editOrganization}
    />
  )
}