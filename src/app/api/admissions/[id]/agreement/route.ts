import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Context) {
  const actor = await getCurrentUserContext()
  if (!actor?.institution_id || !["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN"].includes(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  const body = await request.json() as { rendered_html?: string; storage_bucket?: string; storage_path?: string }
  if (!body.rendered_html && (!body.storage_bucket || !body.storage_path)) return NextResponse.json({ error: "Agreement HTML or private storage reference is required" }, { status: 400 })
  const admin = createSupabaseAdminClient()
  const { data: application } = await admin.from("admissions_applications").select("id,institution_id").eq("id", id).eq("institution_id", actor.institution_id).maybeSingle()
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 })
  const { data: latest } = await admin.from("admission_documents_v2").select("version").eq("application_id", id).eq("document_type", "AGREEMENT").order("version", { ascending: false }).limit(1).maybeSingle()
  const { data, error } = await admin.from("admission_documents_v2").insert({ application_id: id, institution_id: actor.institution_id, document_type: "AGREEMENT", version: (latest?.version ?? 0) + 1, rendered_html: body.rendered_html ?? null, storage_bucket: body.storage_bucket ?? null, storage_path: body.storage_path ?? null, status: "UPLOADED", source_data: { uploaded: true }, created_by: actor.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await admin.from("audit_logs").insert({ user_id: actor.id, action: "ADMISSION_AGREEMENT_UPLOADED", entity_type: "ADMISSION_APPLICATION", entity_id: id, metadata: { version: data.version } })
  return NextResponse.json({ agreement: data }, { status: 201 })
}
