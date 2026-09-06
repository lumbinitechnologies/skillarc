import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

const BUCKET_NAME = "event-images"
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
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

    // Enforce role check: Students cannot upload event photos
    const { data: dbUser } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const userRole = (dbUser?.role || (user.user_metadata as any)?.role || "student").toLowerCase()
    const ALLOWED_ROLES = new Set(["super_admin", "org_admin", "institution_admin", "hod", "program_head", "faculty"])

    if (!ALLOWED_ROLES.has(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: Students are not permitted to upload event photos." },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const eventId = formData.get("event_id") as string | null
    const uploadType = (formData.get("type") as string) || "cover" // "cover" | "gallery"
    const caption = (formData.get("caption") as string) || ""

    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WebP, GIF, or SVG images are accepted" },
        { status: 415 }
      )
    }

    // Ensure storage bucket exists
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
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 40)
    const filePath = `${eventId || "general"}/${uploadType}/${Date.now()}-${cleanFileName}.${safeExt}`

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

    // If an eventId was provided, update the event record directly
    if (eventId) {
      const { data: currentEvent } = await admin
        .from("events")
        .select("id, description, image_url, gallery_images")
        .eq("id", eventId)
        .maybeSingle()

      if (currentEvent) {
        let descObj: any = {}
        try {
          descObj = JSON.parse(currentEvent.description || "{}")
        } catch {
          descObj = { description: currentEvent.description }
        }

        if (uploadType === "cover") {
          descObj.image_url = publicUrl
          await admin
            .from("events")
            .update({
              image_url: publicUrl,
              description: JSON.stringify(descObj),
            })
            .eq("id", eventId)
        } else if (uploadType === "gallery") {
          const newGalleryItem = {
            url: publicUrl,
            caption: caption.trim() || undefined,
            uploaded_at: new Date().toISOString(),
            uploaded_by: user.id,
          }

          const existingGallery = Array.isArray(currentEvent.gallery_images)
            ? currentEvent.gallery_images
            : Array.isArray(descObj.gallery_images)
            ? descObj.gallery_images
            : []

          const updatedGallery = [...existingGallery, newGalleryItem]
          descObj.gallery_images = updatedGallery

          await admin
            .from("events")
            .update({
              gallery_images: updatedGallery,
              description: JSON.stringify(descObj),
            })
            .eq("id", eventId)
        }
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      publicUrl,
    })
  } catch (err: any) {
    console.error("Event image upload error:", err)
    return NextResponse.json(
      { error: err?.message || "Internal server error during image upload" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createSupabaseAdminClient()

    // Enforce role check: Students cannot delete event photos
    const { data: dbUser } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const userRole = (dbUser?.role || (user.user_metadata as any)?.role || "student").toLowerCase()
    const ALLOWED_ROLES = new Set(["super_admin", "org_admin", "institution_admin", "hod", "program_head", "faculty"])

    if (!ALLOWED_ROLES.has(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: Students are not permitted to delete event photos." },
        { status: 403 }
      )
    }

    const { event_id, image_url } = await request.json()

    if (!event_id || !image_url) {
      return NextResponse.json({ error: "Missing event_id or image_url" }, { status: 400 })
    }

    const { data: currentEvent } = await admin
      .from("events")
      .select("id, description, image_url, gallery_images")
      .eq("id", event_id)
      .maybeSingle()

    if (!currentEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    let descObj: any = {}
    try {
      descObj = JSON.parse(currentEvent.description || "{}")
    } catch {
      descObj = { description: currentEvent.description }
    }

    const existingGallery: any[] = Array.isArray(currentEvent.gallery_images)
      ? currentEvent.gallery_images
      : Array.isArray(descObj.gallery_images)
      ? descObj.gallery_images
      : []

    const updatedGallery = existingGallery.filter((item) => (typeof item === "string" ? item : item?.url) !== image_url)
    descObj.gallery_images = updatedGallery

    // Also check if this was the cover image
    let updatedCover = currentEvent.image_url
    if (updatedCover === image_url) {
      updatedCover = null
      descObj.image_url = null
    }

    await admin
      .from("events")
      .update({
        gallery_images: updatedGallery,
        image_url: updatedCover,
        description: JSON.stringify(descObj),
      })
      .eq("id", event_id)

    return NextResponse.json({
      success: true,
      gallery_images: updatedGallery,
      image_url: updatedCover,
    })
  } catch (err: any) {
    console.error("Event image delete error:", err)
    return NextResponse.json(
      { error: err?.message || "Internal server error during image delete" },
      { status: 500 }
    )
  }
}

