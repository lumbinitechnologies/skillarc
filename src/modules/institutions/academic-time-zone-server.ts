import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { academicTimeContext } from "@/lib/academic-time-zone"
import {
  AcademicTimeZoneError,
  type AcademicTimeZoneActor,
} from "./academic-time-zone-handler"

export async function academicTimeZoneActor(): Promise<AcademicTimeZoneActor | null> {
  const session = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await session.auth.getUser()
  if (error || !user) return null
  // Use the verified actor, never caller headers, metadata or impersonation cookies.
  const result = await createSupabaseAdminClient()
    .from("users")
    .select("id,role,is_active,institution_id,organization_id")
    .eq("id", user.id)
    .maybeSingle()
  if (result.error)
    throw new AcademicTimeZoneError(503, "Account is temporarily unavailable")
  return result.data
}

export async function saveAcademicTimeZone(
  actor: AcademicTimeZoneActor,
  zone: string | null,
) {
  // The service-only RPC rechecks the actor and institution, and atomically audits the write.
  const { data, error } = await createSupabaseAdminClient().rpc(
    "set_institution_academic_time_zone",
    {
      p_actor_id: actor.id,
      p_institution_id: actor.institution_id,
      p_organization_id: actor.organization_id,
      p_academic_time_zone: zone,
    },
  )
  if (error) {
    if (error.code === "42501")
      throw new AcademicTimeZoneError(403, "Forbidden")
    if (error.code === "22023")
      throw new AcademicTimeZoneError(400, "Unsupported academic timezone")
    throw new AcademicTimeZoneError(
      503,
      "Institution timezone is temporarily unavailable",
    )
  }
  if (data !== null && typeof data !== "string") {
    throw new AcademicTimeZoneError(
      503,
      "Institution timezone is temporarily unavailable",
    )
  }
  return data as string | null
}

export async function readAcademicTimeZone(scope: {
  institution_id: string | null
  organization_id: string | null
}) {
  if (!scope.institution_id || !scope.organization_id)
    throw new Error("Institution scope is incomplete")
  const { data, error } = await createSupabaseAdminClient()
    .from("institutions")
    .select("academic_time_zone")
    .eq("id", scope.institution_id)
    .eq("organization_id", scope.organization_id)
    .maybeSingle()
  if (error || !data)
    throw new Error("Institution timezone is temporarily unavailable")
  const context = academicTimeContext(data.academic_time_zone, new Date())
  return {
    academic_time_zone: context.time_zone,
    academic_time_zone_status: context.status,
  }
}
