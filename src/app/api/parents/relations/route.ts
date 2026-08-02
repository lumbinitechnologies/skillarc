import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = request.nextUrl
    const student_id = searchParams.get("student_id")
    const parent_id = searchParams.get("parent_id")

    const adminClient = createSupabaseAdminClient()

    if (student_id) {
      const { data, error } = await adminClient
        .from("parent_student_relations")
        .select(`
          id,
          parent_id,
          student_id,
          relationship,
          parent:users!parent_id(id, name, email, phone)
        `)
        .eq("student_id", student_id)

      if (error) throw error
      return NextResponse.json(data || [])
    }

    if (parent_id) {
      const { data, error } = await adminClient
        .from("parent_student_relations")
        .select(`
          id,
          parent_id,
          student_id,
          relationship,
          student:users!student_id(id, name, email, phone)
        `)
        .eq("parent_id", parent_id)

      if (error) throw error
      return NextResponse.json(data || [])
    }

    return NextResponse.json({ error: "student_id or parent_id is required" }, { status: 400 })
  } catch (error: any) {
    console.error("Relations fetch error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (profile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { parent_id, student_id, registration_number, email, relationship } = body

    if (!parent_id) {
      return NextResponse.json({ error: "Parent ID is required" }, { status: 400 })
    }

    const adminClient = createSupabaseAdminClient()
    let targetStudentId = student_id

    // Resolve student ID if email or registration number is provided
    if (!targetStudentId) {
      if (registration_number) {
        const { data: studentRec } = await adminClient
          .from("students")
          .select("id")
          .eq("institution_id", profile.institution_id)
          .eq("registration_number", registration_number)
          .maybeSingle()
        
        targetStudentId = studentRec?.id
      } else if (email) {
        const { data: studentUser } = await adminClient
          .from("users")
          .select("id")
          .eq("institution_id", profile.institution_id)
          .eq("email", email)
          .eq("role", ROLES.STUDENT)
          .maybeSingle()
        
        targetStudentId = studentUser?.id
      }
    }

    if (!targetStudentId) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check if relationship already exists
    const { data: existing } = await adminClient
      .from("parent_student_relations")
      .select("id")
      .eq("parent_id", parent_id)
      .eq("student_id", targetStudentId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "Relation already exists" }, { status: 400 })
    }

    const { data: relation, error } = await adminClient
      .from("parent_student_relations")
      .insert({
        parent_id,
        student_id: targetStudentId,
        relationship: relationship || "Guardian",
      })
      .select()
      .single()

    if (error) throw error

    // Fetch student info to return
    const [userRes, studRes] = await Promise.all([
      adminClient.from("users").select("name, email").eq("id", targetStudentId).single(),
      adminClient.from("students").select("registration_number").eq("id", targetStudentId).single()
    ])

    return NextResponse.json({
      ...relation,
      student: {
        id: targetStudentId,
        name: userRes.data?.name || "Unknown",
        email: userRes.data?.email || "",
        registration_number: studRes.data?.registration_number || ""
      }
    })
  } catch (error: any) {
    console.error("Relation creation error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (profile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const id = searchParams.get("id")
    const parent_id = searchParams.get("parent_id")
    const student_id = searchParams.get("student_id")

    const adminClient = createSupabaseAdminClient()
    let deleteQuery = adminClient.from("parent_student_relations").delete()

    if (id && id !== "undefined" && id !== "null" && id !== "") {
      deleteQuery = deleteQuery.eq("id", id)
    } else if (parent_id && student_id) {
      deleteQuery = deleteQuery.eq("parent_id", parent_id).eq("student_id", student_id)
    } else {
      return NextResponse.json({ error: "id or parent_id and student_id must be provided" }, { status: 400 })
    }

    const { error } = await deleteQuery

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Relation delete error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
