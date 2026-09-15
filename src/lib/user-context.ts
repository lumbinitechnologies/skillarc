import { cache } from "react"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { cookies, headers } from "next/headers"
import { ROLES } from "@/constants/roles"

export type UserContext = {
  id: string
  role: string
  institution_id: string | null
  organization_id: string | null
  department_id?: string | null
  name: string
  email: string
  created_at?: string
  phone: string | null
  profile_image_url?: string | null
  is_active: boolean
  is_timetable_builder: boolean
  isImpersonating: boolean
  originalProfile: {
    id: string
    role: string
    name: string
    email: string
    profile_image_url?: string | null
    organization_id: string | null
    institution_id: string | null
    department_id?: string | null
  }
  isSuperAdmin: boolean
}

export const getCurrentUserContext = cache(async (): Promise<UserContext | null> => {
  const t0 = performance.now()
  const headerList = await headers()
  let userId = headerList.get("x-user-id")
  const supabase = await createSupabaseServerClient()
  const source = userId ? "header-fastpath" : "gotrue-fallback"

  if (!userId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user?.id) {
      return null
    }
    userId = user.id
  }

  const [profileRes, userPermRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, role, name, email, phone, organization_id, institution_id, department_id, is_active, profile_image_url, created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_permissions")
      .select("id, permissions!inner(name)")
      .eq("user_id", userId)
      .eq("permissions.name", "timetable_builder")
      .maybeSingle(),
  ])

  const t1 = performance.now()
  console.info(`[UserContext] source=${source} userId=${userId} durationMs=${(t1 - t0).toFixed(1)}`)

  const actualProfile = profileRes.data
  if (profileRes.error || !actualProfile) {
    return null
  }

  const isTimetableBuilder = Boolean(userPermRes.data?.id)

  const cookieStore = await cookies()
  const impRole = cookieStore.get("sa_impersonate_role")?.value
  const impOrgId = cookieStore.get("sa_impersonate_org_id")?.value
  const impInstId = cookieStore.get("sa_impersonate_inst_id")?.value
  const impUserId = cookieStore.get("sa_impersonate_user_id")?.value

  if (actualProfile.role === ROLES.SUPER_ADMIN && impRole) {
    const targetProfileData = impUserId
      ? await supabase
          .from("users")
          .select("id, role, name, email, phone, organization_id, institution_id, department_id, is_active, profile_image_url, created_at")
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
      created_at: targetProfile?.created_at ?? actualProfile.created_at,
      phone: targetProfile?.phone ?? actualProfile.phone ?? null,
      profile_image_url: targetProfile?.profile_image_url ?? actualProfile.profile_image_url ?? null,
      is_active: targetProfile?.is_active ?? true,
      is_timetable_builder: isTimetableBuilder,
      isImpersonating: true,
      originalProfile: {
        id: actualProfile.id,
        role: actualProfile.role,
        name: actualProfile.name ?? "",
        email: actualProfile.email ?? "",
        profile_image_url: actualProfile.profile_image_url ?? null,
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
    created_at: actualProfile.created_at,
    phone: actualProfile.phone ?? null,
    profile_image_url: actualProfile.profile_image_url ?? null,
    is_active: actualProfile.is_active ?? true,
    is_timetable_builder: isTimetableBuilder,
    isImpersonating: false,
    originalProfile: {
      id: actualProfile.id,
      role: actualProfile.role,
      name: actualProfile.name ?? "",
      email: actualProfile.email ?? "",
      profile_image_url: actualProfile.profile_image_url ?? null,
      organization_id: actualProfile.organization_id,
      institution_id: actualProfile.institution_id,
      department_id: actualProfile.department_id,
    },
    isSuperAdmin: actualProfile.role === ROLES.SUPER_ADMIN,
  }
})
