import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { resolveAppOrigin } from "@/lib/invite-user"
import { sendPasswordResetEmail } from "@/lib/auth-email"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()
    const supabaseAdmin = createSupabaseAdminClient()
    const origin = resolveAppOrigin(request.headers)
    const redirectTo = `${origin}/auth/callback`

    console.log(`[Forgot Password] Generating reset link for ${trimmedEmail}, redirect: ${redirectTo}`)

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: trimmedEmail,
      options: { redirectTo },
    })

    if (linkError) {
      console.warn("[Forgot Password] generateLink error:", linkError)
      // Check if user exists to avoid leaking, but return success to client for security
      return NextResponse.json({
        success: true,
        message: "If an account exists for this email, a reset link has been sent.",
      })
    }

    const actionLink = linkData?.properties?.action_link
    if (actionLink) {
      const emailResult = await sendPasswordResetEmail({
        to: trimmedEmail,
        actionLink,
      })

      if (!emailResult.success) {
        console.error("[Forgot Password] Failed to send email via Resend:", emailResult.error)
        return NextResponse.json(
          { error: emailResult.error || "Failed to send reset email. Please try again." },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for this email, a reset link has been sent.",
    })
  } catch (error: any) {
    console.error("[Forgot Password] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 })
  }
}
