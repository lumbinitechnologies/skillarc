/**
 * Shared server-side context helper for Program Head dashboard pages.
 */
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"

export async function getProgramHeadContext() {
  const session = await getCurrentDashboardSession()
  if (!session) redirect("/auth/login")
  if (session.role !== ROLES.PROGRAM_HEAD) redirect("/auth/login")
  if (!session.institution_id) redirect("/dashboard")

  const admin = createSupabaseAdminClient()

  return { profile: session, admin, institutionId: session.institution_id }
}
