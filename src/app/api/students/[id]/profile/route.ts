import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"
import { ROLES } from "@/constants/roles"
import { canManageStudent, getStudentAccessScope, minimalAcademicProfile, redactStudentProfile } from "@/lib/student-access"

type RouteContext = { params: Promise<{ id: string }> }

async function authorizeStudent(studentId: string, write = false) {
  const actor = await getCurrentUserContext()
  if (!actor) return { error: "Unauthorized", status: 401 as const }

  const admin = createSupabaseAdminClient()
  const { data: student, error } = await admin
    .from("students")
    .select("id, institution_id")
    .eq("id", studentId)
    .maybeSingle()
  if (error) throw error
  if (!student) return { error: "Student not found", status: 404 as const }

  const scope = getStudentAccessScope(actor, studentId, student.institution_id)
  if (!scope) return { error: "Forbidden", status: 403 as const }
  if (write && !canManageStudent(actor, student.institution_id)) return { error: "Forbidden", status: 403 as const }
  return { actor, student, admin, scope }
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const auth = await authorizeStudent(id)
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { admin, student, scope } = auth
    const [userRes, academic] = await Promise.all([
      admin.from("users").select("id, name, email, phone, is_active").eq("id", id).single(),
      getAcademic(admin, id),
    ])
    if (userRes.error) throw userRes.error

    const baseProfile = {
      institution_id: student.institution_id,
      identity: { id, name: userRes.data?.name ?? "", email: userRes.data?.email ?? "", phone: userRes.data?.phone ?? null, is_active: userRes.data?.is_active ?? true },
      academic: scope === "ACADEMIC_STAFF" ? minimalAcademicProfile(academic) : academic,
    }

    if (scope === "ACADEMIC_STAFF") return NextResponse.json(redactStudentProfile(scope, baseProfile))

    const [detailRes, addressRes, emergencyRes, agentRes, marketingRes] = await Promise.all([
      admin.from("student_profile_details").select("*").eq("student_id", id).maybeSingle(),
      admin.from("student_addresses").select("*").eq("student_id", id).order("type"),
      admin.from("student_emergency_contacts").select("*").eq("student_id", id).order("priority"),
      admin.from("education_agents").select("id,name").eq("institution_id", student.institution_id).eq("is_active", true).order("name"),
      admin.from("users").select("id,name,email").eq("institution_id", student.institution_id).in("role", [ROLES.INSTITUTION_ADMIN, ROLES.HOD, ROLES.PROGRAM_HEAD, ROLES.FACULTY]).eq("is_active", true).order("name"),
    ])
    for (const result of [detailRes, addressRes, emergencyRes]) {
      if (result.error && result.error.code !== "42P01") throw result.error
    }

    const studentProfile = {
      ...baseProfile,
      details: detailRes.data ?? null,
      addresses: addressRes.data ?? [],
      emergency_contacts: emergencyRes.data ?? [],
      options: { education_agents: agentRes.data ?? [], marketing_staff: marketingRes.data ?? [] },
    }

    if (scope === "STUDENT_SELF") return NextResponse.json(redactStudentProfile(scope, studentProfile))

    const [notesRes, communicationsRes, activityRes] = await Promise.all([
      admin.from("student_notes").select("*").eq("student_id", id).is("archived_at", null).order("created_at", { ascending: false }),
      admin.from("student_communications").select("*").eq("student_id", id).is("archived_at", null).order("occurred_at", { ascending: false }),
      admin.from("audit_logs").select("id, action, created_at, user_id, entity_id").eq("entity_type", "STUDENT").eq("entity_id", id).order("created_at", { ascending: false }).limit(100),
    ])
    for (const result of [notesRes, communicationsRes, activityRes]) {
      if (result.error && result.error.code !== "42P01") throw result.error
    }

    return NextResponse.json(redactStudentProfile("ADMIN", {
      ...studentProfile,
      notes: notesRes.data ?? [],
      communications: communicationsRes.data ?? [],
      activity: (activityRes.data ?? []).map((event) => ({ id: event.id, action: event.action, created_at: event.created_at, actor_id: event.user_id, student_id: event.entity_id })),
    }))
  } catch (error) {
    console.error("Student profile fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function getAcademic(admin: ReturnType<typeof createSupabaseAdminClient>, studentId: string) {
  const { data } = await admin.from("students").select("registration_number, admission_year, dob, gender, program_id, section_id, intake_id, semester").eq("id", studentId).single()
  return data ?? { registration_number: null, admission_year: null, dob: null, gender: null, program_id: null, section_id: null, intake_id: null, semester: null }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const auth = await authorizeStudent(id, true)
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { actor, student, admin } = auth
    const body = await request.json()

    if (body.identity) {
      const allowed = pick(body.identity, ["name", "phone"])
      if (Object.keys(allowed).length) {
        const { error } = await admin.from("users").update(allowed).eq("id", id).eq("institution_id", student.institution_id)
        if (error) throw error
      }
    }
    if (body.academic) {
      const allowed = pick(body.academic, ["registration_number", "admission_year", "dob", "gender", "program_id", "section_id", "intake_id", "semester"])
      if (Object.keys(allowed).length) {
        const { error } = await admin.from("students").update(allowed).eq("id", id).eq("institution_id", student.institution_id)
        if (error) throw error
      }
    }
    if (body.details) {
      const allowed = pick(body.details, ["citizenship", "country_of_birth", "passport_number", "passport_country", "passport_expiry", "visa_type", "visa_number", "visa_expiry", "english_evidence_type", "english_evidence_reference", "english_evidence_date", "usi", "other_identifiers", "education_agent_id", "marketing_staff_id"])
      if (allowed.education_agent_id) {
        const { data: agent } = await admin.from("education_agents").select("id").eq("id", allowed.education_agent_id).eq("institution_id", student.institution_id).eq("is_active", true).maybeSingle()
        if (!agent) return NextResponse.json({ error: "Invalid education agent" }, { status: 400 })
      }
      if (allowed.marketing_staff_id) {
        const { data: staff } = await admin.from("users").select("id").eq("id", allowed.marketing_staff_id).eq("institution_id", student.institution_id).in("role", [ROLES.INSTITUTION_ADMIN, ROLES.HOD, ROLES.PROGRAM_HEAD, ROLES.FACULTY]).maybeSingle()
        if (!staff) return NextResponse.json({ error: "Invalid marketing staff assignment" }, { status: 400 })
      }
      const { error } = await admin.from("student_profile_details").upsert({ student_id: id, institution_id: student.institution_id, ...allowed, updated_at: new Date().toISOString() }, { onConflict: "student_id" })
      if (error) throw error
    }
    if (Array.isArray(body.addresses)) {
      for (const address of body.addresses) {
        if (address.id) {
          const { data: existing } = await admin.from("student_addresses").select("id").eq("id", address.id).eq("student_id", id).maybeSingle()
          if (!existing) return NextResponse.json({ error: "Invalid address relation" }, { status: 400 })
        }
        const allowed = pick(address, ["id", "type", "address_line_1", "address_line_2", "locality", "state_province", "postal_code", "country", "is_current"])
        const { error } = await admin.from("student_addresses").upsert({ ...allowed, student_id: id, institution_id: student.institution_id, updated_at: new Date().toISOString() }, { onConflict: "id" })
        if (error) throw error
      }
    }
    if (Array.isArray(body.emergency_contacts)) {
      for (const contact of body.emergency_contacts) {
        if (contact.id) {
          const { data: existing } = await admin.from("student_emergency_contacts").select("id").eq("id", contact.id).eq("student_id", id).maybeSingle()
          if (!existing) return NextResponse.json({ error: "Invalid emergency contact relation" }, { status: 400 })
        }
        const allowed = pick(contact, ["id", "name", "relationship", "email", "phone", "address", "priority", "is_primary"])
        const { error } = await admin.from("student_emergency_contacts").upsert({ ...allowed, student_id: id, institution_id: student.institution_id, updated_at: new Date().toISOString() }, { onConflict: "id" })
        if (error) throw error
      }
    }
    if (body.note?.body) {
      const { error } = await admin.from("student_notes").insert({ student_id: id, institution_id: student.institution_id, actor_id: actor.id, body: String(body.note.body) })
      if (error) throw error
    }
    if (body.communication?.summary && body.communication?.channel) {
      const { error } = await admin.from("student_communications").insert({ student_id: id, institution_id: student.institution_id, actor_id: actor.id, summary: String(body.communication.summary), channel: String(body.communication.channel), occurred_at: body.communication.occurred_at ?? new Date().toISOString() })
      if (error) throw error
    }

    const { error: auditError } = await admin.from("audit_logs").insert({ user_id: actor.id, action: "STUDENT_PROFILE_UPDATED", entity_type: "STUDENT", entity_id: id, metadata: { groups: Object.keys(body).filter((key) => key !== "note" && key !== "communication") } })
    if (auditError) throw auditError
    return GET(request, { params: Promise.resolve({ id }) })
  } catch (error) {
    console.error("Student profile update error:", error)
    return NextResponse.json({ error: "Invalid profile update" }, { status: 400 })
  }
}

function pick(value: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.filter((key) => Object.prototype.hasOwnProperty.call(value, key)).map((key) => [key, value[key]]))
}
