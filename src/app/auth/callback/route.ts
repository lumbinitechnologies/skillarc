import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") || "/auth/set-password"
  const inviteEmail = searchParams.get("inviteEmail")
  
  // Build query parameter for the final destination
  const callbackQuery = inviteEmail ? `?inviteEmail=${encodeURIComponent(inviteEmail)}` : ""

  if (code) {
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.session) {
      const sessionEmail = data.session.user?.email
      // Check for email mismatch on invite flow
      if (inviteEmail && sessionEmail && sessionEmail.toLowerCase() !== inviteEmail.toLowerCase()) {
        console.warn("⚠️ Invite email mismatch in callback route handler", { inviteEmail, sessionEmail })
        // Overwrite/clear the mismatched session and redirect to login with error
        await supabase.auth.signOut()
        return NextResponse.redirect(
          `${origin}/auth/login?error=${encodeURIComponent("Signed in account does not match the invited email.")}`
        )
      }

      // Successful exchange - redirect to the next path
      return NextResponse.redirect(`${origin}${next}${callbackQuery}`)
    } else {
      console.error("❌ Callback exchange error in route handler:", error)
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(error?.message || "Failed to verify session link.")}`
      )
    }
  }

  // Fallback if no code is present
  return NextResponse.redirect(`${origin}/auth/login?error=No authentication code provided`)
}
