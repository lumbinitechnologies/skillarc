import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { revalidateTag } from "next/cache"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()

  // 1. Try to fetch from public.users table with admin client
  let coreProfile: any = null
  try {
    const { data } = await admin
      .from("users")
      .select("id, name, email, phone, role, profile_image_url")
      .eq("id", user.id)
      .maybeSingle()
    coreProfile = data
  } catch (err) {
    console.warn("Could not query users table:", err)
  }

  // Fallback to auth user metadata if users table row is missing or empty
  const fullName = coreProfile?.name || (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || user.email?.split("@")[0] || "User"
  const email = coreProfile?.email || user.email || ""
  const phone = coreProfile?.phone || user.phone || (user.user_metadata as any)?.phone || ""
  const role = coreProfile?.role || (user.user_metadata as any)?.role || "STUDENT"
  const profileImageUrl = coreProfile?.profile_image_url || (user.user_metadata as any)?.profile_image_url || (user.user_metadata as any)?.avatar_url || null

  // 2. Fetch extended details from user_profile_details
  let details: any = null
  try {
    const { data } = await admin
      .from("user_profile_details")
      .select("pronouns, bio, links")
      .eq("user_id", user.id)
      .maybeSingle()
    details = data
  } catch (err) {
    // If table doesn't exist yet, details will be null
  }

  return NextResponse.json({
    id: user.id,
    name: fullName,
    email: email,
    phone: phone,
    role: role,
    profile_image_url: profileImageUrl,
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
  const { name, phone, pronouns, bio, links, profile_image_url } = body

  const admin = createSupabaseAdminClient()

  // 1. Update public.users table if present
  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (typeof name === "string" && name.trim()) updatePayload.name = name.trim()
    if (typeof phone === "string") updatePayload.phone = phone.trim()
    if (profile_image_url !== undefined) updatePayload.profile_image_url = profile_image_url

    await admin
      .from("users")
      .update(updatePayload)
      .eq("id", user.id)
  } catch (err) {
    console.warn("Could not update users table:", err)
  }

  // 2. Also update auth user metadata so session reflects it immediately
  try {
    const metaUpdates: Record<string, any> = { ...(user.user_metadata || {}) }
    if (typeof name === "string" && name.trim()) {
      metaUpdates.full_name = name.trim()
      metaUpdates.name = name.trim()
    }
    if (typeof phone === "string") metaUpdates.phone = phone.trim()
    if (profile_image_url !== undefined) {
      metaUpdates.profile_image_url = profile_image_url
      metaUpdates.avatar_url = profile_image_url
    }
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: metaUpdates,
    })
  } catch (err) {
    console.warn("Could not update auth metadata:", err)
  }

  // 3. Upsert user_profile_details table
  try {
    await admin.from("user_profile_details").upsert(
      {
        user_id: user.id,
        pronouns: pronouns ?? null,
        bio: bio ?? null,
        links: Array.isArray(links) ? links : [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
  } catch (err) {
    console.warn("Could not upsert user_profile_details:", err)
  }

  revalidateTag(`dashboard:user-profile:${user.id}`, "max")

  return NextResponse.json({ success: true })
}
