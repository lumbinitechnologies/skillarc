import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (profile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, department_id, role, is_timetable_builder } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (role && [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(role)) {
      updateData.role = role
    }

    const { data: faculty, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
      .select()
      .single()

    if (error) throw error

    // Handle department mapping
    if (department_id) {
      const { error: deptError } = await supabase.from("departments_hierarchy").upsert([
        {
          user_id: id,
          department_id,
          role: role || faculty.role,
        },
      ])
      if (deptError) throw deptError
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (profile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Faculty delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
