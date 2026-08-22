import { createArcaPublicBackendHeaders } from "@/lib/arca-backend"
import { arcaGatewayErrorResponse } from "@/lib/arca-gateway-errors"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.EDURAG_BACKEND_URL || "http://localhost:8000"
const MAX_QUESTION_LENGTH = 4000
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

const streamHeaders = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
}

const rateWindows = new Map<string, { resetAt: number; count: number }>()

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  return (forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown").slice(0, 128)
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const current = rateWindows.get(key)
  if (!current || current.resetAt <= now) {
    rateWindows.set(key, { resetAt: now + RATE_WINDOW_MS, count: 1 })
    return false
  }
  if (current.count >= RATE_LIMIT) return true
  current.count += 1
  return false
}

export async function POST(request: NextRequest) {
  try {
    const key = clientKey(request)
    if (isRateLimited(key)) {
      return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 })
    }

    const body = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A question is required" }, { status: 400 })
    }
    const keys = Object.keys(body)
    if (keys.some((key) => key !== "question") || typeof body.question !== "string") {
      return NextResponse.json({ error: "Only question is accepted" }, { status: 400 })
    }
    const question = body.question.trim()
    if (!question || question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json({ error: "Question must be between 1 and 4000 characters" }, { status: 400 })
    }

    const headers = createArcaPublicBackendHeaders()
    headers["X-Arca-Client-IP"] = key
    const response = await fetch(`${BACKEND_URL}/api/public-chat/ask/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ question }),
      signal: request.signal,
      cache: "no-store",
    })

    if (!response.ok) {
      return arcaGatewayErrorResponse(response, "The public assistant is temporarily unavailable. Please try again shortly.")
    }
    if (!response.body) {
      return NextResponse.json({ error: "The assistant returned an empty stream." }, { status: 502 })
    }

    return new Response(response.body, { status: 200, headers: streamHeaders })
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return new Response(null, { status: 499 })
    }
    console.error("Public chatbot API route error:", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Unable to reach the public assistant service." }, { status: 502 })
  }
}
