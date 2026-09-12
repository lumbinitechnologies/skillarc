import type { SupabaseClient } from "@supabase/supabase-js"

import { sha256 } from "@/lib/knowledge/service"

const INDEXED_TYPES = new Set(["Material", "material", "Syllabus", "syllabus"])
const ASSIGNMENT_ROLES = ["SUPER_ADMIN", "ORG_ADMIN", "INSTITUTION_ADMIN", "HOD", "PROGRAM_HEAD", "FACULTY", "STUDENT", "PARENT"]

type AssignmentRow = {
  id: string
  subject_id: string | null
  faculty_id: string | null
  title: string
  description: string | null
  type: string | null
  section_ids: string[] | null
}

export async function syncAssignmentKnowledge(admin: SupabaseClient, assignmentId: string): Promise<void> {
  const { data: assignment, error: assignmentError } = await admin
    .from("assignments")
    .select("id, subject_id, faculty_id, title, description, type, section_ids")
    .eq("id", assignmentId)
    .maybeSingle() as { data: AssignmentRow | null; error: unknown }
  if (assignmentError) throw assignmentError
  if (!assignment) return

  if (!INDEXED_TYPES.has(assignment.type ?? "")) {
    await archiveAssignmentKnowledge(admin, assignment.id)
    return
  }
  if (!assignment.subject_id || !assignment.faculty_id) throw new Error("Indexed assignment has no subject or faculty")

  const [{ data: subject }, { data: faculty }] = await Promise.all([
    admin.from("subjects").select("id, institution_id, department_id").eq("id", assignment.subject_id).maybeSingle(),
    admin.from("users").select("id, organization_id, institution_id").eq("id", assignment.faculty_id).maybeSingle(),
  ])
  if (!subject || !faculty || !faculty.organization_id || !faculty.institution_id || faculty.institution_id !== subject.institution_id) {
    throw new Error("Indexed assignment scope could not be validated")
  }

  const requestedSections = Array.isArray(assignment.section_ids) ? assignment.section_ids.filter(Boolean) : []
  const { data: sections } = requestedSections.length
    ? await admin.from("sections").select("id").eq("institution_id", faculty.institution_id).in("id", requestedSections)
    : { data: [] }
  const validSections = (sections ?? []).map((section) => String(section.id))
  const targets = validSections.length ? validSections : [null]
  const content = `${assignment.title}\n\n${assignment.description ?? ""}`.trim()
  const contentHash = sha256(content)

  for (const sectionId of targets) {
    const sourceId = `${assignment.id}:${sectionId ?? "subject"}`
    const { data: previous } = await admin
      .from("knowledge_documents")
      .select("id, document_version, content_hash, status")
      .eq("source_type", "assignment")
      .eq("source_id", sourceId)
      .order("document_version", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (previous?.content_hash === contentHash && previous.status !== "failed") continue
    const version = Number(previous?.document_version ?? 0) + 1
    const { data: document, error: documentError } = await admin.from("knowledge_documents").insert({
      organization_id: faculty.organization_id,
      institution_id: faculty.institution_id,
      department_id: subject.department_id,
      subject_id: assignment.subject_id,
      section_id: sectionId,
      owner_id: assignment.faculty_id,
      title: assignment.title,
      original_filename: `${assignment.title.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100)}.txt`,
      storage_bucket: "knowledge-documents",
      storage_path: null,
      visibility: "institution",
      allowed_roles: ASSIGNMENT_ROLES,
      document_version: version,
      source_type: "assignment",
      source_id: sourceId,
      content_hash: contentHash,
      mime_type: "text/plain",
      status: "pending",
    }).select("id").single()
    if (documentError || !document) throw documentError ?? new Error("Failed to create assignment knowledge document")

    const { error: jobError } = await admin.from("knowledge_ingestion_jobs").insert({
      document_id: document.id,
      requested_by: assignment.faculty_id,
      status: "queued",
      attempts: 0,
      max_attempts: 5,
      available_at: new Date().toISOString(),
    })
    if (jobError) throw jobError
  }
}

export async function archiveAssignmentKnowledge(admin: SupabaseClient, assignmentId: string): Promise<void> {
  const { data: documents } = await admin
    .from("knowledge_documents")
    .select("id")
    .eq("source_type", "assignment")
    .like("source_id", `${assignmentId}:%`)
    .neq("status", "archived")
  const ids = (documents ?? []).map((document) => document.id)
  if (!ids.length) return
  await admin.from("knowledge_documents").update({ status: "archived", updated_at: new Date().toISOString() }).in("id", ids)
}
