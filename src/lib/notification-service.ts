import { Resend } from "resend"
import { createSupabaseAdminClient } from "./supabase-admin"

export type NotificationCategory =
  | "due_date"
  | "grading"
  | "announcements"
  | "course_content"
  | "files"
  | "grading_policy"
  | "invitations"
  | "submissions"
  | "late_grading"

export interface SendNotificationParams {
  userId: string
  category: NotificationCategory
  title: string
  message: string
  link?: string
  metadata?: Record<string, any>
}

function getResendClient() {
  const key = process.env.RESEND_API_KEY || process.env.RESEND_KEY
  if (!key) return null
  return new Resend(key)
}

function getFromEmail() {
  return (
    process.env.NOTIFICATION_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.FROM_EMAIL ||
    "SkillArc <onboarding@resend.dev>"
  )
}

export interface DispatchResult {
  pushEnabled: boolean
  emailEnabled: boolean
  emailSent: boolean
  emailError?: string
  recipientEmail?: string
}

/**
 * Dispatches a notification via both in-app and email channels
 * strictly based on user's notification preferences.
 */
export async function dispatchNotification({
  userId,
  category,
  title,
  message,
  link,
}: SendNotificationParams): Promise<DispatchResult> {
  const admin = createSupabaseAdminClient()

  let emailEnabled = true
  let pushEnabled = true
  let userEmail: string | null = null
  let emailSent = false
  let emailError: string | undefined = undefined

  try {
    // 1. Fetch user's preference for this specific category
    const { data: pref } = await admin
      .from("notification_preferences")
      .select("email_enabled, push_enabled")
      .eq("user_id", userId)
      .eq("category", category)
      .maybeSingle()

    if (pref) {
      emailEnabled = pref.email_enabled
      pushEnabled = pref.push_enabled
    }

    // 2. Fetch user's email address
    const { data: user } = await admin
      .from("users")
      .select("email")
      .eq("id", userId)
      .maybeSingle()

    if (user?.email) {
      userEmail = user.email
    }
  } catch (err) {
    console.warn("Error reading notification preferences:", err)
  }

  // 3. Dispatch In-App Notification (Bell icon in Navbar)
  if (pushEnabled) {
    try {
      const payload: any = {
        user_id: userId,
        title,
        message,
        is_read: false,
        created_at: new Date().toISOString(),
      }
      if (link) {
        payload.link = link
      }

      const { error: insertErr } = await admin.from("notifications").insert(payload)
      if (insertErr && (insertErr.code === "42703" || insertErr.message?.includes("link"))) {
        delete payload.link
        await admin.from("notifications").insert(payload)
      }
    } catch (err) {
      console.warn("Failed to insert in-app notification:", err)
    }
  }

  // 4. Dispatch Email if email is enabled for this category
  if (emailEnabled && userEmail) {
    const resend = getResendClient()
    const fromEmail = getFromEmail()

    if (resend) {
      try {
        const response = await resend.emails.send({
          from: fromEmail,
          to: userEmail,
          subject: `${title} | SkillArc`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px;">
              <div style="margin-bottom: 24px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px; font-weight: 900; color: #E57D37; letter-spacing: -0.5px;">SkillArc</span>
              </div>
              <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px; line-height: 1.4;">${title}</h2>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">${message}</p>
              ${
                link
                  ? `<div style="margin-bottom: 28px;"><a href="${link}" style="display: inline-block; background: #E57D37; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: 700;">Open in Dashboard →</a></div>`
                  : ""
              }
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
              <p style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
                You received this email because you opted into <strong>${category.replace(/_/g, " ")}</strong> notifications in your SkillArc Account Center. You can update your preferences anytime under Account &gt; Notifications.
              </p>
            </div>
          `,
        })

        if (response.error) {
          console.warn("Resend email response error:", response.error)
          emailError = response.error.message || "Resend email delivery failed"
        } else {
          emailSent = true
        }
      } catch (err: any) {
        console.error("Resend email delivery exception:", err?.message || err)
        emailError = err?.message || "Resend email delivery exception"
      }
    } else {
      console.log(`[Notification Service] 📧 Email queued for ${userEmail} (${title}). Set RESEND_API_KEY in .env to send live emails.`)
    }
  }

  return {
    pushEnabled,
    emailEnabled,
    emailSent,
    emailError,
    recipientEmail: userEmail || undefined,
  }
}

/**
 * Dispatches notifications in batch to multiple users with preference filtering
 */
export async function dispatchBatchNotifications(
  userIds: string[],
  category: NotificationCategory,
  title: string,
  message: string,
  link?: string
) {
  if (!userIds || userIds.length === 0) return

  // Fire dispatches in parallel
  await Promise.allSettled(
    userIds.map((uid) =>
      dispatchNotification({
        userId: uid,
        category,
        title,
        message,
        link,
      })
    )
  )
}
