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

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserContext()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedInstitutionId = searchParams.get("institution_id")
    const isGlobalAdmin = new Set<string>([ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN]).has(profile.role) || profile.isSuperAdmin
    const institutionId = isGlobalAdmin ? (requestedInstitutionId || profile.institution_id) : profile.institution_id

    const admin = createSupabaseAdminClient()
    let query = admin.from("events").select("*")

    if (institutionId) {
      query = query.eq("institution_id", institutionId)
    }

    const { data, error } = await query.order("event_date", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserContext()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!ALLOWED_ROLES.has(profile.role as any)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to create events." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const isGlobalAdmin = new Set<string>([ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN]).has(profile.role) || profile.isSuperAdmin
    const institutionId = isGlobalAdmin ? (body.institution_id || profile.institution_id) : profile.institution_id

    if (!institutionId && !isGlobalAdmin) {
      return NextResponse.json(
        { error: "Institution ID is required to create an event." },
        { status: 400 }
      )
    }

    const admin = createSupabaseAdminClient()

    const eventPayload: Record<string, any> = {
      title: body.title,
      description: typeof body.description === "string" ? body.description : JSON.stringify(body.description || {}),
      event_date: body.event_date || new Date().toISOString(),
      venue: body.venue || "Campus Hall",
      created_by: profile.id,
      institution_id: institutionId,
    }

    if (body.image_url) {
      eventPayload.image_url = body.image_url
    }

    const { data, error } = await admin
      .from("events")
      .insert([eventPayload])
      .select()
      .single()

    if (error) {
      if (eventPayload.image_url) {
        delete eventPayload.image_url
        const { data: retryData, error: retryError } = await admin
          .from("events")
          .insert([eventPayload])
          .select()
          .single()

        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 400 })
        }
        return NextResponse.json(retryData, { status: 201 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
