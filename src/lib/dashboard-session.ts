import { unstable_cache } from "next/cache"
import { cache } from "react"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext, type UserContext } from "@/lib/user-context"
import {
  normalizeOrganizationFeatures,
  ORGANIZATION_FEATURE_CACHE_SECONDS,
  resolveDashboardFeatures,
} from "@/lib/organization-features"
import { measureServer } from "@/lib/perf"

export type DashboardSession = UserContext & {
  features: string[]
}

const getCachedOrganizationFeatures = unstable_cache(
  async (organizationId: string) => {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from("organizations")
      .select("features")
      .eq("id", organizationId)
      .maybeSingle()

    if (error) {
      console.error("Failed to load cached organization features:", error.message)
      return []
    }

    return normalizeOrganizationFeatures(data?.features)
  },
  ["dashboard-organization-features"],
  { revalidate: ORGANIZATION_FEATURE_CACHE_SECONDS }
)

export const getCurrentDashboardSession = cache(async (): Promise<DashboardSession | null> => {
  const context = await measureServer("dashboard.session.user-context", () => getCurrentUserContext())
  if (!context) return null

  const organizationFeatures = context.organization_id
    ? await measureServer("dashboard.session.organization-features", () =>
        getCachedOrganizationFeatures(context.organization_id as string)
      )
    : null
  const features = resolveDashboardFeatures(context.organization_id, organizationFeatures)

  return { ...context, features }
})
