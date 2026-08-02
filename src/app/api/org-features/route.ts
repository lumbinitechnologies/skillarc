import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ features: [] }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id) {
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
          "interventions"
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
