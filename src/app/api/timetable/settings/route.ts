import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

// GET TIMETABLE SETTINGS
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("institution_timetable_settings")
      .select("*")
      .eq("institution_id", profile.institution_id)
      .maybeSingle()

    if (error) throw error

    // If no settings exist, return default structure
    if (!data) {
      return NextResponse.json({
        institution_id: profile.institution_id,
        start_time: "08:45:00",
        end_time: "16:00:00",
        period_duration_minutes: 60,
        number_of_periods: 5,
        period_timings: [
          { id: "P1", label: "Period 1", time: "8:45 – 9:45" },
          { id: "P2", label: "Period 2", time: "9:45 – 10:45" },
          { id: "P3", label: "Period 3", time: "11:00 – 12:00" },
          { id: "P4", label: "Period 4", time: "12:00 – 1:00" },
          { id: "P5", label: "Period 5", time: "2:00 – 3:00" },
        ]
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Timetable settings fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST TIMETABLE SETTINGS (UPSERT)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (profile.role !== ROLES.INSTITUTION_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { start_time, end_time, period_duration_minutes, number_of_periods, period_timings } = body

    const { data, error } = await supabase
      .from("institution_timetable_settings")
      .upsert({
        institution_id: profile.institution_id,
        start_time,
        end_time,
        period_duration_minutes,
        number_of_periods,
        period_timings,
        updated_at: new Date().toISOString(),
      }, { onConflict: "institution_id" })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Timetable settings save error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
