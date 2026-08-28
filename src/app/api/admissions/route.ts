import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"
import { ROLES } from "@/constants/roles"

const adminRoles: Set<string> = new Set([ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.INSTITUTION_ADMIN])

async function authorize() {
  const actor = await getCurrentUserContext()
  if (!actor) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (!adminRoles.has(actor.role) || !actor.institution_id) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  return { actor, admin: createSupabaseAdminClient() }
}

export async function GET() {
  try {
    const auth = await authorize()
    if ("response" in auth) return auth.response
    const { actor, admin } = auth
    const { data, error } = await admin
      .from("admissions_applications")
      .select("*, programs(id,name), intakes(id,name,start_date,end_date), admission_documents(id,document_name,file_url,status), offer_letters(id,version,status,course_fees,term_start,rendered_html,agreement_document_id)")
      .eq("institution_id", actor.institution_id)
      .order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json({ applications: data ?? [] })
  } catch (error) {
    console.error("Admissions list error:", error)
    return NextResponse.json({ error: "Unable to load admissions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorize()
    if ("response" in auth) return auth.response
    const { actor, admin } = auth
    const body = await request.json() as Record<string, unknown>
    const firstName = String(body.first_name ?? "").trim()
    const lastName = String(body.last_name ?? "").trim()
    const email = String(body.email ?? "").trim().toLowerCase()
    const programId = typeof body.program_id === "string" ? body.program_id : null
    const intakeId = typeof body.intake_id === "string" ? body.intake_id : null
    const feeConfigurationId = typeof body.fee_configuration_id === "string" ? body.fee_configuration_id : null
    const requestedStudentId = typeof body.student_id === "string" && body.student_id ? body.student_id : null
    if (!firstName || !lastName || !email || !programId || !intakeId || !feeConfigurationId) {
      return NextResponse.json({ error: "first_name, last_name, email, program_id, intake_id, and fee_configuration_id are required" }, { status: 400 })
    }
    const { data: existing } = await admin.from("users").select("id,role").eq("institution_id", actor.institution_id).eq("email", email).maybeSingle()
    const studentId = requestedStudentId ?? existing?.id ?? null
    if (existing && existing.role !== "STUDENT" && !requestedStudentId) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    if (requestedStudentId) {
      const { data: selectedStudent } = await admin.from("students").select("id").eq("id", requestedStudentId).eq("institution_id", actor.institution_id).maybeSingle()
      const { data: selectedUser } = await admin.from("users").select("id,role,email").eq("id", requestedStudentId).eq("institution_id", actor.institution_id).maybeSingle()
      if (!selectedStudent || selectedUser?.role !== "STUDENT") return NextResponse.json({ error: "Selected student is outside the actor institution" }, { status: 400 })
      if (selectedUser.email?.toLowerCase() !== email) return NextResponse.json({ error: "Application email must match the selected student" }, { status: 400 })
    }
    const { data: program } = await admin.from("programs").select("id").eq("id", programId).eq("institution_id", actor.institution_id).maybeSingle()
    const { data: intake } = await admin.from("intakes").select("id,start_date,end_date").eq("id", intakeId).eq("institution_id", actor.institution_id).maybeSingle()
    const { data: fee } = await admin.from("admission_fee_configurations").select("id,program_id,intake_id").eq("id", feeConfigurationId).eq("institution_id", actor.institution_id).eq("program_id", programId).eq("intake_id", intakeId).eq("is_active", true).maybeSingle()
    if (!program || !intake || !fee || new Date(intake.start_date) >= new Date(intake.end_date)) return NextResponse.json({ error: "Invalid program, intake, or active fee configuration" }, { status: 400 })
    const { data, error } = await admin.from("admissions_applications").insert({
      institution_id: actor.institution_id, student_id: studentId, first_name: firstName, last_name: lastName,
      email, phone: typeof body.phone === "string" ? body.phone.trim() || null : null, program_id: programId, intake_id: intakeId, fee_configuration_id: fee.id,
      course_start_date: body.course_start_date ?? intake.start_date, course_end_date: body.course_end_date ?? intake.end_date, status: "APPLIED",
    }).select().single()
    if (error) throw error
    await admin.from("admission_status_history").insert({ application_id: data.id, institution_id: actor.institution_id, actor_id: actor.id, new_status: "APPLIED", reason: "Application created" })
    await admin.from("audit_logs").insert({ user_id: actor.id, action: "ADMISSION_APPLICATION_CREATED", entity_type: "ADMISSION_APPLICATION", entity_id: data.id })
    return NextResponse.json({ application: data }, { status: 201 })
  } catch (error) {
    console.error("Admissions create error:", error)
    return NextResponse.json({ error: "Unable to create application" }, { status: 400 })
  }
}
