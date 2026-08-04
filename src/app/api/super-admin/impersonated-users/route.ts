import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"
import { ROLES } from "@/constants/roles"

export async function GET(req: NextRequest) {
  try {
    const context = await getCurrentUserContext()
    if (!context || !context.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (context.originalProfile.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const adminSupabase = createSupabaseAdminClient()
    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")
    const orgId = searchParams.get("organization_id")
    const instId = searchParams.get("institution_id")
    const search = searchParams.get("search")

    let query = adminSupabase.from("users").select("id, name, email")

    if (role) {
      query = query.eq("role", role)
    }
    if (orgId) {
      query = query.eq("organization_id", orgId)
    }
    if (instId) {
      query = query.eq("institution_id", instId)
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: users, error } = await query.order("name").limit(50)

    if (error) {
      console.error("Error querying users for impersonation switcher:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  } catch (err: any) {
    console.error("Impersonated users API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
