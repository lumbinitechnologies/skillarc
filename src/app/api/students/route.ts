import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { inviteUser, resolveAppOrigin } from "@/lib/invite-user"
import { getCurrentUserContext } from "@/lib/user-context"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const adminClient = createSupabaseAdminClient()

    const { searchParams } = request.nextUrl
    const institutionId = searchParams.get("institution_id")
    const search = searchParams.get("search")
    const page   = Math.max(1, Number(searchParams.get("page")  ?? 1))
    const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 25)))
    const from   = (page - 1) * limit
    const to     = from + limit - 1

    // Query students table (now separate from users)
    let query = adminClient
      .from("students")
      .select("*", { count: "exact" })

    if (institutionId) {
      query = query.eq("institution_id", institutionId)
    }

    if (search) {
      // Find matching user IDs
      const { data: matchedUsers } = await adminClient
        .from("users")
        .select("id")
        .eq("role", ROLES.STUDENT)
        .or(`name.ilike.%${search}%,email.ilike.%${search}%`)

      const studentUserIds = (matchedUsers ?? []).map((u) => u.id)

      if (studentUserIds.length > 0) {
        query = query.or(`id.in.(${studentUserIds.map(id => `"${id}"`).join(",")}),registration_number.ilike.%${search}%`)
      } else {
        query = query.ilike("registration_number", `%${search}%`)
      }
    }

    query = query.order("id", { ascending: true })

    const { data: students, error, count } = await query.range(from, to)

    if (error) {
      console.error("Students query error:", error)
      throw new Error(`Failed to fetch students: ${error.message}`)
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ students: [], totalCount: 0, page, limit })
    }

    const studentIds = students.map(s => s.id)
    const sectionIds = Array.from(new Set(students.map(s => s.section_id).filter(Boolean)))
    const programIds = Array.from(new Set(students.map(s => s.program_id).filter(Boolean)))

    const [usersRes, sectionsRes, programsRes] = await Promise.all([
      adminClient.from("users").select("id, name, email, role, is_active").in("id", studentIds),
      sectionIds.length
        ? adminClient.from("sections").select("id, name, semester, program_id").in("id", sectionIds)
        : Promise.resolve({ data: [] }),
      programIds.length
        ? adminClient.from("programs").select("id, name").in("id", programIds)
        : Promise.resolve({ data: [] }),
    ])

    const users = usersRes.data || []
    const sections = sectionsRes.data || []
    const programs = programsRes.data || []

    // Merge student + user + section + program data
    const data = students.map(student => {
      const user = users.find(u => u.id === student.id)
      const sec = sections.find(s => s.id === student.section_id)
      const prog = programs.find(p => p.id === (sec?.program_id || student.program_id))

      return {
        ...student,
        name: user?.name || "Unknown",
        email: user?.email || "",
        role: user?.role || "STUDENT",
        is_active: user?.is_active ?? true,
        section: sec
          ? {
              ...sec,
              program: prog ? { id: prog.id, name: prog.name } : null,
            }
          : null,
      }
    })

    return NextResponse.json({ students: data, totalCount: count ?? 0, page, limit })
  } catch (error) {
    console.error("Student fetch error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: errorMessage 
    }, { status: 500 })
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
    const {
      name,
      email,
      section_id,
      semester,
      program_id,
      institution_id,
      registration_number,
      admission_year,
      parentName,
      parentEmail,
      parentRelationship,
      parentPhone,
    } = body

    if (!name || !email || !institution_id) {
      return NextResponse.json({ error: "Missing required fields (name, email, institution_id)" }, { status: 400 })
    }

    if (institution_id !== profile.institution_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const origin = resolveAppOrigin(request.headers)
    await inviteUser({
      email,
      role: ROLES.STUDENT,
      institutionId: institution_id,
      organizationId: profile.organization_id || "",
      origin,
    })

    const { data: invitedUser, error: invitedUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (invitedUserError || !invitedUser) {
      throw new Error("Student invite was created but profile lookup failed")
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .update({
        name,
        role: ROLES.STUDENT,
        institution_id,
      })
      .eq("id", invitedUser.id)
      .select()
      .single()

    if (userError) throw userError

    // Create student record
    const { data: student, error } = await supabase
      .from("students")
      .upsert([
        {
          id: invitedUser.id,
          institution_id,
          program_id: program_id || null,
          section_id: section_id || null,
          semester: semester || 1,
          registration_number: registration_number || null,
          admission_year: admission_year ? Number(admission_year) : new Date().getFullYear(),
          dob: null,
          gender: null,
        },
      ], { onConflict: "id" })
      .select()
      .single()

    if (error) throw error

    // Create / Link parent if details provided
    if (parentEmail && parentName) {
      const adminClient = createSupabaseAdminClient()
      
      const { data: existingParent } = await adminClient
        .from("users")
        .select("id")
        .eq("email", parentEmail)
        .eq("role", ROLES.PARENT)
        .maybeSingle()

      let parentUserId = existingParent?.id

      if (!parentUserId) {
        let authData: any = null
        let authError: any = null
        
        try {
          const createRes = await adminClient.auth.admin.createUser({
            email: parentEmail,
            password: Math.random().toString(36).slice(-12),
            email_confirm: true,
          })
          authData = createRes.data
          authError = createRes.error
        } catch (err: any) {
          authError = err
        }

        if (authError) {
          if (authError.message?.toLowerCase().includes("already") || authError.status === 422) {
            const { data: userList } = await adminClient.auth.admin.listUsers()
            const existingAuthUser = userList?.users.find((u) => u.email?.toLowerCase() === parentEmail.toLowerCase())
            if (existingAuthUser) {
              parentUserId = existingAuthUser.id
            }
          }
        } else if (authData?.user) {
          parentUserId = authData.user.id
        }

        if (parentUserId) {
          const { data: profileCheck } = await adminClient
            .from("users")
            .select("id")
            .eq("id", parentUserId)
            .maybeSingle()

          if (!profileCheck) {
            await adminClient.from("users").insert({
              id: parentUserId,
              name: parentName,
              email: parentEmail,
              role: ROLES.PARENT,
              institution_id,
              organization_id: profile.organization_id || null,
              phone: parentPhone || null
            })
          }
        }
      }

      if (parentUserId) {
        const { data: existingRelation } = await adminClient
          .from("parent_student_relations")
          .select("id")
          .eq("parent_id", parentUserId)
          .eq("student_id", invitedUser.id)
          .maybeSingle()

        if (!existingRelation) {
          await adminClient.from("parent_student_relations").insert({
            parent_id: parentUserId,
            student_id: invitedUser.id,
            relationship: parentRelationship || "Guardian"
          })
        }
      }
    }

    return NextResponse.json({ ...userData, ...student })
  } catch (error: any) {
    console.error("Student creation error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}