import { cache } from "react"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"
import { ROLES } from "@/constants/roles"

export type UserContext = {
  id: string
  role: string
  institution_id: string | null
  organization_id: string | null
  department_id: string | null
  name: string
  email: string
  is_timetable_builder: boolean
  isImpersonating: boolean
  originalProfile: {
    id: string
    role: string
    name: string
    email: string
    organization_id: string | null
    institution_id: string | null
    department_id: string | null
  }
  isSuperAdmin: boolean
}

export const getCurrentUserContext = cache(async (): Promise<UserContext | null> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.user?.id) {
    return null
  }

  const userId = session.user.id

  const { data: actualProfile, error: profileError } = await supabase
    .from("users")
    .select("id, role, name, email, organization_id, institution_id, department_id")
    .eq("id", userId)
    .single()

  if (profileError || !actualProfile) {
    return null
  }

  let isTimetableBuilder = false
  const { data: perm } = await supabase
    .from("permissions")
    .select("id")
    .eq("name", "timetable_builder")
    .maybeSingle()

  if (perm?.id) {
    const { data: userPerm } = await supabase
      .from("user_permissions")
      .select("id")
      .eq("user_id", userId)
      .eq("permission_id", perm.id)
      .maybeSingle()

    if (userPerm?.id) {
      isTimetableBuilder = true
    }
  }

  const cookieStore = await cookies()
  const impRole = cookieStore.get("sa_impersonate_role")?.value
  const impOrgId = cookieStore.get("sa_impersonate_org_id")?.value
  const impInstId = cookieStore.get("sa_impersonate_inst_id")?.value
  const impUserId = cookieStore.get("sa_impersonate_user_id")?.value

  if (actualProfile.role === ROLES.SUPER_ADMIN && impRole) {
    const targetProfileData = impUserId
      ? await supabase
          .from("users")
          .select("id, role, name, email, organization_id, institution_id, department_id")
          .eq("id", impUserId)
          .single()
      : { data: null, error: null }

    const targetProfile = targetProfileData.data

    return {
      id: targetProfile?.id ?? userId,
      role: impRole,
      institution_id: targetProfile?.institution_id ?? impInstId ?? null,
      organization_id: targetProfile?.organization_id ?? impOrgId ?? null,
      department_id: targetProfile?.department_id ?? actualProfile.department_id ?? null,
      name: targetProfile?.name ?? actualProfile.name ?? "",
      email: targetProfile?.email ?? actualProfile.email ?? "",
      is_timetable_builder: isTimetableBuilder,
      isImpersonating: true,
      originalProfile: {
        id: actualProfile.id,
        role: actualProfile.role,
        name: actualProfile.name ?? "",
        email: actualProfile.email ?? "",
        organization_id: actualProfile.organization_id,
        institution_id: actualProfile.institution_id,
        department_id: actualProfile.department_id,
      },
      isSuperAdmin: true,
    }
  }

  return {
    id: userId,
    role: actualProfile.role,
    institution_id: actualProfile.institution_id,
    organization_id: actualProfile.organization_id,
    department_id: actualProfile.department_id,
    name: actualProfile.name ?? "",
    email: actualProfile.email ?? "",
    is_timetable_builder: isTimetableBuilder,
    isImpersonating: false,
    originalProfile: {
      id: actualProfile.id,
      role: actualProfile.role,
      name: actualProfile.name ?? "",
      email: actualProfile.email ?? "",
      organization_id: actualProfile.organization_id,
      institution_id: actualProfile.institution_id,
      department_id: actualProfile.department_id,
    },
    isSuperAdmin: actualProfile.role === ROLES.SUPER_ADMIN,
  }
})
