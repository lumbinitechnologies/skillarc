import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: coreProfile, error: coreError } = await supabase
    .from("users")
    .select("id, name, email, phone, role, profile_image_url")
    .eq("id", user.id)
    .single()

  if (coreError || !coreProfile) {
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 })
  }

  const { data: details } = await supabase
    .from("user_profile_details")
    .select("pronouns, bio, links")
    .eq("user_id", user.id)
    .maybeSingle()

  return NextResponse.json({
    id: coreProfile.id,
    name: coreProfile.name,
    email: coreProfile.email,
    phone: coreProfile.phone,
    role: coreProfile.role,
    profile_image_url: coreProfile.profile_image_url,
    pronouns: details?.pronouns ?? "",
    bio: details?.bio ?? "",
    links: details?.links ?? [],
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
  const { name, phone, pronouns, bio, links } = body

  if (typeof name === "string" || typeof phone === "string") {
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({
        ...(typeof name === "string" ? { name } : {}),
        ...(typeof phone === "string" ? { phone } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (userUpdateError) {
      console.error("Failed to update users table:", userUpdateError.message)
      return NextResponse.json({ error: userUpdateError.message }, { status: 500 })
    }
  }

  const { error: detailsError } = await supabase.from("user_profile_details").upsert(
    {
      user_id: user.id,
      pronouns: pronouns ?? null,
      bio: bio ?? null,
      links: Array.isArray(links) ? links : [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  if (detailsError) {
    console.error("Failed to update profile details:", detailsError.message)
    return NextResponse.json({ error: detailsError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
