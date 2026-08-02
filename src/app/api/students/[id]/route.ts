import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, section_id, semester, program_id, registration_number, admission_year } = body

    if (name) {
      const { error: userError } = await supabase
        .from("users")
        .update({ name })
        .eq("id", id)
        .eq("role", ROLES.STUDENT)

      if (userError) throw userError
    }

    const studentUpdate: Record<string, any> = {}
    if (section_id !== undefined) studentUpdate.section_id = section_id || null
    if (semester !== undefined) studentUpdate.semester = semester || null
    if (program_id !== undefined) studentUpdate.program_id = program_id || null
    if (registration_number !== undefined) studentUpdate.registration_number = registration_number || null
    if (admission_year !== undefined) studentUpdate.admission_year = admission_year || null

    if (Object.keys(studentUpdate).length > 0) {
      const { error: studentError } = await supabase
        .from("students")
        .update(studentUpdate)
        .eq("id", id)

      if (studentError) throw studentError
    }

    const { data: updatedStudent } = await supabase
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

    const { data: userData } = await supabase
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
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .eq("role", ROLES.STUDENT)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Student delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
