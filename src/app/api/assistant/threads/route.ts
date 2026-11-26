import { NextResponse } from "next/server"

import { getCurrentUserContext } from "@/lib/user-context"
import { toAssistantPrincipal } from "@/lib/assistant/principal"
import { listAssistantThreads } from "@/lib/assistant/persistence"

export const dynamic = "force-dynamic"

export async function GET() {
  const profile = await getCurrentUserContext()
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const principal = toAssistantPrincipal(profile)
    const threads = await listAssistantThreads(principal)
    return NextResponse.json({ threads })
  } catch {
    return NextResponse.json({ error: "Assistant thread storage is unavailable." }, { status: 503 })
  }
}
