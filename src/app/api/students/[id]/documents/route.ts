import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext } from "@/lib/user-context"
import { STUDENT_DOCUMENT_CATEGORIES } from "@/modules/students/types/document.types"
import { canManageStudent, canReadStudentDocuments, getStudentAccessScope } from "@/lib/student-access"

const bucket = "student-documents"
const maxBytes = 20 * 1024 * 1024
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/heic", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"])
async function authorize(studentId: string, write = false) {
  const actor = await getCurrentUserContext()
  if (!actor) return { error: "Unauthorized", status: 401 as const }
  const admin = createSupabaseAdminClient()
  const { data: student, error } = await admin.from("students").select("id, institution_id").eq("id", studentId).maybeSingle()
  if (error) throw error
  if (!student) return { error: "Student not found", status: 404 as const }
  const scope = getStudentAccessScope(actor, studentId, student.institution_id)
  if (!scope || (write ? !canManageStudent(actor, student.institution_id) : !canReadStudentDocuments(scope))) return { error: "Forbidden", status: 403 as const }
  return { actor, student, admin, scope }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await authorize(id)
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { data, error } = await auth.admin.from("student_documents").select("*").eq("student_id", id).order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json({ documents: data ?? [] })
  } catch (error) {
    console.error("Student documents fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await authorize(id, true)
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const form = await request.formData()
    const file = form.get("file")
    const category = String(form.get("category") ?? "")
    const title = String(form.get("title") ?? "").trim()
    const applicationId = String(form.get("application_id") ?? "").trim() || null
    const applicationDocumentId = String(form.get("application_document_id") ?? "").trim() || null
    if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "A file is required" }, { status: 400 })
    if (file.size > maxBytes) return NextResponse.json({ error: "File exceeds the 20 MB limit" }, { status: 413 })
    if (!allowedMimeTypes.has(file.type)) return NextResponse.json({ error: "Only PDF, image, and Word document files are accepted" }, { status: 415 })
    if (!STUDENT_DOCUMENT_CATEGORIES.includes(category as (typeof STUDENT_DOCUMENT_CATEGORIES)[number])) return NextResponse.json({ error: "Invalid document category" }, { status: 400 })
    if (!title || title.length > 160) return NextResponse.json({ error: "A title between 1 and 160 characters is required" }, { status: 400 })
    if (applicationId) {
      const { data: application } = await auth.admin.from("admissions_applications").select("id").eq("id", applicationId).eq("institution_id", auth.student.institution_id).eq("student_id", id).maybeSingle()
      if (!application) return NextResponse.json({ error: "Invalid application relation" }, { status: 400 })
    }
    if (applicationDocumentId) {
      const { data: source } = await auth.admin.from("admission_documents").select("id,application_id,student_id").eq("id", applicationDocumentId).maybeSingle()
      if (!source || source.student_id !== id || (applicationId && source.application_id !== applicationId)) return NextResponse.json({ error: "Invalid application document relation" }, { status: 400 })
      if (!applicationId) {
        const { data: sourceApplication } = await auth.admin.from("admissions_applications").select("id").eq("id", source.application_id).eq("institution_id", auth.student.institution_id).eq("student_id", id).maybeSingle()
        if (!sourceApplication) return NextResponse.json({ error: "Invalid application relation" }, { status: 400 })
      }
    }

    const { data: latest, error: latestError } = await auth.admin.from("student_documents").select("version").eq("student_id", id).eq("category", category).eq("title", title).order("version", { ascending: false }).limit(1).maybeSingle()
    if (latestError) throw latestError
    const version = (latest?.version ?? 0) + 1
    const originalFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "document"
    const path = `${auth.student.institution_id}/${id}/${category.toLowerCase()}/${crypto.randomUUID()}-${originalFilename}`
    const bytes = Buffer.from(await file.arrayBuffer())
    const checksum = createHash("sha256").update(bytes).digest("hex")
    const upload = await auth.admin.storage.from(bucket).upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false })
    if (upload.error) throw upload.error

    const { data, error } = await auth.admin.from("student_documents").insert({ student_id: id, institution_id: auth.student.institution_id, application_id: applicationId, application_document_id: applicationDocumentId, category, title, storage_bucket: bucket, storage_path: path, original_filename: file.name, mime_type: file.type || "application/octet-stream", size_bytes: file.size, checksum_sha256: checksum, version, status: "PENDING", uploaded_by: auth.actor.id }).select().single()
    if (error) {
      await auth.admin.storage.from(bucket).remove([path])
      throw error
    }
    const { data: previous } = await auth.admin.from("student_documents").select("id").eq("student_id", id).eq("category", category).eq("title", title).neq("id", data.id).in("status", ["PENDING", "APPROVED"]).order("version", { ascending: false }).limit(1).maybeSingle()
    if (previous) {
      const { error: supersedeError } = await auth.admin.from("student_documents").update({ status: "ARCHIVED", superseded_at: new Date().toISOString(), superseded_by: data.id, archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", previous.id)
      if (supersedeError) throw supersedeError
    }
    await auth.admin.from("audit_logs").insert({ user_id: auth.actor.id, action: "STUDENT_DOCUMENT_UPLOADED", entity_type: "STUDENT", entity_id: id, metadata: { document_id: data.id, category, version, filename: file.name, size_bytes: file.size } })
    return NextResponse.json({ document: data }, { status: 201 })
  } catch (error) {
    console.error("Student document upload error:", error)
    return NextResponse.json({ error: "Document upload failed" }, { status: 400 })
  }
}
