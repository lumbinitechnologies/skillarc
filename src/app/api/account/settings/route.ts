import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"

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

  const { data: coreProfile } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .single()

  const { data: settings } = await supabase
    .from("user_account_settings")
    .select("display_name, sortable_name, language, timezone")
    .eq("user_id", user.id)
    .maybeSingle()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const identities = authUser?.identities?.map((i) => ({
    provider: i.provider,
    identifier: i.identity_data?.email ?? i.identity_data?.sub ?? "—",
  })) ?? []

  return NextResponse.json({
    full_name: coreProfile?.name ?? "",
    display_name: settings?.display_name ?? coreProfile?.name ?? "",
    sortable_name: settings?.sortable_name ?? "",
    language: settings?.language ?? DEFAULT_LANGUAGE,
    timezone: settings?.timezone ?? DEFAULT_TIMEZONE,
    email: coreProfile?.email ?? "",
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

  const { error } = await supabase.from("user_account_settings").upsert(
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
    console.error("Failed to update account settings:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
