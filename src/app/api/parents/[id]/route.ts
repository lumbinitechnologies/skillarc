import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = createSupabaseAdminClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (profile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone } = body

    const update: Record<string, string | null> = {}
    if (name !== undefined) update.name = name
    if (phone !== undefined) update.phone = phone || null

    const { data: parent, error } = await admin
      .from("users")
      .update(update)
      .eq("id", id)
      .eq("role", ROLES.PARENT)
      .eq("institution_id", profile.institution_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(parent)
  } catch (error) {
    console.error("Parent update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = createSupabaseAdminClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (profile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Verify this is actually a parent belonging to the admin's institution
    const { data: parentUser } = await admin
      .from("users")
      .select("id, role, institution_id")
      .eq("id", id)
      .eq("role", ROLES.PARENT)
      .eq("institution_id", profile.institution_id)
      .maybeSingle()

    if (!parentUser) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 })
    }

    // 1. Delete all parent-student relation rows
    await admin
      .from("parent_student_relations")
      .delete()
      .eq("parent_id", id)

    // 2. Delete the public.users profile row
    await admin
      .from("users")
      .delete()
      .eq("id", id)

    // 3. Delete the auth.users account (removes login access entirely)
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(id)
    if (authDeleteError) {
      // Log but don't fail — profile is already gone so they can't log in meaningfully
      console.warn("Auth user delete warning:", authDeleteError.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Parent delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
