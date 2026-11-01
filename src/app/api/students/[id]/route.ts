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

  // 1. Check users table first (primary identity table)
  const { data: studentUser } = await admin
    .from("users")
    .select("id, institution_id, role")
    .eq("id", id)
    .maybeSingle()

  if (studentUser) {
    if (studentUser.role !== ROLES.STUDENT) {
      return { response: NextResponse.json({ error: "User is not a student" }, { status: 400 }) }
    }
    if (actor.role === ROLES.INSTITUTION_ADMIN && actor.institution_id !== studentUser.institution_id) {
      return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
    }
    return { actor, admin, student: studentUser }
  }

  // 2. Fallback: check students table if users record wasn't found directly
  const { data: studentRow } = await admin
    .from("students")
    .select("id, institution_id")
    .eq("id", id)
    .maybeSingle()

  if (!studentRow) return { response: NextResponse.json({ error: "Student not found" }, { status: 404 }) }
  if (actor.role === ROLES.INSTITUTION_ADMIN && actor.institution_id !== studentRow.institution_id) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { actor, admin, student: studentRow }
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
      phone,
      dob,
      gender,
      parentName,
      parentEmail,
      parentPhone,
      parentRelationship,
    } = body

    const userUpdate: Record<string, any> = {}
    if (name !== undefined) userUpdate.name = name
    if (phone !== undefined) userUpdate.phone = phone || null

    if (Object.keys(userUpdate).length > 0) {
      const { error: userError } = await admin
        .from("users")
        .update(userUpdate)
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
    if (dob !== undefined) studentUpdate.dob = dob || null
    if (gender !== undefined) studentUpdate.gender = gender || null

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

    // 1. Clean up all child/dependent records that reference this student to prevent foreign key errors
    await Promise.allSettled([
      // Parent relations
      admin.from("parent_student_relations").delete().eq("student_id", id),
      // Student profile & documents
      admin.from("student_documents").delete().eq("student_id", id),
      admin.from("student_profile_details").delete().eq("student_id", id),
      admin.from("student_addresses").delete().eq("student_id", id),
      admin.from("student_emergency_contacts").delete().eq("student_id", id),
      admin.from("student_notes").delete().eq("student_id", id),
      admin.from("student_communications").delete().eq("student_id", id),
      admin.from("student_portal_access").delete().eq("student_id", id),
      admin.from("student_portal_access").delete().eq("auth_user_id", id),
      // Attendance & Academics
      admin.from("attendance_records").delete().eq("student_id", id),
      admin.from("attendance_warning_letters").delete().eq("student_id", id),
      admin.from("leave_applications").delete().eq("student_id", id),
      admin.from("warning_letters").delete().eq("student_id", id),
      admin.from("submissions").delete().eq("student_id", id),
      admin.from("grade_entries").delete().eq("student_id", id),
      admin.from("enrolments").delete().eq("student_id", id),
      admin.from("payment_plans").delete().eq("student_id", id),
      admin.from("applications").delete().eq("student_id", id),
      admin.from("complaints").delete().eq("student_id", id),
      admin.from("group_members").delete().eq("student_id", id),
      admin.from("user_permissions").delete().eq("user_id", id),
      admin.from("audit_logs").delete().eq("user_id", id),
      // Notifications & preferences
      admin.from("notifications").delete().eq("user_id", id),
      admin.from("notification_preferences").delete().eq("user_id", id),
    ])

    // 2. Delete specialized student record if present
    await admin
      .from("students")
      .delete()
      .eq("id", id)
      .eq("institution_id", student.institution_id)

    // 3. Delete from users table
    const { error } = await admin
      .from("users")
      .delete()
      .eq("id", id)
      .eq("role", ROLES.STUDENT)
      .eq("institution_id", student.institution_id)

    if (error) {
      console.error("Student user delete error:", error)
      return NextResponse.json({ error: error.message || "Failed to delete student" }, { status: 400 })
    }

    // 4. Also remove from Supabase Auth if auth account exists
    try {
      await admin.auth.admin.deleteUser(id)
    } catch (authError) {
      console.warn("Could not delete student from Supabase Auth:", authError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Student delete unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
