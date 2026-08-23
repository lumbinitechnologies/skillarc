import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { getCurrentUserContext } from "@/lib/user-context"

function featureResponse(features: string[], status = 200) {
  return NextResponse.json(
    { features },
    {
      status,
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=30",
      },
    },
  )
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const profile = await getCurrentUserContext()
    if (!profile) {
      return featureResponse([], 401)
    }

    if (!profile.organization_id) {
      // Super admins or users without org ID get all features
      return featureResponse([
          "plagiarism",
          "billing",
          "placements",
          "video_call",
          "ai_evaluation",
          "report_cards",
          "intake_cohorts",
          "interventions"
        ])
    }

    const { data: org, error } = await supabase
      .from("organizations")
      .select("features")
      .eq("id", profile.organization_id)
      .single()

    if (error) {
      console.error("Failed to query org features:", error.message)
      return featureResponse([])
    }

    return featureResponse(org?.features || [])
  } catch (err: any) {
    console.error("Org features API error:", err)
    return featureResponse([])
  }
}
