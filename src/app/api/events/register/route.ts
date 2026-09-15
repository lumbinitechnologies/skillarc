import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserContext()

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const eventId = body.event_id

    if (!eventId) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    // Check if registration already exists
    const { data: existing } = await admin
      .from("event_registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", profile.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ message: "Already registered", data: existing }, { status: 200 })
    }

    const { data, error } = await admin
      .from("event_registrations")
      .insert([{ event_id: eventId, user_id: profile.id }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const profile = await getCurrentUserContext()

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("event_id")

    if (!eventId) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    const { error } = await admin
      .from("event_registrations")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", profile.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
