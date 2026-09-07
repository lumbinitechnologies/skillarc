// Compatibility adapter for the legacy placement/interview callers.
// New assistant UX uses /api/assistant/chat; this route remains until callers
// have moved to the typed task client.

import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserContext } from "@/lib/user-context"
import { assistantTaskSchema, runAssistantTask } from "@/lib/assistant/tasks"
import { rateLimit } from "@/lib/assistant/rate-limit"

const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(16000),
  task: assistantTaskSchema.optional(),
})

export async function POST(req: Request) {
  const profile = await getCurrentUserContext()
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "A valid prompt is required." }, { status: 400 })

  const limit = await rateLimit(`task:${profile.id}:${parsed.data.task ?? "placement_analytics"}`)
  if (!limit.allowed) return NextResponse.json({ error: "Too many AI requests. Please try again shortly." }, { status: 429 })

  try {
    // Legacy callers do not send a task yet. Text mode preserves their response
    // shape while eliminating provider-specific REST calls and fabricated data.
    const result = await runAssistantTask(parsed.data.task ?? "placement_analytics", parsed.data.prompt)
    return NextResponse.json(
      { text: result.text, task: result.task, data: result.data },
      { headers: { "X-Arca-Deprecated": "true" } },
    )
  } catch (error) {
    console.error("[ai/chat] typed task failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "The AI task service is unavailable." }, { status: 503 })
  }
}
