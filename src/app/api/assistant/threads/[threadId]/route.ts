import { NextResponse } from "next/server"

import { getCurrentUserContext } from "@/lib/user-context"
import { toAssistantPrincipal } from "@/lib/assistant/principal"
import { getAssistantThread } from "@/lib/assistant/persistence"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const profile = await getCurrentUserContext()
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) return NextResponse.json({ error: "Invalid conversation." }, { status: 400 })

  try {
    const principal = toAssistantPrincipal(profile)
    const messages = await getAssistantThread(principal, threadId)
    if (!messages) return NextResponse.json({ error: "Conversation not found." }, { status: 404 })
    return NextResponse.json({ messages })
  } catch {
    return NextResponse.json({ error: "Assistant thread storage is unavailable." }, { status: 503 })
  }
}
