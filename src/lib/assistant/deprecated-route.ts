import { NextResponse } from "next/server"

export function deprecatedAssistantRoute(replacement = "/api/assistant/chat"): NextResponse {
  return NextResponse.json(
    {
      error: "This assistant endpoint has been retired.",
      replacement,
    },
    {
      status: 410,
      headers: {
        Deprecation: "true",
        "X-Arca-Deprecated": "true",
        "Cache-Control": "no-store",
      },
    },
  )
}
