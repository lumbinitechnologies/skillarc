import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/user-context"

export async function GET(req: NextRequest) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      id: context.id,
      name: context.name,
      email: context.email,
      role: context.role,
      institution_id: context.institution_id,
      organization_id: context.organization_id,
      is_timetable_builder: context.is_timetable_builder,
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
