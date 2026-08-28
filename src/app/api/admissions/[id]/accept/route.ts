import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Context) {
  const actor = await getCurrentUserContext()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => ({})) as { decision?: "accept" | "decline"; reference?: string }
  const decision = body.decision === "decline" ? "DECLINED" : "OFFER_ACCEPTED"
  const admin = createSupabaseAdminClient()
  const { data: application } = await admin.from("admissions_applications").select("id,student_id,institution_id,status").eq("id", id).maybeSingle()
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 })
  if (actor.role === "STUDENT" && (application.student_id !== actor.id || application.institution_id !== actor.institution_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!["STUDENT", "SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN"].includes(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { data, error } = await admin.rpc("admissions_transition", {
    p_application_id: id, p_new_status: decision, p_actor_id: actor.id,
    p_reason: body.reference ? `Acceptance reference: ${body.reference}` : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 409 })
  await admin.from("offer_letters").update({ acceptance_actor_id: actor.id, acceptance_reference: body.reference ?? null, signed_at: decision === "OFFER_ACCEPTED" ? new Date().toISOString() : null, status: decision === "OFFER_ACCEPTED" ? "ACCEPTED" : "DECLINED" }).eq("application_id", id).eq("status", "SENT")
  return NextResponse.json({ application: data })
}
