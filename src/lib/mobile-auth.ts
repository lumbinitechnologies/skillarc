import { createClient } from "@supabase/supabase-js"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { normalizeOrganizationFeatures } from "@/lib/organization-features"
import { ROLES } from "@/constants/roles"

const MOBILE_ROLES = new Set<string>([ROLES.STUDENT, ROLES.PARENT, ROLES.FACULTY])

export type MobilePrincipal = {
  id: string
  role: string
  organization_id: string | null
  institution_id: string | null
  department_id: string | null
  name: string
  email: string
  profile_image_url: string | null
  features: string[]
}

type MobileProfile = Omit<MobilePrincipal, "features"> & { is_active: boolean | null }

export class MobileAuthError extends Error {
  constructor(
    public readonly status: 401 | 403 | 503,
    public readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export function parseBearerToken(authorization: string | null): string | null {
  if (!authorization || authorization.length > 8192) return null
  const match = /^Bearer ([A-Za-z0-9._~+/-]+={0,2})$/i.exec(authorization)
  return match?.[1] ?? null
}

export function authorizeMobileProfile(profile: MobileProfile | null): MobileProfile {
  if (!profile || profile.is_active !== true) {
    throw new MobileAuthError(403, "ACCOUNT_INACTIVE", "Account is not active")
  }
  if (!MOBILE_ROLES.has(profile.role)) {
    throw new MobileAuthError(403, "ROLE_NOT_SUPPORTED", "Role is not enabled for mobile release 1")
  }
  if (!profile.organization_id || !profile.institution_id) {
    throw new MobileAuthError(403, "ACCOUNT_SCOPE_MISSING", "Account scope is incomplete")
  }
  return profile
}

export async function requireMobilePrincipal(request: Request): Promise<MobilePrincipal> {
  const token = parseBearerToken(request.headers.get("authorization"))
  if (!token) {
    throw new MobileAuthError(401, "UNAUTHORIZED", "Valid Bearer token required")
  }

  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data: { user }, error: authError } = await auth.auth.getUser(token)
  if (authError || !user?.id) {
    throw new MobileAuthError(401, "UNAUTHORIZED", "Valid Bearer token required")
  }

  const admin = createSupabaseAdminClient()
  const { data: rawProfile, error: profileError } = await admin
    .from("users")
    .select("id,role,organization_id,institution_id,department_id,name,email,profile_image_url,is_active")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    throw new MobileAuthError(503, "PROFILE_UNAVAILABLE", "Profile is temporarily unavailable")
  }
  const profile = authorizeMobileProfile(rawProfile as MobileProfile | null)

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("features")
    .eq("id", profile.organization_id)
    .maybeSingle()

  if (organizationError || !organization) {
    throw new MobileAuthError(503, "FEATURES_UNAVAILABLE", "Organization features are temporarily unavailable")
  }

  return {
    id: profile.id,
    role: profile.role,
    organization_id: profile.organization_id,
    institution_id: profile.institution_id,
    department_id: profile.department_id,
    name: profile.name,
    email: profile.email,
    profile_image_url: profile.profile_image_url,
    features: normalizeOrganizationFeatures(organization.features),
  }
}
