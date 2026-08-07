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
    const { institution_id, name, code, semester, program_id, program_ids, credits, subject_type } = body

    const targetProgramIds = Array.isArray(program_ids)
      ? program_ids
      : (program_id ? [program_id] : [null])

    const rowsToInsert = targetProgramIds.map((progId) => ({
      institution_id,
      name,
      code,
      semester,
      program_id: progId || null,
      credits,
      subject_type,
    }))

    const { data, error } = await supabase
      .from("subjects")
      .insert(rowsToInsert)
      .select(`
        *,
        program:program_id(
          id, name,
          department:department_id(id, name)
        )
      `)

    if (error) throw error

    // If a single ID was requested and single row created, return single object to maintain compatibility
    const responseData = !Array.isArray(program_ids) && data && data.length > 0 ? data[0] : data

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Subject create error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET SUBJECTS
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const departmentId = request.nextUrl.searchParams.get("department_id")

    let query = supabase
      .from("subjects")
      .select(`
        *,
        program:program_id(
          id, name,
          department:department_id(id, name)
        )
      `)
      .eq("institution_id", profile?.institution_id)

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

    const { data, error } = await query.order("semester").order("name")

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Subjects fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}