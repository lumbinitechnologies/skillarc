import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  // Step 4 — Authorization
  const profile = await getCurrentUserContext()
  if (!profile) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  if (profile.role !== ROLES.INSTITUTION_ADMIN) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    )
  }

  // Step 5 — Read and validate the request
  const body = await request.json()

  const {
    facultyId,
    subjectIds: rawSubjectIds,
  } = body

  if (
    !facultyId ||
    !Array.isArray(rawSubjectIds)
  ) {
    return NextResponse.json(
      {
        error: "Invalid request",
      },
      {
        status: 400,
      }
    )
  }

  const subjectIds = Array.from(new Set(rawSubjectIds))

  // Step 6 — Verify the faculty belongs to the same institution using Admin Client
  const adminClient = createSupabaseAdminClient()

  const { data: faculty } = await adminClient
    .from("users")
    .select("institution_id")
    .eq("id", facultyId)
    .single()

  if (!faculty) {
    return NextResponse.json(
      { error: "Faculty not found" },
      { status: 404 }
    )
  }

  if (faculty.institution_id !== profile.institution_id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    )
  }

  // Step 7 — Verify every subject belongs to the same institution using Admin Client
  const { data: subjects } = await adminClient
    .from("subjects")
    .select("id")
    .eq("institution_id", profile.institution_id)
    .in("id", subjectIds)

  if ((subjects ?? []).length !== subjectIds.length) {
    return NextResponse.json(
      {
        error: "One or more subjects are invalid",
      },
      {
        status: 400,
      }
    )
  }

  // Step 8 — Replace assignments in the database using Admin Client

  // Delete existing assignments (delete all for this faculty directly)
  const { error: deleteError } = await adminClient
    .from("faculty_subjects")
    .delete()
    .eq("faculty_id", facultyId)

  if (deleteError) {
    console.error("🔴 Delete faculty_subjects error:", deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  // Insert new assignments
  if (subjectIds.length > 0) {
    const rows = subjectIds.map((subjectId: string) => ({
      institution_id: profile.institution_id,
      faculty_id: facultyId,
      subject_id: subjectId,
    }))

    const { error: insertError } = await adminClient
      .from("faculty_subjects")
      .insert(rows)

    if (insertError) {
      console.error("🔴 Insert faculty_subjects error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }
  }

  return NextResponse.json({
    success: true,
  })
}