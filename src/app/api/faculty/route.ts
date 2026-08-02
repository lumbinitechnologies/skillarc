import { createSupabaseServerClient } from "@/lib/supabase-server"
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
    const { name, email, department_id, institution_id } = body

    if (!name || !email || !institution_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (institution_id !== profile.institution_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Steps 1 & 2: createUser() block removed.
    const origin = resolveAppOrigin(request.headers)
    await inviteUser({
      email,
      role: ROLES.FACULTY,
      institutionId: institution_id,
      organizationId: profile.organization_id || "",
      origin,
    })

    // Patch in the extra faculty fields (name, department) that invite-user doesn't set
    const { data: faculty, error } = await supabase
      .from("users")
      .update({
        name,
        department_id: department_id || null,
      })
      .eq("email", email)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(faculty)
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

    const query = supabase
      .from("users")
      .select("*")
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])

    if (institutionId) query.eq("institution_id", institutionId)

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

    const mapped = (data || []).map((u) => ({
      ...u,
      is_timetable_builder: builderUserIds.has(u.id),
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error("Faculty fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}