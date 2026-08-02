import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

// GET - Fetch single section
export async function GET(
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

    const { data: section, error } = await supabase
      .from("sections")
      .select("*, faculty_advisor:faculty_advisor_id(id, name, email)")
      .eq("id", id)
      .single()

    if (error) throw error
    if (!section) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(section)
  } catch (error) {
    console.error("Section fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update section
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const userProfile = await getCurrentUserContext()
    if (!userProfile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (userProfile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, semester, program_id, faculty_advisor_id } = body

    const { data: section, error: updateError } = await supabase
      .from("sections")
      .update({
        name,
        semester,
        program_id,
        faculty_advisor_id: faculty_advisor_id || null,
      })
      .eq("id", id)
      .select("*, faculty_advisor:faculty_advisor_id(id, name, email)")
      .single()

    if (updateError) throw updateError

    return NextResponse.json(section)
  } catch (error) {
    console.error("Section update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Delete section
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const userProfile = await getCurrentUserContext()
    if (!userProfile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (userProfile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabase.from("sections").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Section delete error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
