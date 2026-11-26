import { relationOne } from "@/lib/academic-content-types"
// app/dashboard/super-admin/org-admins/page.tsx

import { createSupabaseServerClient } from "@/lib/supabase-server"
import OrgAdminsClient from "./org-admins-client"
import { createOrgAdmin, deleteOrgAdmin, resetAdminPassword } from "../actions"

export default async function OrgAdminsPage() {
  const supabase = await createSupabaseServerClient()

  const { data: adminsRaw, error: adminsError } = await supabase
    .from("users")
    .select(`
      id,
      name,
      email,
      created_at,
      organization_id,
      organizations(name)
    `)
    .eq("role", "org_admin")
    .order("created_at", { ascending: false })

  if (adminsError) console.error("Admins fetch error:", adminsError.message, adminsError.details)

  const { data: orgsRaw, error: orgsError } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name")

  if (orgsError) console.error("Orgs fetch error:", orgsError.message, orgsError.details)

  const orgAdmins = (adminsRaw ?? []).map((a) => ({
    id: a.id,
    name: a.name ?? "",
    email: a.email ?? "",
    created_at: a.created_at,
    organization_id: a.organization_id ?? "",
    organization_name: relationOne(a.organizations)?.name ?? "—",
    last_login: undefined,
  }))

  const organizations = (orgsRaw ?? []).map((o) => ({
    id: o.id,
    name: o.name,
  }))

  return (
    <OrgAdminsClient
      orgAdmins={orgAdmins}
      organizations={organizations}
      onCreateAdmin={createOrgAdmin}
      onDeleteAdmin={deleteOrgAdmin}
      onResetPassword={resetAdminPassword}
    />
  )
}