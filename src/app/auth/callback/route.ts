import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { markStudentPortalActive } from "@/lib/portal-access"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") || "/auth/set-password"
  const inviteEmail = searchParams.get("inviteEmail")

  // Build query parameter for the final destination
  const callbackQuery = inviteEmail ? `?inviteEmail=${encodeURIComponent(inviteEmail)}` : ""

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore if called from Server Component
          }
        },
      },
    }
  )

  const finalizeRedirect = async (session: { user?: { id?: string; email?: string | null } } | null) => {
    if (!session?.user?.email) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent("Failed to establish invite session.")}`
      )
    }

    const sessionEmail = session.user.email
    if (inviteEmail && sessionEmail.toLowerCase() !== inviteEmail.toLowerCase()) {
      console.warn("⚠️ Invite email mismatch in callback route handler", { inviteEmail, sessionEmail })
      await supabase.auth.signOut()
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent("Signed in account does not match the invited email.")}`
      )
    }

    // A successful invite callback is the supported activation boundary. The
    // callback receives no token persistence responsibility; Auth owns it.
    if (inviteEmail) {
      if (session.user.id) await markStudentPortalActive(session.user.id)
    }

    return NextResponse.redirect(`${origin}${next}${callbackQuery}`)
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.session) {
      return finalizeRedirect(data.session)
    }

    console.error("❌ Callback exchange error in route handler:", error)
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error?.message || "Failed to verify session link.")}`
    )
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    })

    if (!error && data?.session) {
      return finalizeRedirect(data.session)
    }

    console.error("❌ Callback token verification error in route handler:", error)
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error?.message || "Failed to verify invite token.")}`
    )
  }

  const finishUrl = new URL("/auth/callback-finish", origin)
  if (next) finishUrl.searchParams.set("next", next)
  if (inviteEmail) finishUrl.searchParams.set("inviteEmail", inviteEmail)
  return NextResponse.redirect(finishUrl.toString())
}
