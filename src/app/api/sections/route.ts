import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

// POST - Create section
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Check role
    const userProfile = await getCurrentUserContext()
    if (!userProfile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (userProfile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, semester, program_id, institution_id, faculty_advisor_id } = body

    if (!name || !semester || !program_id || !institution_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify institution match
    if (institution_id !== userProfile.institution_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: section, error } = await supabase
      .from("sections")
      .insert([
        {
          name,
          semester,
          program_id,
          institution_id,
          faculty_advisor_id: faculty_advisor_id || null,
        },
      ])
      .select("*, faculty_advisor:faculty_advisor_id(id, name, email)")
      .single()

    if (error) throw error

    return NextResponse.json(section)
  } catch (error) {
    console.error("Section creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET - Fetch sections
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const userProfile = await getCurrentUserContext()
    if (!userProfile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const institutionId = request.nextUrl.searchParams.get("institution_id")
    const departmentId = request.nextUrl.searchParams.get("department_id")

    let query = supabase
      .from("sections")
      .select(`
        *,
        faculty_advisor:faculty_advisor_id(
          id,
          name,
          email
        ),
        program:program_id(
          id,
          name
        )
      `)

    if (institutionId) {
      query = query.eq("institution_id", institutionId)
    } else if (userProfile?.institution_id) {
      query = query.eq("institution_id", userProfile.institution_id)
    }

    if (departmentId) {
      const { data: deptPrograms } = await supabase
        .from("programs")
        .select("id")
        .eq("department_id", departmentId)
      
      const programIds = (deptPrograms ?? []).map((p: any) => p.id)
      
      if (programIds.length > 0) {
        query = query.in("program_id", programIds)
      } else {
        return NextResponse.json([])
      }
    }

    const { data: sections, error } = await query.order("semester").order("name")

    if (error) throw error

    return NextResponse.json(sections)
  } catch (error) {
    console.error("Sections fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
