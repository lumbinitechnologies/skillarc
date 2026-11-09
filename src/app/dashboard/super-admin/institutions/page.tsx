import { relationOne } from "@/lib/academic-content-types"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { deleteInstitution } from "../actions"
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
      created_at, organizations(name)
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

  const institutions = (institutionsRaw ?? []).map((inst) => ({
    id: inst.id,
    name: inst.name ?? "",
    code: inst.domain ?? "general",
    type: "college" as const,
    active: true,
    created_at: inst.created_at ?? "",
    organization_id: inst.organization_id ?? "",
    organization_name: relationOne(inst.organizations)?.name ?? "—",
    user_count: countMap[inst.id] ?? 0,
  }))

  return <InstitutionsClient institutions={institutions} onDeleteInstitution={deleteInstitution} />
}