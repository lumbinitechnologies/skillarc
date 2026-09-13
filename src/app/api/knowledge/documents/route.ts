import { NextRequest, NextResponse } from "next/server"

import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"
import {
  KNOWLEDGE_MANAGE_ROLES,
  enqueueUploadedKnowledgeDocument,
  parseAllowedRoles,
} from "@/lib/knowledge/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const actor = await getCurrentUserContext()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!KNOWLEDGE_MANAGE_ROLES.has(actor.role) || !actor.organization_id || !actor.institution_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "A document file is required" }, { status: 400 })

    const visibilityValue = String(form.get("visibility") ?? "institution")
    if (!["private", "department", "institution", "organization"].includes(visibilityValue)) {
      return NextResponse.json({ error: "Invalid visibility" }, { status: 400 })
    }
    const scope = {
      organizationId: actor.organization_id,
      institutionId: actor.institution_id,
      ownerId: actor.id,
      departmentId: optionalUuid(form.get("department_id")),
      subjectId: optionalUuid(form.get("subject_id")),
      sectionId: optionalUuid(form.get("section_id")),
      visibility: visibilityValue as "private" | "department" | "institution" | "organization",
      allowedRoles: parseAllowedRoles(form.get("allowed_roles")),
    }
    const result = await enqueueUploadedKnowledgeDocument(createSupabaseAdminClient(), file, scope)
    return NextResponse.json({ ...result, status: "queued" }, { status: 202 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to queue the document"
    const status = /unsupported|invalid|required|limit|accepted|MIME|visibility/i.test(message) ? 400 : 500
    console.error("Knowledge document upload failed:", message)
    return NextResponse.json({ error: status === 500 ? "Unable to queue the document" : message }, { status })
  }
}

function optionalUuid(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error("Scope IDs must be UUIDs")
  return value
}
