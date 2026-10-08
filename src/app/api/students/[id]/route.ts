import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"
import { inviteUser, resolveAppOrigin } from "@/lib/invite-user"

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
    const { actor, admin, student } = auth

    const body = await request.json()
    const {
      name,
      section_id,
      semester,
      program_id,
      registration_number,
      admission_year,
      parentName,
      parentEmail,
      parentPhone,
      parentRelationship,
    } = body

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

    // Create / Link parent if details provided
    if (parentEmail && parentName) {
      // Check if parent already exists
      const { data: existingParent } = await admin
        .from("users")
        .select("id")
        .eq("email", parentEmail)
        .eq("role", ROLES.PARENT)
        .maybeSingle()

      let parentUserId = existingParent?.id

      if (!parentUserId) {
        // Use the same inviteUser flow so the parent receives an email
        // with a link to set their password and access their account
        try {
          const inviteResult = await inviteUser({
            email: parentEmail,
            role: ROLES.PARENT,
            institutionId: student.institution_id,
            organizationId: actor.organization_id || "",
            origin: resolveAppOrigin(request.headers),
            name: parentName,
          })
          parentUserId = inviteResult.userId ?? undefined

          // Patch phone (inviteUser doesn't handle it)
          if (parentUserId) {
            await admin.from("users").update({
              name: parentName,
              phone: parentPhone || null,
            }).eq("id", parentUserId)
          }
        } catch (inviteErr) {
          console.error("Parent invite failed:", inviteErr)
          // Non-fatal — student record updated; parent can be linked later
        }
      }

      if (parentUserId) {
        const { data: existingRelation } = await admin
          .from("parent_student_relations")
          .select("id")
          .eq("parent_id", parentUserId)
          .eq("student_id", id)
          .maybeSingle()

        if (!existingRelation) {
          await admin.from("parent_student_relations").insert({
            parent_id: parentUserId,
            student_id: id,
            relationship: parentRelationship || "Guardian",
          })
        }
      }
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
