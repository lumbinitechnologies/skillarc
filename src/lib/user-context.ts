import { createSupabaseServerClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"
import { ROLES } from "@/constants/roles"

export type UserContext = {
  id: string
  role: string
  institution_id: string | null
  organization_id: string | null
  name: string
  email: string
  isImpersonating: boolean
  originalProfile: {
    id: string
    role: string
    name: string
    email: string
    organization_id: string | null
    institution_id: string | null
  }
  isSuperAdmin: boolean
}

export async function getCurrentUserContext(): Promise<UserContext | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch actual profile from database
  const { data: actualProfile } = await supabase
    .from("users")
    .select("id, role, name, email, organization_id, institution_id")
    .eq("id", user.id)
    .single()

  if (!actualProfile) return null

  const cookieStore = await cookies()
  const impRole = cookieStore.get("sa_impersonate_role")?.value
  const impOrgId = cookieStore.get("sa_impersonate_org_id")?.value
  const impInstId = cookieStore.get("sa_impersonate_inst_id")?.value
  const impUserId = cookieStore.get("sa_impersonate_user_id")?.value

  // Impersonation is only allowed for SUPER_ADMIN
  if (actualProfile.role === ROLES.SUPER_ADMIN && impRole) {
    let targetProfile = null
    if (impUserId) {
      const { data } = await supabase
        .from("users")
        .select("id, role, name, email, organization_id, institution_id")
        .eq("id", impUserId)
        .single()
      if (data) {
        targetProfile = data
      }
    }

    return {
      id: targetProfile?.id ?? user.id, // return impersonated user ID
      role: impRole,
      institution_id: targetProfile?.institution_id ?? impInstId ?? null,
      organization_id: targetProfile?.organization_id ?? impOrgId ?? null,
      name: targetProfile?.name ?? actualProfile.name ?? "",
      email: targetProfile?.email ?? actualProfile.email ?? "",
      isImpersonating: true,
      originalProfile: {
        id: actualProfile.id,
        role: actualProfile.role,
        name: actualProfile.name ?? "",
        email: actualProfile.email ?? "",
        organization_id: actualProfile.organization_id,
        institution_id: actualProfile.institution_id,
      },
      isSuperAdmin: true,
    }
  }

  return {
    id: user.id,
    role: actualProfile.role,
    institution_id: actualProfile.institution_id,
    organization_id: actualProfile.organization_id,
    name: actualProfile.name ?? "",
    email: actualProfile.email ?? "",
    isImpersonating: false,
    originalProfile: {
      id: actualProfile.id,
      role: actualProfile.role,
      name: actualProfile.name ?? "",
      email: actualProfile.email ?? "",
      organization_id: actualProfile.organization_id,
      institution_id: actualProfile.institution_id,
    },
    isSuperAdmin: actualProfile.role === ROLES.SUPER_ADMIN,
  }
}
