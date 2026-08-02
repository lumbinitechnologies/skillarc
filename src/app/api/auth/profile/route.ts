import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUserContext } from "@/lib/user-context"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if the acting user is a timetable builder
    let isTimetableBuilder = false
    const { data: perm } = await supabase
      .from("permissions")
      .select("id")
      .eq("name", "timetable_builder")
      .maybeSingle()

    if (perm?.id) {
      const { data: userPerm } = await supabase
        .from("user_permissions")
        .select("id")
        .eq("user_id", context.id)
        .eq("permission_id", perm.id)
        .maybeSingle()

      if (userPerm?.id) {
        isTimetableBuilder = true
      }
    }

    return NextResponse.json({
      id: context.id,
      name: context.name,
      email: context.email,
      role: context.role,
      institution_id: context.institution_id,
      organization_id: context.organization_id,
      is_timetable_builder: isTimetableBuilder,
      is_impersonating: context.isImpersonating,
      original_role: context.originalProfile.role,
      original_name: context.originalProfile.name,
      is_super_admin: context.isSuperAdmin,
    })
  } catch (err: any) {
    console.error("Auth profile API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
