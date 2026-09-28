import { Resend } from "resend"

function getResendClient() {
  const key = process.env.RESEND_API_KEY || process.env.RESEND_KEY
  if (!key) return null
  return new Resend(key)
}

function getFromEmail() {
  const raw =
    process.env.RESEND_FROM_EMAIL ||
    process.env.NOTIFICATION_FROM_EMAIL ||
    "SkillArc <admin@lumbinitechnologies.com>"

  let clean = raw.trim().replace(/^[\s"'\\]+|[\s"'\\]+$/g, "").trim()
  if (!clean.includes("<") && clean.includes("@")) {
    clean = `SkillArc <${clean}>`
  }
  return clean || "SkillArc <admin@lumbinitechnologies.com>"
}

export async function sendInviteEmail(params: {
  to: string
  role: string
  institutionName?: string
  actionLink: string
}) {
  const resend = getResendClient()
  if (!resend) {
    console.warn("⚠️ [AuthEmail] RESEND_API_KEY is not set. Cannot send invite email to:", params.to)
    return { success: false, error: "RESEND_API_KEY is not configured" }
  }

  const roleFormatted = params.role.replace(/_/g, " ").toLowerCase()
  const displayRole = roleFormatted.charAt(0).toUpperCase() + roleFormatted.slice(1)
  const instName = params.institutionName || "your institution"

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join SkillArc</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; background: linear-gradient(135deg, #14234B 0%, #1E3A8A 100%); text-align: left;">
              <span style="font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">SkillArc</span>
              <div style="font-size: 13px; color: #EAAD62; margin-top: 4px; font-weight: 500;">Academic Operations & Learning Platform</div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 32px; text-align: left;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #111827; line-height: 1.3;">
                You've been invited as ${displayRole}
              </h1>
              
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #4B5563;">
                Hello,
              </p>
              
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4B5563;">
                You have been invited to join <strong>${instName}</strong> on SkillArc as a <strong>${displayRole}</strong> member. To activate your account and access your dashboard, please set your password below:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${params.actionLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #E57D37; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px; box-shadow: 0 2px 4px rgba(229, 125, 55, 0.2);">
                      Set Up Your Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #6B7280;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 12px; line-height: 1.5; word-break: break-all; color: #E57D37; background: #FFF7ED; padding: 10px 14px; border-radius: 8px; border: 1px solid #FFEDD5;">
                <a href="${params.actionLink}" style="color: #E57D37; text-decoration: underline;">${params.actionLink}</a>
              </p>
              
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9CA3AF;">
                This invitation link will expire in 24 hours. If you did not expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                &copy; ${new Date().getFullYear()} SkillArc. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  try {
    const result = await resend.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: `Invitation: Join ${instName} on SkillArc`,
      html,
    })

    if (result.error) {
      console.error("🔴 [AuthEmail] Resend error:", result.error)
      return { success: false, error: result.error.message }
    }

    console.log(`✅ [AuthEmail] Invite email sent to ${params.to} (ID: ${result.data?.id})`)
    return { success: true, emailId: result.data?.id }
  } catch (err: any) {
    console.error("🔴 [AuthEmail] Exception sending invite email:", err)
    return { success: false, error: err.message || "Failed to send email" }
  }
}

export async function sendPasswordResetEmail(params: {
  to: string
  actionLink: string
}) {
  const resend = getResendClient()
  if (!resend) {
    console.warn("⚠️ [AuthEmail] RESEND_API_KEY is not set. Cannot send reset email to:", params.to)
    return { success: false, error: "RESEND_API_KEY is not configured" }
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your SkillArc Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; background: linear-gradient(135deg, #14234B 0%, #1E3A8A 100%); text-align: left;">
              <span style="font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">SkillArc</span>
              <div style="font-size: 13px; color: #EAAD62; margin-top: 4px; font-weight: 500;">Academic Operations & Learning Platform</div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 32px; text-align: left;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #111827; line-height: 1.3;">
                Reset Your Password
              </h1>
              
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #4B5563;">
                Hello,
              </p>
              
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4B5563;">
                We received a request to reset the password for your SkillArc account (<strong>${params.to}</strong>). Click the button below to choose a new password:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${params.actionLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #E57D37; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px; box-shadow: 0 2px 4px rgba(229, 125, 55, 0.2);">
                      Reset Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #6B7280;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 12px; line-height: 1.5; word-break: break-all; color: #E57D37; background: #FFF7ED; padding: 10px 14px; border-radius: 8px; border: 1px solid #FFEDD5;">
                <a href="${params.actionLink}" style="color: #E57D37; text-decoration: underline;">${params.actionLink}</a>
              </p>
              
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9CA3AF;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                &copy; ${new Date().getFullYear()} SkillArc. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  try {
    const result = await resend.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: "Reset your SkillArc password",
      html,
    })

    if (result.error) {
      console.error("🔴 [AuthEmail] Resend error:", result.error)
      return { success: false, error: result.error.message }
    }

    console.log(`✅ [AuthEmail] Password reset email sent to ${params.to} (ID: ${result.data?.id})`)
    return { success: true, emailId: result.data?.id }
  } catch (err: any) {
    console.error("🔴 [AuthEmail] Exception sending reset email:", err)
    return { success: false, error: err.message || "Failed to send email" }
  }
}
