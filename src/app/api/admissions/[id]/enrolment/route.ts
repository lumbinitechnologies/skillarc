import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"

type Context = { params: Promise<{ id: string }> }
const adminRoles = new Set(["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN"])

async function access(id: string) {
  const actor = await getCurrentUserContext()
  if (!actor?.institution_id || !adminRoles.has(actor.role)) return null
  const admin = createSupabaseAdminClient()
  const { data: application } = await admin
    .from("admissions_applications")
    .select("id,institution_id,program_id,intake_id,course_start_date,course_end_date,status,first_name,last_name,email")
    .eq("id", id)
    .eq("institution_id", actor.institution_id)
    .maybeSingle()
  return application ? { actor, admin, application } : null
}

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params
  const current = await access(id)
  if (!current) return NextResponse.json({ error: "Forbidden or application not found" }, { status: 403 })
  const { admin, actor, application } = current
  const { data: sectionRows } = await admin.from("sections").select("id,name,semester,program_id").eq("institution_id", actor.institution_id).eq("program_id", application.program_id)
  const applicationFee = await admin.from("admissions_applications").select("fee_configuration_id").eq("id", id).single()
  const sectionIds = (sectionRows ?? []).map((section) => section.id)
  const [programs, intakes, trainers, subjects, timetable, fee, existing] = await Promise.all([
    admin.from("programs").select("id,name").eq("institution_id", actor.institution_id),
    admin.from("intakes").select("id,name,start_date,end_date").eq("institution_id", actor.institution_id).order("start_date"),
    admin.from("users").select("id,name,email").eq("institution_id", actor.institution_id).eq("role", "FACULTY").eq("is_active", true).order("name"),
    admin.from("subjects").select("id,name,code,semester,program_id").eq("institution_id", actor.institution_id).eq("program_id", application.program_id).order("semester").order("name"),
    sectionIds.length ? admin.from("timetable_slots").select("id,day,period,subject_id,faculty_id,semester,section_id").in("section_id", sectionIds) : Promise.resolve({ data: [] }),
    applicationFee.data?.fee_configuration_id ? admin.from("admission_fee_configurations").select("amount,currency").eq("id", applicationFee.data.fee_configuration_id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from("enrolments").select("id,student_id,section_id,trainer_id,started_at,ended_at,enrolment_units(id,subject_id,planned_start,planned_end,trainer_id),enrolment_timetable_slots(id,enrolment_unit_id,timetable_slot_id)").eq("source_application_id", id).maybeSingle(),
  ])
  return NextResponse.json({ application, programs: programs.data ?? [], intakes: intakes.data ?? [], sections: sectionRows ?? [], trainers: trainers.data ?? [], subjects: subjects.data ?? [], timetable: timetable.data ?? [], fee: fee.data ?? null, enrolment: existing.data ?? null })
}

export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params
  const current = await access(id)
  if (!current) return NextResponse.json({ error: "Forbidden or application not found" }, { status: 403 })
  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "A complete enrolment package is required" }, { status: 400 })
  const { data, error } = await current.admin.rpc("admissions_convert_to_enrolment", { p_application_id: id, p_actor_id: current.actor.id, p_payload: payload })
  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "23505" ? 409 : 400
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json(data, { status: data?.idempotent ? 200 : 201 })
}
