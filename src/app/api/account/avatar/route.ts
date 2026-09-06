import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { revalidateTag } from "next/cache"

export const dynamic = "force-dynamic"

const BUCKET_NAME = "avatars"
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
])

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createSupabaseAdminClient()
    const contentType = request.headers.get("content-type") || ""

    // 1. JSON payload for preset avatars or direct URL
    if (contentType.includes("application/json")) {
      const body = await request.json()
      const { avatar_url } = body

      if (typeof avatar_url !== "string" || !avatar_url.trim()) {
        return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 })
      }

      const cleanUrl = avatar_url.trim()

      // Update public.users table
      try {
        await admin
          .from("users")
          .update({
            profile_image_url: cleanUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
      } catch (err) {
        console.warn("Could not update users table:", err)
      }

      // Sync auth user metadata
      try {
        await admin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata || {}),
            profile_image_url: cleanUrl,
            avatar_url: cleanUrl,
          },
        })
      } catch (err) {
        console.warn("Could not update auth metadata:", err)
      }

      revalidateTag(`dashboard:user-profile:${user.id}`, "max")
      return NextResponse.json({ success: true, profile_image_url: cleanUrl })
    }

    // 2. FormData payload for file upload
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 413 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WebP, GIF, or SVG images are accepted" },
        { status: 415 }
      )
    }

    // Ensure bucket exists
    try {
      await admin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_BYTES,
      })
    } catch {
      // Bucket may already exist
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(fileExt) ? fileExt : "jpg"
    const filePath = `${user.id}/${Date.now()}.${safeExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await admin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError.message)
      return NextResponse.json({ error: "Failed to upload image to storage" }, { status: 500 })
    }

    const { data: publicUrlData } = admin.storage.from(BUCKET_NAME).getPublicUrl(filePath)
    const publicUrl = publicUrlData.publicUrl

    // Update public.users table
    try {
      await admin
        .from("users")
        .update({
          profile_image_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
    } catch (err) {
      console.warn("Could not update users table:", err)
    }

    // Sync auth user metadata
    try {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata || {}),
          profile_image_url: publicUrl,
          avatar_url: publicUrl,
        },
      })
    } catch (err) {
      console.warn("Could not update auth metadata:", err)
    }

    revalidateTag(`dashboard:user-profile:${user.id}`, "max")
    return NextResponse.json({ success: true, profile_image_url: publicUrl })
  } catch (err: any) {
    console.error("Avatar upload handler error:", err)
    return NextResponse.json(
      { error: err?.message || "Internal server error during avatar upload" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createSupabaseAdminClient()

    // Update public.users table
    try {
      await admin
        .from("users")
        .update({
          profile_image_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
    } catch (err) {
      console.warn("Could not update users table:", err)
    }

    // Sync auth user metadata
    try {
      const meta = { ...(user.user_metadata || {}) }
      delete meta.profile_image_url
      delete meta.avatar_url
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: meta,
      })
    } catch (err) {
      console.warn("Could not update auth metadata:", err)
    }

    revalidateTag(`dashboard:user-profile:${user.id}`, "max")
    return NextResponse.json({ success: true, profile_image_url: null })
  } catch (err: any) {
    console.error("Avatar delete handler error:", err)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
