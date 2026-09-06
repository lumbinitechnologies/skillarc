import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

const DEFAULT_LANGUAGE = "en-US"
const DEFAULT_TIMEZONE = "America/New_York"

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()

  let coreProfile: any = null
  try {
    const { data } = await admin
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle()
    coreProfile = data
  } catch (err) {
    console.warn("Could not query users table:", err)
  }

  let settings: any = null
  try {
    const { data } = await admin
      .from("user_account_settings")
      .select("display_name, sortable_name, language, timezone")
      .eq("user_id", user.id)
      .maybeSingle()
    settings = data
  } catch (err) {
    console.warn("Could not query user_account_settings table:", err)
  }

  const identities = user.identities?.map((i) => ({
    provider: i.provider,
    identifier: (i.identity_data as any)?.email ?? (i.identity_data as any)?.sub ?? "—",
  })) ?? []

  const fullName = coreProfile?.name || (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || user.email?.split("@")[0] || ""
  const email = coreProfile?.email || user.email || ""

  return NextResponse.json({
    full_name: fullName,
    display_name: settings?.display_name ?? fullName,
    sortable_name: settings?.sortable_name ?? "",
    language: settings?.language ?? DEFAULT_LANGUAGE,
    timezone: settings?.timezone ?? DEFAULT_TIMEZONE,
    email: email,
    logins: identities,
  })
}

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { display_name, sortable_name, language, timezone } = body

  const admin = createSupabaseAdminClient()

  try {
    const { error } = await admin.from("user_account_settings").upsert(
      {
        user_id: user.id,
        display_name: display_name ?? null,
        sortable_name: sortable_name ?? null,
        language: language || DEFAULT_LANGUAGE,
        timezone: timezone || DEFAULT_TIMEZONE,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    if (error) {
      console.warn("Could not upsert user_account_settings:", error.message)
    }
  } catch (err: any) {
    console.warn("Error updating account settings table:", err?.message || err)
  }

  return NextResponse.json({ success: true })
}
