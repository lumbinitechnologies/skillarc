import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"
import { ROLES } from "@/constants/roles"
import { canManageStudent, canReadStudentDocuments, getStudentAccessScope } from "@/lib/student-access"

const reviewRoles = new Set<string>([ROLES.INSTITUTION_ADMIN, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN])

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    const { id, documentId } = await params
    const actor = await getCurrentUserContext()
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const admin = createSupabaseAdminClient()
    const { data: student } = await admin.from("students").select("institution_id").eq("id", id).maybeSingle()
    const { data: document, error } = await admin.from("student_documents").select("*").eq("id", documentId).eq("student_id", id).maybeSingle()
    if (error) throw error
    if (!student || !document) return NextResponse.json({ error: "Document not found" }, { status: 404 })
    const scope = getStudentAccessScope(actor, id, student.institution_id)
    if (!scope || !canReadStudentDocuments(scope)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const expiresIn = 60 * 10
    const { data: signed, error: signedError } = await admin.storage.from(document.storage_bucket).createSignedUrl(document.storage_path, expiresIn)
    if (signedError) throw signedError
    return NextResponse.json({ url: signed.signedUrl, expires_in: expiresIn })
  } catch (error) {
    console.error("Student document download error:", error)
    return NextResponse.json({ error: "Unable to create download link" }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    const { id, documentId } = await params
    const actor = await getCurrentUserContext()
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!reviewRoles.has(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const admin = createSupabaseAdminClient()
    const { data: student } = await admin.from("students").select("institution_id").eq("id", id).maybeSingle()
    if (!student || !canManageStudent(actor, student.institution_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const body = await request.json()
    const allowedStatuses = ["PENDING", "APPROVED", "REJECTED", "EXPIRED", "ARCHIVED"]
    if (!allowedStatuses.includes(body.status)) return NextResponse.json({ error: "Invalid review status" }, { status: 400 })
    const update = { status: body.status, review_feedback: body.review_feedback ? String(body.review_feedback).slice(0, 2000) : null, reviewed_by: actor.id, reviewed_at: new Date().toISOString(), archived_at: body.status === "ARCHIVED" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }
    const { data, error } = await admin.from("student_documents").update(update).eq("id", documentId).eq("student_id", id).select().single()
    if (error) throw error
    await admin.from("audit_logs").insert({ user_id: actor.id, action: "STUDENT_DOCUMENT_REVIEWED", entity_type: "STUDENT", entity_id: id, metadata: { document_id: documentId, status: body.status, review_feedback: update.review_feedback } })
    return NextResponse.json({ document: data })
  } catch (error) {
    console.error("Student document review error:", error)
    return NextResponse.json({ error: "Document review failed" }, { status: 400 })
  }
}
