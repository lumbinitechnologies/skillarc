import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUserContext } from "@/lib/user-context"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const profile = await getCurrentUserContext()
    if (!profile) {
      return NextResponse.json({ features: [] }, { status: 401 })
    }

    if (!profile.organization_id) {
      // Super admins or users without org ID get all features
      return NextResponse.json({
        features: [
          "plagiarism",
          "billing",
          "placements",
          "video_call",
          "ai_evaluation",
          "report_cards",
          "intake_cohorts",
          "interventions",
          "multi_week_timetable",
          "admissions_workflow",
          "direct_onboarding"
        ]
      })
    }

    const { data: org, error } = await supabase
      .from("organizations")
      .select("features")
      .eq("id", profile.organization_id)
      .single()

    if (error) {
      console.error("Failed to query org features:", error.message)
      return NextResponse.json({ features: [] })
    }

    return NextResponse.json({ features: org?.features || [] })
  } catch (err: any) {
    console.error("Org features API error:", err)
    return NextResponse.json({ features: [] })
  }
}
