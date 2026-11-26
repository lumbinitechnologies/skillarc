import { NextResponse } from "next/server"

import { getCurrentUserContext } from "@/lib/user-context"
import { toAssistantPrincipal } from "@/lib/assistant/principal"
import { createOrVerifyThread } from "@/lib/assistant/persistence"

export async function POST() {
  const profile = await getCurrentUserContext()
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const principal = toAssistantPrincipal(profile)
    const { threadId } = await createOrVerifyThread(principal)
    return NextResponse.json({ threadId })
  } catch {
    return NextResponse.json({ error: "Assistant thread storage is unavailable." }, { status: 503 })
  }
}
