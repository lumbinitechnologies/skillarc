import { createHash } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

export const KNOWLEDGE_BUCKET = "knowledge-documents"
export const KNOWLEDGE_MAX_FILE_BYTES = 50 * 1024 * 1024
export const KNOWLEDGE_ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt"])
export const KNOWLEDGE_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
])
const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
}

export const KNOWLEDGE_MANAGE_ROLES = new Set([
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "INSTITUTION_ADMIN",
  "HOD",
  "PROGRAM_HEAD",
  "FACULTY",
])

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

export function safeExtension(filename: string): string | null {
  const extension = filename.split(".").pop()?.toLowerCase() ?? ""
  return KNOWLEDGE_ALLOWED_EXTENSIONS.has(extension) ? extension : null
}

export function safeFilename(filename: string): string {
  const base = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 120)
  return base || "document"
}

export function parseAllowedRoles(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || !value.trim()) return []
  let roles: unknown
  try {
    roles = JSON.parse(value)
  } catch {
    roles = value.split(",").map((role) => role.trim()).filter(Boolean)
  }
  if (!Array.isArray(roles) || roles.some((role) => typeof role !== "string")) {
    throw new Error("allowed_roles must be a JSON array or comma-separated role list")
  }
  const normalized = [...new Set(roles.map((role) => role.trim().toUpperCase()).filter(Boolean))]
  const allowed = new Set(["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN", "HOD", "PROGRAM_HEAD", "FACULTY", "STUDENT", "PARENT"])
  if (normalized.some((role) => !allowed.has(role))) throw new Error("allowed_roles contains an unsupported role")
  return normalized.sort()
}

export type KnowledgeUploadScope = {
  organizationId: string
  institutionId: string
  ownerId: string
  departmentId: string | null
  subjectId: string | null
  sectionId: string | null
  visibility: "private" | "department" | "institution" | "organization"
  allowedRoles: string[]
}

async function validateScope(
  admin: SupabaseClient,
  scope: KnowledgeUploadScope,
): Promise<void> {
  if (scope.visibility === "department" && !scope.departmentId) throw new Error("department_id is required for department visibility")

  if (scope.departmentId) {
    const { data } = await admin.from("departments").select("id").eq("id", scope.departmentId).eq("institution_id", scope.institutionId).maybeSingle()
    if (!data) throw new Error("department_id is outside the current institution")
  }
  if (scope.subjectId) {
    const { data } = await admin.from("subjects").select("id").eq("id", scope.subjectId).eq("institution_id", scope.institutionId).maybeSingle()
    if (!data) throw new Error("subject_id is outside the current institution")
  }
  if (scope.sectionId) {
    const { data } = await admin.from("sections").select("id").eq("id", scope.sectionId).eq("institution_id", scope.institutionId).maybeSingle()
    if (!data) throw new Error("section_id is outside the current institution")
  }
}

export async function enqueueUploadedKnowledgeDocument(
  admin: SupabaseClient,
  file: File,
  scope: KnowledgeUploadScope,
): Promise<{ documentId: string; jobId: string }> {
  if (!file.size) throw new Error("No document file was provided")
  if (file.size > KNOWLEDGE_MAX_FILE_BYTES) throw new Error("File exceeds the 50 MB size limit")
  const extension = safeExtension(file.name)
  if (!extension) throw new Error("Only PDF, DOCX, and TXT files are accepted")
  if (file.type && !KNOWLEDGE_ALLOWED_MIME_TYPES.has(file.type)) throw new Error("Unsupported document MIME type")
  await validateScope(admin, scope)

  const documentId = crypto.randomUUID()
  const storagePath = `${scope.organizationId}/${scope.institutionId}/${documentId}.${extension}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const contentHash = sha256(bytes)

  const { error: uploadError } = await admin.storage.from(KNOWLEDGE_BUCKET).upload(storagePath, bytes, {
    contentType: file.type || MIME_TYPE_BY_EXTENSION[extension],
    upsert: false,
  })
  if (uploadError) throw new Error("Failed to store the knowledge document")

  const { error: documentError } = await admin.from("knowledge_documents").insert({
    id: documentId,
    organization_id: scope.organizationId,
    institution_id: scope.institutionId,
    department_id: scope.departmentId,
    subject_id: scope.subjectId,
    section_id: scope.sectionId,
    owner_id: scope.ownerId,
    title: safeFilename(file.name),
    original_filename: file.name.slice(0, 255),
    storage_bucket: KNOWLEDGE_BUCKET,
    storage_path: storagePath,
    visibility: scope.visibility,
    allowed_roles: scope.allowedRoles,
    document_version: 1,
    source_type: "upload",
    source_id: documentId,
    content_hash: contentHash,
    mime_type: file.type || null,
    status: "pending",
  })
  if (documentError) {
    await admin.storage.from(KNOWLEDGE_BUCKET).remove([storagePath])
    throw new Error("Failed to register the knowledge document")
  }

  const { data: job, error: jobError } = await admin.from("knowledge_ingestion_jobs").insert({
    document_id: documentId,
    requested_by: scope.ownerId,
    status: "queued",
    attempts: 0,
    max_attempts: 5,
    available_at: new Date().toISOString(),
  }).select("id").single()
  if (jobError || !job) {
    await admin.from("knowledge_documents").delete().eq("id", documentId)
    await admin.storage.from(KNOWLEDGE_BUCKET).remove([storagePath])
    throw new Error("Failed to queue the knowledge document")
  }

  return { documentId, jobId: job.id }
}

export async function getKnowledgeDocumentStatus(
  admin: SupabaseClient,
  documentId: string,
  organizationId: string,
  institutionId: string,
  userId: string,
  canManage: boolean,
) {
  const { data: document } = await admin
    .from("knowledge_documents")
    .select("id, title, status, failure_reason, document_version, created_at, updated_at, owner_id, organization_id, institution_id")
    .eq("id", documentId)
    .eq("organization_id", organizationId)
    .eq("institution_id", institutionId)
    .maybeSingle()
  if (!document || (!canManage && document.owner_id !== userId)) return null

  const { data: job } = await admin
    .from("knowledge_ingestion_jobs")
    .select("id, status, attempts, max_attempts, available_at, locked_at, lease_expires_at, started_at, completed_at, error_message, updated_at")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return { document, job: job ?? null }
}
