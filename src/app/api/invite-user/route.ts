import { errorMessage as readErrorMessage } from "@/lib/error-message"
import { inviteUser, resolveAppOrigin } from "@/lib/invite-user"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email, role, institutionId, organizationId } = await req.json()

    if (!email || !role || !institutionId || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: email, role, institutionId, organizationId" },
        { status: 400 }
      )
    }

    const origin = resolveAppOrigin(req.headers)
    const result = await inviteUser({
      email,
      role,
      institutionId,
      organizationId,
      origin,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("🔴 Unexpected error in /api/invite-user:", error)
    return NextResponse.json({ error: readErrorMessage(error) || "Internal server error" }, { status: 500 })
  }
}