/**
 * Shared server-side context helper for HOD dashboard pages.
 */
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"

export async function getHodContext() {
  const session = await getCurrentDashboardSession()
  if (!session) redirect("/auth/login")
  if (session.role !== ROLES.HOD) redirect("/auth/login")
  if (!session.institution_id) redirect("/dashboard")

  const admin = createSupabaseAdminClient()

  return { profile: session, admin, institutionId: session.institution_id }
}
