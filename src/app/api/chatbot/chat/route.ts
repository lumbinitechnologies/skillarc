import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/user-context"
import { createArcaBackendHeaders } from "@/lib/arca-backend"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { fetchAcademicContext } from "@/lib/academic-context"

const BACKEND_URL = process.env.EDURAG_BACKEND_URL || "http://localhost:8000"

const streamHeaders = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserContext()
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { question, session_id } = await request.json()
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    // 1. Build live Supabase context (academic details, attendance, grades,
    //    assignments, teaching load, announcements — all role-aware).
    const supabase = await createSupabaseServerClient()
    const dbContextText = await fetchAcademicContext(supabase, profile)
    const trimmedQuestion = question.trim()

    // 2. Query the RAG backend with clean boundaries.
    const response = await fetch(`${BACKEND_URL}/api/chat/ask/stream`, {
      method: "POST",
      headers: createArcaBackendHeaders(profile),
      body: JSON.stringify({
        question: trimmedQuestion,
        session_id: session_id || null,
        top_k: 4,
        database_context: dbContextText,
      }),
      signal: request.signal,
      cache: "no-store",
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      console.error("FastAPI streaming backend error", response.status)
      return NextResponse.json(
        { error: errText || "The assistant service could not answer this request." },
        { status: response.status },
      )
    }

    if (!response.body) {
      return NextResponse.json({ error: "The assistant returned an empty stream." }, { status: 502 })
    }

    return new Response(response.body, { status: 200, headers: streamHeaders })
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return new Response(null, { status: 499 })
    }
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("Chatbot API route error:", message)
    return NextResponse.json({ error: "Unable to reach the assistant service." }, { status: 502 })
  }
}

/** Restore only through the authenticated backend ownership check. */
export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserContext()
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sessionId = request.nextUrl.searchParams.get("session_id")
    if (!sessionId || !/^[0-9a-f-]{16,}$/i.test(sessionId)) {
      return NextResponse.json({ error: "A valid session_id is required" }, { status: 400 })
    }

    const response = await fetch(
      `${BACKEND_URL}/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
      { headers: createArcaBackendHeaders(profile), cache: "no-store" },
    )
    const body = await response.text()
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    })
  } catch (error: unknown) {
    console.error("Chat session restore error", error instanceof Error ? error.message : "unknown error")
    return NextResponse.json({ error: "Unable to restore this conversation." }, { status: 502 })
  }
}
