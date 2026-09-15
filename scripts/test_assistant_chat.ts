// @ts-nocheck
import { createClient } from "@supabase/supabase-js"
import ws from "ws"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const appUrl = "http://localhost:3001"

async function getAuthCookie(email: string, password = "TestPassword123!") {
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    realtime: { transport: ws },
  })

  const { data, error } = await authClient.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`Sign in failed for ${email}: ${error?.message}`)

  const token = data.session.access_token
  const refreshToken = data.session.refresh_token
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
  const payload = JSON.stringify([token, refreshToken, null, null, null])
  const base64Cookie = `base64-${Buffer.from(payload).toString("base64")}`

  return {
    userId: data.user.id,
    cookie: `sb-${projectRef}-auth-token=${base64Cookie}`,
  }
}

async function main() {
  console.log("Testing /api/assistant/chat...")
  const studentEmail = "rohanjanagonda@gmail.com"
  const auth = await getAuthCookie(studentEmail)

  const body = {
    clientTurnId: crypto.randomUUID(),
    messages: [
      {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: "What is my attendance percentage?" }],
      },
    ],
  }

  const res = await fetch(`${appUrl}/api/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: auth.cookie,
    },
    body: JSON.stringify(body),
  })

  console.log(`Status: ${res.status} ${res.statusText}`)
  const text = await res.text()
  console.log("Response body:\n", text.slice(0, 1000))
}

main().catch(err => {
  console.error("Test failed:", err)
})
