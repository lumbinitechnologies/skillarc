import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { createSupabaseServerClient } from "@/lib/supabase-server"
import type { AssistantPrincipal } from "@/lib/assistant/types"

/**
 * Resolve the database client once at the assistant boundary. Normal requests
 * retain the user's cookie session and RLS. Impersonated requests require the
 * server-only service key, while the read service still applies explicit
 * effective-principal predicates to every query.
 */
export async function createAssistantDataClient(principal: AssistantPrincipal): Promise<SupabaseClient> {
  if (!principal.isImpersonating) return createSupabaseServerClient()

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !supabaseUrl) throw new Error("Impersonated assistant access requires server configuration")

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
