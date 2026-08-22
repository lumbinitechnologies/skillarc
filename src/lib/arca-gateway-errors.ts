import { NextResponse } from "next/server"

type UpstreamErrorBody = {
  code?: unknown
  error?: unknown
  detail?: unknown
}

function safeMessage(status: number, fallback: string): string {
  if (status === 401 || status === 403) return "Arca could not authorize this request. Please sign in again."
  if (status === 404) return "This Arca conversation is no longer available. Please start a new chat."
  if (status === 429) return "Arca is receiving too many requests right now. Please try again shortly."
  if (status >= 500) return fallback
  return "Arca could not process that request. Please try again."
}

export async function arcaGatewayErrorResponse(
  response: Response,
  fallback: string,
): Promise<NextResponse> {
  const raw = await response.text().catch(() => "")
  let body: UpstreamErrorBody = {}
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    if (parsed && typeof parsed === "object") body = parsed as UpstreamErrorBody
  } catch {
    // Upstream error bodies are intentionally not exposed verbatim.
  }

  const code = typeof body.code === "string" && body.code
    ? body.code
    : `ARCA_UPSTREAM_${response.status}`

  return NextResponse.json(
    { error: safeMessage(response.status, fallback), code },
    { status: response.status },
  )
}
