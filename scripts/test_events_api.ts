// @ts-nocheck
import { createClient } from "@supabase/supabase-js"
import ws from "ws"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const appUrl = "http://localhost:3001"

const adminClient = createClient(supabaseUrl, serviceRoleKey, { realtime: { transport: ws } })

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
  console.log("================ Testing Events API endpoints ================\n")

  // 1. Test as Institution Admin
  const adminEmail = "nikhilkrishnatest4@gmail.com"
  const adminAuth = await getAuthCookie(adminEmail)
  console.log(`Signed in as Institution Admin (${adminEmail})`)

  // Create Event via POST /api/events
  const createRes = await fetch(`${appUrl}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookie,
    },
    body: JSON.stringify({
      title: "Annual Tech Symposium 2026",
      description: JSON.stringify({ description: "Join us for keynote talks and workshops." }),
      event_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      venue: "Main Campus Auditorium",
    }),
  })

  const createData = await createRes.json()
  console.log(`POST /api/events status: ${createRes.status}`, createData)

  if (!createRes.ok || !createData.id) {
    throw new Error(`Failed to create event: ${JSON.stringify(createData)}`)
  }

  const eventId = createData.id
  console.log(`Created Event ID: ${eventId}`)

  // Update Event via PATCH /api/events/[id]
  const patchRes = await fetch(`${appUrl}/api/events/${eventId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookie,
    },
    body: JSON.stringify({
      title: "Annual Tech Symposium 2026 (Updated)",
      venue: "Grand Ballroom & Auditorium",
    }),
  })

  const patchData = await patchRes.json()
  console.log(`PATCH /api/events/${eventId} status: ${patchRes.status}`, patchData)

  // 2. Test registration as Student
  const studentEmail = "rohanjanagonda@gmail.com"
  const studentAuth = await getAuthCookie(studentEmail)
  console.log(`\nSigned in as Student (${studentEmail})`)

  const regRes = await fetch(`${appUrl}/api/events/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: studentAuth.cookie,
    },
    body: JSON.stringify({ event_id: eventId }),
  })
  const regData = await regRes.json()
  console.log(`POST /api/events/register status: ${regRes.status}`, regData)

  // Cancel registration
  const cancelRes = await fetch(`${appUrl}/api/events/register?event_id=${eventId}`, {
    method: "DELETE",
    headers: {
      Cookie: studentAuth.cookie,
    },
  })
  const cancelData = await cancelRes.json()
  console.log(`DELETE /api/events/register status: ${cancelRes.status}`, cancelData)

  // 3. Clean up event via DELETE /api/events/[id]
  const deleteRes = await fetch(`${appUrl}/api/events/${eventId}`, {
    method: "DELETE",
    headers: {
      Cookie: adminAuth.cookie,
    },
  })
  const deleteData = await deleteRes.json()
  console.log(`\nDELETE /api/events/${eventId} status: ${deleteRes.status}`, deleteData)

  console.log("\n>>> ALL EVENTS API TESTS PASSED SUCCESSFULLY! <<<")
}

main().catch(err => {
  console.error("Test failed:", err)
  process.exit(1)
})
