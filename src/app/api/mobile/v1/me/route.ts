import { MobileAuthError, requireMobilePrincipal } from "@/lib/mobile-auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const requestId = crypto.randomUUID()
  const headers = { "Cache-Control": "private, no-store", "X-Request-Id": requestId }

  try {
    const principal = await requireMobilePrincipal(request)
    return Response.json({ data: principal, request_id: requestId }, { headers })
  } catch (error) {
    const known = error instanceof MobileAuthError
      ? error
      : new MobileAuthError(503, "SERVICE_UNAVAILABLE", "Service is temporarily unavailable")
    if (!(error instanceof MobileAuthError)) {
      console.error("Mobile profile request failed", error)
    }
    return Response.json(
      { error: { code: known.code, message: known.message }, request_id: requestId },
      { status: known.status, headers },
    )
  }
}
