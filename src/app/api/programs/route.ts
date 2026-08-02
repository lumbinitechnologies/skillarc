import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

// POST - Create Program
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

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

    if (
      !name ||
      !department_id ||
      !institution_id
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields",
        },
        { status: 400 }
      )
    }

    const { data, error } =
      await supabase
        .from("programs")
        .insert([
          {
            name,
            department_id,
            institution_id,
            organization_id,
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

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error(
      "Program creation error:",
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