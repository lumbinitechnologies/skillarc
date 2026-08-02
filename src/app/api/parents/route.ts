import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("users")
      .select("role, institution_id, organization_id")
      .eq("id", user.id)
      .single()

    if (profile?.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, institution_id, organization_id } = body

    if (!name || !email || !institution_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (institution_id !== profile.institution_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const adminClient = createSupabaseAdminClient()

    // 1. Check if the parent profile already exists in public.users
    const { data: existingUser } = await adminClient
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle()

    if (existingUser) {
      if (existingUser.role !== ROLES.PARENT) {
        return NextResponse.json({ error: "Email is already registered with another role" }, { status: 400 })
      }
      // If it exists and is a parent, update its details and return
      const { data: updatedParent, error: updateError } = await adminClient
        .from("users")
        .update({
          name,
          institution_id,
          organization_id: organization_id || profile?.organization_id || existingUser.organization_id
        })
        .eq("id", existingUser.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      return NextResponse.json(updatedParent)
    }

    // 2. Try creating the auth user
    let authData: any = null
    let authError: any = null

    try {
      const createRes = await adminClient.auth.admin.createUser({
        email,
        password: password || Math.random().toString(36).slice(-12),
        email_confirm: true,
      })
      authData = createRes.data
      authError = createRes.error
    } catch (err: any) {
      authError = err
    }

    let parentUserId = authData?.user?.id

    if (authError) {
      // If auth user already exists in auth.users, resolve their ID
      if (authError.message?.toLowerCase().includes("already") || authError.status === 422) {
        const { data: userList } = await adminClient.auth.admin.listUsers()
        const existingAuthUser = userList?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
        if (existingAuthUser) {
          parentUserId = existingAuthUser.id
        } else {
          throw authError
        }
      } else {
        throw authError
      }
    }

    if (!parentUserId) {
      throw new Error("Failed to create or resolve parent auth user")
    }

    // 3. Create the parent profile in public.users
    const { data: parent, error } = await adminClient
      .from("users")
      .insert([
        {
          id: parentUserId,
          name,
          email,
          role: ROLES.PARENT,
          institution_id,
          organization_id: organization_id || profile?.organization_id || null,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(parent)
  } catch (error) {
    console.error("Parent creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const institutionId = request.nextUrl.searchParams.get("institution_id")

    let query = supabase.from("users").select("*").eq("role", ROLES.PARENT)
    if (institutionId) query = query.eq("institution_id", institutionId)

    const { data: parents, error } = await query.order("name")
    if (error) throw error

    if (!parents || parents.length === 0) {
      return NextResponse.json([])
    }

    const parentIds = parents.map((p: any) => p.id)
    const adminClient = createSupabaseAdminClient()

    // Fetch relations
    const { data: relations, error: relError } = await adminClient
      .from("parent_student_relations")
      .select(`
        id,
        parent_id,
        relationship,
        student_id
      `)
      .in("parent_id", parentIds)

    if (relError) throw relError

    // Fetch all student details
    const studentIds = Array.from(new Set((relations ?? []).map((r: any) => r.student_id)))
    let studentUsers: any[] = []
    let studentRecords: any[] = []

    if (studentIds.length > 0) {
      const [usersRes, studentsRes] = await Promise.all([
        adminClient.from("users").select("id, name, email").in("id", studentIds),
        adminClient.from("students").select("id, registration_number").in("id", studentIds)
      ])
      studentUsers = usersRes.data || []
      studentRecords = studentsRes.data || []
    }

    const parentList = parents.map((parent: any) => {
      const parentRelations = (relations ?? []).filter((r: any) => r.parent_id === parent.id)
      const linkedStudents = parentRelations.map((r: any) => {
        const userDet = studentUsers.find((u: any) => u.id === r.student_id)
        const recDet = studentRecords.find((s: any) => s.id === r.student_id)
        return {
          id: r.student_id,
          name: userDet?.name || "Unknown",
          email: userDet?.email || "",
          registration_number: recDet?.registration_number || "",
          relationship: r.relationship,
          relationId: r.id
        }
      })

      return {
        ...parent,
        students: linkedStudents
      }
    })

    return NextResponse.json(parentList)
  } catch (error) {
    console.error("Parent fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
