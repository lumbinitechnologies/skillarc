import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import type { AssistantPrincipal } from "@/lib/assistant/types"

/**
 * Resolve the database client for assistant orchestration and persistence.
 * The assistant read service and persistence layer apply strict, explicit
 * tenant and user principal predicates to all queries and mutations.
 */
export async function createAssistantDataClient(_principal: AssistantPrincipal): Promise<SupabaseClient> {
  return createSupabaseAdminClient()
}
