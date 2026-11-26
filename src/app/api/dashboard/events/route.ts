import { getCurrentUserContext } from "@/lib/user-context"
import { loadEventsDashboardData } from "@/lib/dashboard-read-models"

export const dynamic = "force-dynamic"

export async function GET() {
  const context = await getCurrentUserContext()
  if (!context) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await loadEventsDashboardData(context)
    return Response.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    console.error("Events dashboard read error:", error)
    return Response.json({ error: "Failed to load events dashboard" }, { status: 500 })
  }
}
