import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

/**
 * GET /api/notifications — fetch the current user's notifications.
 * Uses the admin client to bypass any RLS configuration issues.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()

  const { data, error } = await admin
    .from("notifications")
    .select("id, title, message, is_read, link, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30)

  if (error) {
    console.error("Failed to fetch notifications:", error)
    return NextResponse.json({ notifications: [] })
  }

  return NextResponse.json({ notifications: data ?? [] })
}

/**
 * PATCH /api/notifications — mark one or all notifications as read.
 * Body: { id?: string, all?: boolean }
 */
export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const admin = createSupabaseAdminClient()

  if (body.all) {
    await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
  } else if (body.id) {
    await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", body.id)
      .eq("user_id", user.id)
  }

  return NextResponse.json({ success: true })
}
