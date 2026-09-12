import { NextResponse } from "next/server"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"

export async function GET() {
  try {
    const profile = await getCurrentDashboardSession()
    if (!profile) {
      return NextResponse.json({ features: [] }, { status: 401 })
    }

    if (!profile.organization_id) {
      // Super admins or users without org ID get all features
      return NextResponse.json({ features: profile.features })
    }

    return NextResponse.json(
      { features: profile.features },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=60" } }
    )
  } catch (err: unknown) {
    console.error("Org features API error:", err)
    return NextResponse.json({ features: [] })
  }
}
