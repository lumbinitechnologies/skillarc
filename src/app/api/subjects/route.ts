import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

// CREATE SUBJECT
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (profile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { institution_id, name, code, semester, program_id, credits, subject_type } = body

    const { data, error } = await supabase
      .from("subjects")
      .insert([{
        institution_id,
        name,
        code,
        semester,
        program_id: program_id || null,
        credits,
        subject_type,
      }])
      .select(`
        *,
        program:program_id(
          id, name,
          department:department_id(id, name)
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Subject create error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET SUBJECTS
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("subjects")
      .select(`
        *,
        program:program_id(
          id, name,
          department:department_id(id, name)
        )
      `)
      .eq("institution_id", profile?.institution_id)
      .order("semester")
      .order("name")

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Subjects fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}