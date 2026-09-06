import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { dispatchNotification, NotificationCategory } from "@/lib/notification-service"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const category: NotificationCategory = body.category || "announcements"
    const title = body.title || "🔔 SkillArc Notification Test"
    const message =
      body.message ||
      "This is a real-time test notification confirming your in-app alert badge and email delivery are working seamlessly!"
    const link = body.link || "/dashboard"

    const result = await dispatchNotification({
      userId: user.id,
      category,
      title,
      message,
      link,
    })

    const hasResendKey = Boolean(process.env.RESEND_API_KEY || process.env.RESEND_KEY)

    return NextResponse.json({
      success: true,
      userEmail: user.email,
      pushEnabled: result.pushEnabled,
      emailEnabled: result.emailEnabled,
      emailSent: result.emailSent,
      emailError: result.emailError,
      hasResendKey,
      message: `Test notification dispatched for ${user.email}`,
    })
  } catch (err: any) {
    console.error("Test notification failed:", err)
    return NextResponse.json({ error: err?.message || "Failed to dispatch test notification" }, { status: 500 })
  }
}
