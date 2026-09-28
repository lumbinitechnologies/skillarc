import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (profile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()

    // Verify faculty belongs to the same institution
    const { data: existingFaculty } = await supabase
      .from("users")
      .select("id, institution_id")
      .eq("id", id)
      .maybeSingle()

    if (!existingFaculty || existingFaculty.institution_id !== profile.institution_id) {
      return NextResponse.json({ error: "Faculty member not found or access denied" }, { status: 404 })
    }

    const body = await request.json()
    const { name, department_id, role, is_timetable_builder } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (role && [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(role)) {
      updateData.role = role
    }
    if (department_id !== undefined) {
      updateData.department_id = department_id || null
    }

    const { data: faculty, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
      .select(`
        *,
        department:department_id(
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error("Faculty update error:", error)
      return NextResponse.json({ error: error.message || "Failed to update faculty" }, { status: 400 })
    }

    // Handle Timetable Builder permission
    if (is_timetable_builder !== undefined) {
      let { data: perm } = await supabase
        .from("permissions")
        .select("id")
        .eq("name", "timetable_builder")
        .maybeSingle()

      if (!perm) {
        const { data: newPerm } = await supabase
          .from("permissions")
          .insert({ name: "timetable_builder" })
          .select("id")
          .single()
        perm = newPerm
      }

      if (perm?.id) {
        if (is_timetable_builder) {
          await supabase
            .from("user_permissions")
            .upsert({ user_id: id, permission_id: perm.id })
        } else {
          await supabase
            .from("user_permissions")
            .delete()
            .eq("user_id", id)
            .eq("permission_id", perm.id)
        }
      }
    }

    return NextResponse.json(faculty)
  } catch (error) {
    console.error("Faculty update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (profile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()

    // 1. Verify faculty exists and belongs to this institution
    const { data: facultyUser } = await supabase
      .from("users")
      .select("id, institution_id, role")
      .eq("id", id)
      .maybeSingle()

    if (!facultyUser || facultyUser.institution_id !== profile.institution_id) {
      return NextResponse.json({ error: "Faculty member not found or access denied" }, { status: 404 })
    }

    // 2. Safely unassign or delete related references to prevent foreign key errors
    await Promise.allSettled([
      supabase.from("user_permissions").delete().eq("user_id", id),
      supabase.from("departments_hierarchy").delete().eq("user_id", id),
      supabase.from("faculty_subjects").delete().eq("faculty_id", id),
      supabase.from("timetable_slots").update({ teacher_id: null }).eq("teacher_id", id),
      supabase.from("sections").update({ faculty_advisor_id: null }).eq("faculty_advisor_id", id),
      supabase.from("subjects").update({ faculty_id: null }).eq("faculty_id", id),
    ])

    // 3. Delete from users table
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])

    if (error) {
      console.error("Faculty delete error:", error)
      return NextResponse.json({ error: error.message || "Failed to delete faculty" }, { status: 400 })
    }

    // 4. Also remove from Supabase Auth
    try {
      await supabase.auth.admin.deleteUser(id)
    } catch (authError) {
      console.warn("Could not delete user from auth:", authError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Faculty delete unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
