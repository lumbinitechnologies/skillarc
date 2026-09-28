import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

// POST - Create Program
export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserContext()
    if (!profile) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (
      profile.role !==
      ROLES.INSTITUTION_ADMIN
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const body = await request.json()

    const {
      name,
      department_id,
      institution_id,
      organization_id,
    } = body

    if (!name?.trim()) {
      return NextResponse.json(
        {
          error: "Program name is required.",
        },
        { status: 400 }
      )
    }

    const targetInstitutionId = institution_id || profile.institution_id
    const targetOrgId = organization_id || profile.organization_id

    if (!targetInstitutionId) {
      return NextResponse.json(
        {
          error: "Institution ID is required.",
        },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    const { data, error } =
      await supabase
        .from("programs")
        .insert([
          {
            name: name.trim(),
            department_id: department_id || null,
            institution_id: targetInstitutionId,
            organization_id: targetOrgId,
          },
        ])
        .select(`
          *,
          department:department_id(
            id,
            name
          )
        `)
        .single()

    if (error) {
      console.error("Program creation error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create program" },
        { status: 400 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(
      "Program creation unexpected error:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}

// GET - Fetch Programs
export async function GET(
  request: NextRequest
) {
  try {
    const supabase =
      await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const institutionId =
      request.nextUrl.searchParams.get(
        "institution_id"
      )
    const departmentId =
      request.nextUrl.searchParams.get(
        "department_id"
      )

    let query = supabase
      .from("programs")
      .select(`
        *,
        department:department_id(
          id,
          name
        )
      `)

    if (institutionId) {
      query = query.eq(
        "institution_id",
        institutionId
      )
    }

    if (departmentId) {
      query = query.eq(
        "department_id",
        departmentId
      )
    }

    const { data, error } =
      await query.order("name")

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error(
      "Programs fetch error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      { status: 500 }
    )
  }
}