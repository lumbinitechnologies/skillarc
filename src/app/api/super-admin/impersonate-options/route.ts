import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
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
    const [orgsRes, instsRes] = await Promise.all([
      adminSupabase.from("organizations").select("id, name").order("name"),
      adminSupabase.from("institutions").select("id, name, organization_id").order("name"),
    ])

    return NextResponse.json({
      organizations: orgsRes.data || [],
      institutions: instsRes.data || [],
    })
  } catch (err: any) {
    console.error("Impersonate options API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
