import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"
import { ROLES } from "@/constants/roles"

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const { role, organization_id, institution_id, user_id, clear } = body

    const cookieStore = await cookies()

    if (clear) {
      cookieStore.delete("sa_impersonate_role")
      cookieStore.delete("sa_impersonate_org_id")
      cookieStore.delete("sa_impersonate_inst_id")
      cookieStore.delete("sa_impersonate_user_id")
    } else {
      if (!role) {
        return NextResponse.json({ error: "Role is required" }, { status: 400 })
      }
      
      cookieStore.set("sa_impersonate_role", role, { path: "/" })
      
      if (organization_id) {
        cookieStore.set("sa_impersonate_org_id", organization_id, { path: "/" })
      } else {
        cookieStore.delete("sa_impersonate_org_id")
      }

      if (institution_id) {
        cookieStore.set("sa_impersonate_inst_id", institution_id, { path: "/" })
      } else {
        cookieStore.delete("sa_impersonate_inst_id")
      }

      if (user_id) {
        cookieStore.set("sa_impersonate_user_id", user_id, { path: "/" })
      } else {
        cookieStore.delete("sa_impersonate_user_id")
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Impersonate API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
