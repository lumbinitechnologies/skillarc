import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify original role is SUPER_ADMIN
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [orgsRes, instsRes] = await Promise.all([
      supabase.from("organizations").select("id, name").order("name"),
      supabase.from("institutions").select("id, name, organization_id").order("name"),
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
