import { createClient } from "@supabase/supabase-js"

export function createSupabaseAdminClient() {
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Please configure it in your environment variables / Vercel settings.");
  }
  // Defensively strip any accidentally pasted trailing environment variables (e.g. from copy-paste mistakes)
  const serviceRoleKey = rawKey.split(/\s+/)[0].trim();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )
}