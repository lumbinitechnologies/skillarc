import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"

const adminRoles = new Set<string>([ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.INSTITUTION_ADMIN])

async function authorizeStudent(id: string) {
  const actor = await getCurrentUserContext()
  if (!actor) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (!adminRoles.has(actor.role)) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  const admin = createSupabaseAdminClient()
  const { data: student, error } = await admin.from("students").select("id,institution_id").eq("id", id).maybeSingle()
  if (error) throw error
  if (!student) return { response: NextResponse.json({ error: "Student not found" }, { status: 404 }) }
  if (actor.role === ROLES.INSTITUTION_ADMIN && actor.institution_id !== student.institution_id) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  return { actor, admin, student }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authorizeStudent(id)
    if ("response" in auth) return auth.response
    const { admin, student } = auth

    const body = await request.json()
    const { name, section_id, semester, program_id, registration_number, admission_year } = body

    if (name) {
      const { error: userError } = await admin
        .from("users")
        .update({ name })
        .eq("id", id)
        .eq("role", ROLES.STUDENT)
        .eq("institution_id", student.institution_id)

      if (userError) throw userError
    }

    const studentUpdate: Record<string, string | number | null> = {}
    if (section_id !== undefined) studentUpdate.section_id = section_id || null
    if (semester !== undefined) studentUpdate.semester = semester || null
    if (program_id !== undefined) studentUpdate.program_id = program_id || null
    if (registration_number !== undefined) studentUpdate.registration_number = registration_number || null
    if (admission_year !== undefined) studentUpdate.admission_year = admission_year || null

    if (Object.keys(studentUpdate).length > 0) {
      const { error: studentError } = await admin
        .from("students")
        .update(studentUpdate)
        .eq("id", id)
        .eq("institution_id", student.institution_id)

      if (studentError) throw studentError
    }

    const { data: updatedStudent } = await admin
      .from("students")
      .select(`
        *,
        section:section_id(
          id,
          name,
          semester,
          program_id,
          program:program_id(id, name)
        )
      `)
      .eq("id", id)
      .single()

    const { data: userData } = await admin
      .from("users")
      .select("name, email, role, is_active")
      .eq("id", id)
      .single()

    return NextResponse.json({ ...updatedStudent, ...userData })
  } catch (error) {
    console.error("Student update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authorizeStudent(id)
    if ("response" in auth) return auth.response
    const { admin, student } = auth
    const { error } = await admin
      .from("users")
      .delete()
      .eq("id", id)
      .eq("role", ROLES.STUDENT)
      .eq("institution_id", student.institution_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Student delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
