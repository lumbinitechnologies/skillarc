import { NextRequest, NextResponse } from "next/server"
import { runKnowledgeWorker } from "@/lib/knowledge/worker"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authorization = request.headers.get("authorization")
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : request.headers.get("x-cron-secret")
  return supplied === secret
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const result = await runKnowledgeWorker()
    return NextResponse.json({ status: "ok", ...result })
  } catch (error) {
    console.error("Knowledge worker error", error)
    return NextResponse.json({ error: "Knowledge worker failed" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
