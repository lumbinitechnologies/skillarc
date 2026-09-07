import { NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/user-context"
import { createArcaBackendHeaders } from "@/lib/arca-backend"
import { z } from "zod"

const requestSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  session_id: z.string().max(128).nullable().optional(),
  top_k: z.number().int().min(1).max(8).optional(),
})

export async function POST(req: Request) {
  const user = await getCurrentUserContext()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "A valid question is required." }, { status: 400 })

  const backend = process.env.EDURAG_BACKEND_URL || "http://localhost:8000"
  const target = `${backend}/api/chat`

  try {
    const proxied = await fetch(target, {
      method: "POST",
      headers: createArcaBackendHeaders(user),
      body: JSON.stringify({
        question: parsed.data.question,
        session_id: parsed.data.session_id ?? null,
        top_k: parsed.data.top_k ?? 4,
      }),
      signal: req.signal,
    })

    const text = await proxied.text()

    const headers: Record<string, string> = {}
    const contentType = proxied.headers.get("content-type")
    if (contentType) headers["content-type"] = contentType
    headers["X-Arca-Deprecated"] = "true"
    return new Response(text, { status: proxied.status, headers })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 })
  }
}

export async function GET() {
  // simple health / sanity check for front-end
  return NextResponse.json({ status: "ok" })
}
