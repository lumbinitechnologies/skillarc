import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"

type Context = { params: Promise<{ id: string }> }

async function auth() {
  const actor = await getCurrentUserContext()
  if (!actor?.institution_id || !["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN"].includes(actor.role)) return null
  return { actor, admin: createSupabaseAdminClient() }
}

export async function GET(_request: NextRequest, { params }: Context) {
  const access = await auth()
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  const { data, error } = await access.admin.from("admission_status_history").select("*").eq("application_id", id).eq("institution_id", access.actor.institution_id).order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ history: data ?? [] })
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const access = await auth()
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  const body = await request.json() as { status?: string; reason?: string }
  const status = body.status
  if (!status) return NextResponse.json({ error: "status is required" }, { status: 400 })
  const { data, error } = await access.admin.rpc("admissions_transition", { p_application_id: id, p_new_status: status, p_actor_id: access.actor.id, p_reason: body.reason ?? null })
  if (error) return NextResponse.json({ error: error.message }, { status: 409 })
  return NextResponse.json({ application: data })
}
