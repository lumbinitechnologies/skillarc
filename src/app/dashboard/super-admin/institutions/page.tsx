// app/dashboard/super-admin/institutions/page.tsx

import { createSupabaseServerClient } from "@/lib/supabase-server"
import InstitutionsClient from "./institutions-client"

export default async function InstitutionsPage() {
  const supabase = await createSupabaseServerClient()

  const { data: institutionsRaw, error: instError } = await supabase
    .from("institutions")
    .select(`
      id,
      name,
      domain,
      organization_id,
      organizations(name)
    `)
    .order("name")

  if (instError) console.error("Institutions fetch error:", instError.message, instError.details)

  // Separate count query — more reliable than join count
  const { data: userCounts, error: countError } = await supabase
    .from("users")
    .select("institution_id")
    .not("institution_id", "is", null)

  if (countError) console.error("User count error:", countError.message, countError.details)

  // Build institution_id → count map
  const countMap: Record<string, number> = {}
  for (const u of userCounts ?? []) {
    if (u.institution_id) {
      countMap[u.institution_id] = (countMap[u.institution_id] ?? 0) + 1
    }
  }

  const institutions = (institutionsRaw ?? []).map((inst: any) => ({
    id: inst.id,
    name: inst.name ?? "",
    code: inst.domain ?? "general",
    type: "college" as const,
    active: true,
    created_at: new Date().toISOString(),
    organization_id: inst.organization_id ?? "",
    organization_name: (inst.organizations as any)?.name ?? "—",
    user_count: countMap[inst.id] ?? 0,
  }))

  return <InstitutionsClient institutions={institutions} />
}