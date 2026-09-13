import { NextResponse } from "next/server"

import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { KNOWLEDGE_MANAGE_ROLES } from "@/lib/knowledge/service"
import { getKnowledgeDocumentStatus } from "@/lib/knowledge/service"
import { getCurrentUserContext } from "@/lib/user-context"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const actor = await getCurrentUserContext()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!actor.organization_id || !actor.institution_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { documentId } = await params
  const result = await getKnowledgeDocumentStatus(
    createSupabaseAdminClient(),
    documentId,
    actor.organization_id,
    actor.institution_id,
    actor.id,
    KNOWLEDGE_MANAGE_ROLES.has(actor.role),
  )
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(result)
}
