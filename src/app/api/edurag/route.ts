import { NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/user-context"

export async function POST(req: Request) {
  const user = await getCurrentUserContext()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  const backend = process.env.EDURAG_BACKEND_URL || "http://localhost:8000"
  const target = `${backend}/api/chat`

  try {
    const proxied = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, user: { id: user.id, role: user.role, organization_id: user.organization_id, institution_id: user.institution_id, name: user.name, email: user.email } }),
    })

    const text = await proxied.text()

    const headers: Record<string, string> = {}
    const contentType = proxied.headers.get("content-type")
    if (contentType) headers["content-type"] = contentType

    return new Response(text, { status: proxied.status, headers })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 502 })
  }
}

export async function GET() {
  // simple health / sanity check for front-end
  return NextResponse.json({ status: "ok" })
}
