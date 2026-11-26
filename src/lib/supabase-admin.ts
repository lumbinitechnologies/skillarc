import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Module-level singleton — one client per Node.js process.
// Previously every call site called createSupabaseAdminClient() which instantiated
// a brand-new supabase-js client (new fetch internals, new WebSocket manager,
// new JWT parser) on every request. With 103+ call sites this was a significant
// source of latency and memory pressure.
let _adminClient: SupabaseClient | null = null

export function createSupabaseAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient

  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!rawKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Please configure it in your environment variables / Vercel settings."
    )
  }
  // Defensively strip any accidentally pasted trailing environment variables
  const serviceRoleKey = rawKey.split(/\s+/)[0].trim()

  _adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        // Server-side client — no browser storage, no auto refresh
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )

  return _adminClient
}