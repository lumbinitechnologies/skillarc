import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { inviteUser, resolveAppOrigin } from "@/lib/invite-user"
import { getCurrentUserContext } from "@/lib/user-context"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (profile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, department_id, institution_id, phone, employee_id } = body

    if (!name || !email || !institution_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (institution_id !== profile.institution_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Steps 1 & 2: createUser() block removed.
    const origin = resolveAppOrigin(request.headers)
    const adminSupabase = createSupabaseAdminClient()
    await inviteUser({
      email,
      name,
      role: ROLES.FACULTY,
      institutionId: institution_id,
      organizationId: profile.organization_id || "",
      origin,
    })

    // Patch in the extra faculty fields (name, department, phone) that invite-user doesn't set
    const { data: faculty, error } = await adminSupabase
      .from("users")
      .update({
        name,
        department_id: department_id || null,
        phone: phone || null,
      })
      .eq("email", email)
      .select()
      .single()

    if (error) throw error

    // Save employee_id to staff table if provided
    if (employee_id && faculty?.id) {
      await adminSupabase.from("staff").upsert({
        id: faculty.id,
        institution_id,
        employee_id: String(employee_id).trim(),
      }, { onConflict: "id" })
    }

    return NextResponse.json({
      ...faculty,
      employee_id: employee_id ? String(employee_id).trim() : null,
    })
  } catch (error: any) {
    console.error("Faculty creation error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
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
    const departmentId = request.nextUrl.searchParams.get("department_id")

    const query = supabase
      .from("users")
      .select(`
        *,
        department:department_id(
          id,
          name
        )
      `)
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])

    if (institutionId) query.eq("institution_id", institutionId)
    if (departmentId) query.eq("department_id", departmentId)

    const { data = [], error } = await query.order("name")

    if (error) throw error

    // Load timetable builder permissions
    let { data: perm } = await supabase
      .from("permissions")
      .select("id")
      .eq("name", "timetable_builder")
      .maybeSingle()

    const { data: userPerms = [] } = perm
      ? await supabase
          .from("user_permissions")
          .select("user_id")
          .eq("permission_id", perm.id)
      : { data: [] }

    const builderUserIds = new Set((userPerms || []).map(up => up.user_id))

    // Fetch employee IDs from staff table
    const facultyIds = (data || []).map((u) => u.id)
    const adminSupabase = createSupabaseAdminClient()
    const { data: staffRecords = [] } = facultyIds.length
      ? await adminSupabase
          .from("staff")
          .select("id, employee_id")
          .in("id", facultyIds)
      : { data: [] }

    const staffMap = new Map((staffRecords || []).map((s: any) => [s.id, s.employee_id]))

    const mapped = (data || []).map((u) => ({
      ...u,
      is_timetable_builder: builderUserIds.has(u.id),
      employee_id: staffMap.get(u.id) ?? null,
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error("Faculty fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}