// @ts-nocheck
import ws from "ws"
global.WebSocket = ws as any
import { createSupabaseAdminClient } from "./src/lib/supabase-admin"

async function run() {
  console.log("Checking submissions data...")
  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.from("submissions").select("*").limit(5)
    if (error) {
      console.error("Query failed:", error)
    } else {
      console.log("Submissions found:")
      console.dir(data, { depth: null })
    }
  } catch (err) {
    console.error("Unexpected error:", err)
  }
}

run()
