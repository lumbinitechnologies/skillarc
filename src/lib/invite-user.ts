import { headers } from "next/headers"
import { createSupabaseAdminClient } from "./supabase-admin"
import { sendInviteEmail } from "./auth-email"

export function resolveAppOrigin(headersValue?: Headers | { get(name: string): string | null } | null): string {
  // If the request explicitly comes from localhost / 127.0.0.1, prioritize it for local testing
  if (headersValue) {
    const forwardedProto = headersValue.get("x-forwarded-proto")
    const forwardedHost = headersValue.get("x-forwarded-host")
    const host = forwardedHost?.split(",")[0]?.trim() || headersValue.get("host")
    const proto = forwardedProto?.split(",")[0]?.trim() || "http"

    if (host && (host.includes("localhost") || host.includes("127.0.0.1"))) {
      const localProto = host.includes("localhost") ? "http" : proto
      return `${localProto}://${host}`.replace(/\/+$/, "")
    }
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, "")
  }

  if (headersValue) {
    const forwardedProto = headersValue.get("x-forwarded-proto")
    const forwardedHost = headersValue.get("x-forwarded-host")
    const host = forwardedHost?.split(",")[0]?.trim() || headersValue.get("host")
    const proto = forwardedProto?.split(",")[0]?.trim() || "https"

    if (host) {
      return `${proto}://${host}`.replace(/\/+$/, "")
    }
  }

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`
  }

  if (process.env.NEXTAUTH_URL?.trim()) {
    return process.env.NEXTAUTH_URL.replace(/\/+$/, "")
  }

  return "http://localhost:3000"
}

export async function getRequestAppOrigin() {
  const headerStore = await headers()
  return resolveAppOrigin(headerStore)
}

export async function readResponseError(response: Response, fallback = "Request failed") {
  try {
    const contentType = response.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const data = await response.json()

      if (typeof data === "string") return data
      if (data && typeof data === "object" && "error" in data) {
        const errorValue = (data as { error?: unknown }).error
        if (typeof errorValue === "string") return errorValue
      }
    }

    const text = await response.text()
    if (text?.trim()) return text
  } catch (error) {
    console.warn("[invite-user] failed to parse error response", error)
  }

  return fallback
}

export async function inviteUser(params: {
  email: string
  role: string
  institutionId: string
  organizationId: string
  origin?: string
  name?: string
}) {
  const { email, role, institutionId, organizationId, origin: passedOrigin, name } = params
  const supabase = createSupabaseAdminClient()
  
  let origin = passedOrigin
  if (!origin) {
    try {
      origin = await getRequestAppOrigin()
    } catch {
      origin = resolveAppOrigin()
    }
  }

  // CRITICAL: redirectTo must be exact whitelisted URL without arbitrary query params,
  // otherwise Supabase rejects it and falls back to the production site root URL.
  const redirectTo = `${origin}/auth/callback`

  console.log(`📧 Inviting user ${email} with role: ${role}, redirect: ${redirectTo}`)
  let userId: string | null = null
  let actionLink: string | null = null

  // Fetch institution name if available for email branding
  let institutionName: string | undefined
  if (institutionId) {
    try {
      const { data: inst } = await supabase
        .from("institutions")
        .select("name")
        .eq("id", institutionId)
        .maybeSingle()
      if (inst?.name) institutionName = inst.name
    } catch {
      // Ignore
    }
  }

  // 1. Try generateLink with type: "invite"
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  })

  if (!linkError && linkData?.user?.id) {
    userId = linkData.user.id
    actionLink = linkData.properties?.action_link || null
    console.log(`✅ User link generated via invite: ${userId}`)
  } else {
    console.log(`ℹ️ generateLink(invite) returned: ${linkError?.message}. Attempting recovery/re-invite for existing user...`)

    // Fallback 1: If user already exists in auth (e.g. email_exists), generate a recovery link so they can set password
    const { data: recData, error: recError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    })

    if (!recError && recData?.user?.id) {
      userId = recData.user.id
      actionLink = recData.properties?.action_link || null
      console.log(`✅ Recovery link generated for existing auth user: ${userId}`)
    } else {
      // Fallback 2: createUser directly with confirmed email
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: Math.random().toString(36).slice(-12) + "A1!",
      })

      if (!createError && createData?.user?.id) {
        userId = createData.user.id
        console.log(`✅ User created via createUser: ${userId}`)

        const { data: postCreateRec } = await supabase.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo },
        })
        actionLink = postCreateRec?.properties?.action_link || null
      } else {
        // Fallback 3: check if user already exists in users table
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle()

        if (existingUser?.id) {
          userId = existingUser.id
          console.log(`✅ Existing user found in users table: ${userId}`)
          const { data: fallbackRec } = await supabase.auth.admin.generateLink({
            type: "recovery",
            email,
            options: { redirectTo },
          })
          actionLink = fallbackRec?.properties?.action_link || null
        } else {
          console.error("🔴 Failed all user invite/creation methods:", { linkError, recError, createError })
          throw new Error(linkError?.message || recError?.message || createError?.message || "Failed to invite user")
        }
      }
    }
  }

  if (!userId) {
    throw new Error("Failed to invite user")
  }

  console.log(`✅ User invited/created, upserting to users table with id: ${userId}, role: ${role}`)
  const { error: upsertError } = await supabase.from("users").upsert({
    id: userId,
    email,
    role,
    institution_id: institutionId,
    organization_id: organizationId,
    name: name || email.split("@")[0], // Use custom name or email prefix
  }, { onConflict: "id" })

  if (upsertError) {
    console.error("🔴 Upsert error in users table:", upsertError)
    throw new Error(upsertError.message)
  }

  // If role is STUDENT, also create a record in the students table
  if (role === "STUDENT" || role === "student") {
    console.log(`📚 Creating student record for user ${userId}`)
    const { error: studentError } = await supabase.from("students").upsert({
      id: userId,
      institution_id: institutionId,
      program_id: null,
      section_id: null,
      semester: null,
      registration_number: null,
      admission_year: null,
    }, { onConflict: "id" })

    if (studentError) {
      console.error("⚠️  Warning: Student record creation failed:", studentError)
    } else {
      console.log(`✅ Student record created`)
    }
  }

  // Send invitation email via Resend
  if (actionLink) {
    try {
      const emailResult = await sendInviteEmail({
        to: email,
        role,
        institutionName,
        actionLink,
      })
      if (!emailResult.success) {
        console.warn(`⚠️ Failed to deliver invite email via Resend to ${email}:`, emailResult.error)
      }
    } catch (e) {
      console.error(`⚠️ Exception dispatching invite email to ${email}:`, e)
    }
  } else {
    // If no actionLink, fallback to Supabase built-in invite
    try {
      await supabase.auth.admin.inviteUserByEmail(email, { redirectTo })
    } catch (e) {
      console.warn("⚠️ Fallback inviteUserByEmail failed:", e)
    }
  }

  return { success: true, message: "Invitation sent successfully", userId, actionLink }
}
