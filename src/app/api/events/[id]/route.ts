import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"
import { ROLES } from "@/constants/roles"

export const dynamic = "force-dynamic"

const ALLOWED_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.ORG_ADMIN,
  ROLES.INSTITUTION_ADMIN,
  ROLES.HOD,
  ROLES.PROGRAM_HEAD,
  ROLES.FACULTY,
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getCurrentUserContext()

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!ALLOWED_ROLES.has(profile.role as any)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to edit events." },
        { status: 403 }
      )
    }

    const admin = createSupabaseAdminClient()
    const body = await request.json()
    const updatePayload: Record<string, any> = {}

    if (body.title !== undefined) updatePayload.title = body.title
    if (body.description !== undefined) {
      updatePayload.description = typeof body.description === "string" ? body.description : JSON.stringify(body.description)
    }
    if (body.event_date !== undefined) updatePayload.event_date = body.event_date
    if (body.venue !== undefined) updatePayload.venue = body.venue
    if (body.image_url !== undefined) updatePayload.image_url = body.image_url

    const { data, error } = await admin
      .from("events")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (updatePayload.image_url) {
        delete updatePayload.image_url
        const { data: retryData, error: retryError } = await admin
          .from("events")
          .update(updatePayload)
          .eq("id", id)
          .select()
          .single()

        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 400 })
        }
        return NextResponse.json(retryData)
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getCurrentUserContext()

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!ALLOWED_ROLES.has(profile.role as any)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete events." },
        { status: 403 }
      )
    }

    const admin = createSupabaseAdminClient()

    // Clean up registrations first
    await admin.from("event_registrations").delete().eq("event_id", id)

    const { error } = await admin.from("events").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
