import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"

async function auth() {
  const actor = await getCurrentUserContext()
  if (!actor?.institution_id || !["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN"].includes(actor.role)) return null
  return { actor, admin: createSupabaseAdminClient() }
}

export async function GET() {
  const access = await auth()
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { actor, admin } = access
  const [programs, intakes, fees, templates, students, inst] = await Promise.all([
    admin.from("programs").select("id,name").eq("institution_id", actor.institution_id),
    admin.from("intakes").select("id,name,start_date,end_date").eq("institution_id", actor.institution_id).order("start_date"),
    admin.from("admission_fee_configurations").select("*").eq("institution_id", actor.institution_id).eq("is_active", true),
    admin.from("admission_templates").select("id,document_type,version,name,body,merge_fields,is_active").eq("institution_id", actor.institution_id).eq("is_active", true),
    admin.from("students").select("id,users!inner(name,email,phone)").eq("institution_id", actor.institution_id).order("id").limit(200),
    admin.from("institutions").select("id,name,domain").eq("id", actor.institution_id).maybeSingle(),
  ])
  return NextResponse.json({
    institution: inst.data ?? null,
    programs: programs.data ?? [],
    intakes: intakes.data ?? [],
    fees: fees.data ?? [],
    templates: templates.data ?? [],
    students: students.data ?? [],
  })
}

export async function POST(request: NextRequest) {
  const access = await auth()
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { actor, admin } = access
  const body = await request.json() as Record<string, unknown>
  const type = body.type
  if (type === "fee") {
    const amount = Number(body.amount)
    const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "AUD"
    if (!Number.isFinite(amount) || amount <= 0 || typeof body.program_id !== "string" || typeof body.intake_id !== "string" || !/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "A positive amount, program, intake, and ISO currency are required" }, { status: 400 })
    const { data: previous } = await admin.from("admission_fee_configurations").select("id,version").eq("institution_id", actor.institution_id).eq("program_id", body.program_id).eq("intake_id", body.intake_id).order("version", { ascending: false }).limit(1).maybeSingle()
    const { data, error } = await admin.from("admission_fee_configurations").insert({ institution_id: actor.institution_id, program_id: body.program_id, intake_id: body.intake_id, amount, currency, version: (previous?.version ?? 0) + 1, is_active: false, created_by: actor.id }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (previous?.id) await admin.from("admission_fee_configurations").update({ is_active: false }).eq("id", previous.id)
    const { data: activeFee, error: activationError } = await admin.from("admission_fee_configurations").update({ is_active: true }).eq("id", data.id).select().single()
    if (activationError) return NextResponse.json({ error: activationError.message }, { status: 400 })
    return NextResponse.json({ fee: activeFee }, { status: 201 })
  }
  if (type === "template") {
    const documentType = body.document_type === "AGREEMENT" ? "AGREEMENT" : body.document_type === "OFFER" ? "OFFER" : null
    const mergeFields = Array.isArray(body.merge_fields) ? body.merge_fields.filter((v): v is string => typeof v === "string") : []
    const allowed = new Set(["student_name", "student_email", "student_phone", "qualification", "intake_name", "intake_start_date", "intake_end_date", "course_start_date", "course_end_date", "fee_amount", "fee_currency", "citizenship", "country_of_birth", "passport_country", "passport_expiry", "visa_type", "visa_expiry", "english_evidence_type"])
    const version = Number(body.version ?? 1)
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const templateBody = typeof body.body === "string" ? body.body.trim() : ""
    if (!documentType || !name || !templateBody || !Number.isInteger(version) || version < 1 || mergeFields.some((field) => !allowed.has(field))) return NextResponse.json({ error: "Invalid template, version, or merge field" }, { status: 400 })
    const { data: previous } = await admin.from("admission_templates").select("id,version").eq("institution_id", actor.institution_id).eq("document_type", documentType).order("version", { ascending: false }).limit(1).maybeSingle()
    const nextVersion = previous ? Math.max(version, previous.version + 1) : version
    const { data, error } = await admin.from("admission_templates").insert({ institution_id: actor.institution_id, document_type: documentType, version: nextVersion, name, body: templateBody, merge_fields: mergeFields, is_active: false, created_by: actor.id }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (previous?.id) await admin.from("admission_templates").update({ is_active: false }).eq("id", previous.id)
    const { data: activeTemplate, error: activationError } = await admin.from("admission_templates").update({ is_active: true }).eq("id", data.id).select().single()
    if (activationError) return NextResponse.json({ error: activationError.message }, { status: 400 })
    return NextResponse.json({ template: activeTemplate }, { status: 201 })
  }
  return NextResponse.json({ error: "type must be fee or template" }, { status: 400 })
}
