import { cache } from "react"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { cookies } from "next/headers"
import { ROLES } from "@/constants/roles"
import { measureServer } from "@/lib/perf"
import { unstable_cache } from "next/cache"

const getTimetablePermissionId = unstable_cache(
  async () => {
    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from("permissions")
      .select("id")
      .eq("name", "timetable_builder")
      .maybeSingle()
    return data?.id ?? null
  },
  ["permission:timetable_builder"],
  { revalidate: 30, tags: ["permissions"] },
)

const getCachedUserProfile = cache((userId: string) =>
  unstable_cache(
    async () => {
      const admin = createSupabaseAdminClient()
      const { data } = await admin
        .from("users")
        .select("id, role, name, email, phone, organization_id, institution_id, department_id, is_active")
        .eq("id", userId)
        .single()
      return data ?? null
    },
    ["dashboard:user-profile", userId],
    { revalidate: 10, tags: [`dashboard:user-profile:${userId}`] },
  )(),
)

export type UserContext = {
  id: string
  role: string
  institution_id: string | null
  organization_id: string | null
  department_id: string | null
  name: string
  email: string
  phone: string | null
  is_active: boolean
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
  return measureServer("dashboard.user-context", async () => {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user?.id) {
      return null
    }

    const userId = user.id

    const [actualProfile, permissionId] = await Promise.all([
      getCachedUserProfile(userId),
      getTimetablePermissionId(),
    ])

    if (!actualProfile) {
      return null
    }

    const userPermPromise = permissionId
      ? supabase
          .from("user_permissions")
          .select("id")
          .eq("user_id", userId)
          .eq("permission_id", permissionId)
          .maybeSingle()
      : Promise.resolve({ data: null })
    const { data: userPerm } = await userPermPromise
    const isTimetableBuilder = Boolean(userPerm?.id)

    const cookieStore = await cookies()
    const impRole = cookieStore.get("sa_impersonate_role")?.value
    const impOrgId = cookieStore.get("sa_impersonate_org_id")?.value
    const impInstId = cookieStore.get("sa_impersonate_inst_id")?.value
    const impUserId = cookieStore.get("sa_impersonate_user_id")?.value

    if (actualProfile.role === ROLES.SUPER_ADMIN && impRole) {
      const targetProfile = impUserId ? await getCachedUserProfile(impUserId) : null

      return {
        id: targetProfile?.id ?? userId,
        role: impRole,
        institution_id: targetProfile?.institution_id ?? impInstId ?? null,
        organization_id: targetProfile?.organization_id ?? impOrgId ?? null,
        department_id: targetProfile?.department_id ?? actualProfile.department_id ?? null,
        name: targetProfile?.name ?? actualProfile.name ?? "",
        email: targetProfile?.email ?? actualProfile.email ?? "",
        phone: targetProfile?.phone ?? actualProfile.phone ?? null,
        is_active: targetProfile?.is_active ?? true,
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
      phone: actualProfile.phone ?? null,
      is_active: actualProfile.is_active ?? true,
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
})
