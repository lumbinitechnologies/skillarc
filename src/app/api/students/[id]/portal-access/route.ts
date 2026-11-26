import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/user-context"
import { resolveAppOrigin } from "@/lib/invite-user"
import { getStudentPortalAccess, inviteStudentPortalAccess, setStudentPortalDeactivated } from "@/lib/portal-access"

type Context = { params: Promise<{ id: string }> }

async function adminContext() {
  const actor = await getCurrentUserContext()
  if (!actor?.institution_id || !["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN"].includes(actor.role)) return null
  return actor
}

export async function GET(_request: NextRequest, { params }: Context) {
  const actor = await adminContext()
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  try { return NextResponse.json({ access: await getStudentPortalAccess(id, actor.institution_id!) }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load portal access" }, { status: 400 }) }
}

export async function POST(request: NextRequest, { params }: Context) {
  const actor = await adminContext()
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  const body = await request.json().catch(() => ({})) as { action?: string }
  try {
    if (body.action === "deactivate") return NextResponse.json({ access: await setStudentPortalDeactivated(id, actor) })
    if (body.action === "invite" || body.action === "resend") return NextResponse.json({ access: await inviteStudentPortalAccess({ studentId: id, actor, origin: resolveAppOrigin(request.headers) }) })
    return NextResponse.json({ error: "action must be invite, resend, or deactivate" }, { status: 400 })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Portal access action failed" }, { status: 400 }) }
}
