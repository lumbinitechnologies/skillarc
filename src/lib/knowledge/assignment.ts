import type { SupabaseClient } from "@supabase/supabase-js"

import { sha256 } from "@/lib/knowledge/service"
import { knowledgeEmbeddingDimensions, knowledgeEmbeddingModel, knowledgeEmbeddingProfile, knowledgeEmbeddingProvider, knowledgeEmbeddingRevision } from "@/lib/knowledge/config"

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

type SubjectRow = {
  id: string
  institution_id: string | null
  program_id: string | null
}

type FacultyRow = {
  id: string
  organization_id: string | null
  institution_id: string | null
  department_id: string | null
}

type ProgramRow = {
  id: string
  department_id: string | null
  institution_id: string | null
  organization_id: string | null
}

export async function syncAssignmentKnowledge(admin: SupabaseClient, assignmentId: string): Promise<{ created: number; skipped: number }> {
  const { data: assignment, error: assignmentError } = (await admin.from("assignments").select("id, subject_id, faculty_id, title, description, type, section_ids").eq("id", assignmentId).maybeSingle()) as { data: AssignmentRow | null; error: unknown }
  if (assignmentError) throw assignmentError
  if (!assignment) return { created: 0, skipped: 0 }

  if (!INDEXED_TYPES.has(assignment.type ?? "")) {
    await archiveAssignmentKnowledge(admin, assignment.id)
    return { created: 0, skipped: 0 }
  }
  if (!assignment.subject_id || !assignment.faculty_id) throw new Error("Indexed assignment has no subject or faculty")

  const subjectQuery = admin.from("subjects").select("id, institution_id, program_id").eq("id", assignment.subject_id).maybeSingle()
  const facultyQuery = admin.from("users").select("id, organization_id, institution_id, department_id").eq("id", assignment.faculty_id).maybeSingle()
  const [{ data: subject, error: subjectError }, { data: faculty, error: facultyError }] = (await Promise.all([subjectQuery, facultyQuery])) as [{ data: SubjectRow | null; error: unknown }, { data: FacultyRow | null; error: unknown }]
  if (subjectError) throw subjectError
  if (facultyError) throw facultyError
  if (!subject || !faculty || !faculty.organization_id || !faculty.institution_id || faculty.institution_id !== subject.institution_id) {
    throw new Error("Indexed assignment scope could not be validated")
  }

  let departmentId = faculty.department_id
  if (subject.program_id) {
    const { data: program, error: programError } = (await admin.from("programs").select("id, department_id, institution_id, organization_id").eq("id", subject.program_id).maybeSingle()) as {
      data: ProgramRow | null
      error: unknown
    }
    if (programError) throw programError
    if (!program || program.institution_id !== faculty.institution_id || program.organization_id !== faculty.organization_id) {
      throw new Error("Indexed assignment program scope could not be validated")
    }
    departmentId = program.department_id ?? departmentId
  }

  const requestedSections = Array.isArray(assignment.section_ids) ? assignment.section_ids.filter(Boolean) : []
  const { data: sections, error: sectionError } = requestedSections.length ? await admin.from("sections").select("id").eq("institution_id", faculty.institution_id).in("id", requestedSections) : { data: [] }
  if (sectionError) throw sectionError
  const validSections = (sections ?? []).map((section) => String(section.id))
  if (requestedSections.length && validSections.length !== requestedSections.length) {
    throw new Error("Indexed assignment section scope could not be validated")
  }
  const targets = validSections.length ? validSections : [null]
  const content = `${assignment.title}\n\n${assignment.description ?? ""}`.trim()
  const contentHash = sha256(content)
  const profile = knowledgeEmbeddingProfile()
  const currentSourceIds = new Set(targets.map((sectionId) => `${assignment.id}:${sectionId ?? "subject"}`))
  let created = 0
  let skipped = 0

  for (const sectionId of targets) {
    const sourceId = `${assignment.id}:${sectionId ?? "subject"}`
    const { data: previous } = await admin.from("knowledge_documents").select("id, document_version, content_hash, embedding_profile, status").eq("source_type", "assignment").eq("source_id", sourceId).order("document_version", { ascending: false }).limit(1).maybeSingle()

    if (previous?.content_hash === contentHash && previous.status !== "failed" && previous.embedding_profile === profile) {
      skipped += 1
      continue
    }
    const version = Number(previous?.document_version ?? 0) + 1
    const { data: document, error: documentError } = await admin
      .from("knowledge_documents")
      .insert({
        organization_id: faculty.organization_id,
        institution_id: faculty.institution_id,
        department_id: departmentId,
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
        embedding_provider: knowledgeEmbeddingProvider(),
        embedding_model: knowledgeEmbeddingModel(),
        embedding_revision: knowledgeEmbeddingRevision(),
        embedding_dimensions: knowledgeEmbeddingDimensions(),
        embedding_profile: profile,
        status: "pending",
      })
      .select("id")
      .single()
    if (documentError || !document) throw documentError ?? new Error("Failed to create assignment knowledge document")

    const { error: jobError } = await admin.from("knowledge_ingestion_jobs").insert({
      document_id: document.id,
      requested_by: assignment.faculty_id,
      status: "queued",
      attempts: 0,
      max_attempts: 5,
      available_at: new Date().toISOString(),
    })
    if (jobError) {
      await admin.from("knowledge_documents").delete().eq("id", document.id)
      throw jobError
    }
    created += 1
  }

  await archiveRemovedAssignmentTargets(admin, assignment.id, currentSourceIds)
  return { created, skipped }
}

async function archiveRemovedAssignmentTargets(admin: SupabaseClient, assignmentId: string, activeSourceIds: Set<string>): Promise<void> {
  const { data: documents, error } = await admin.from("knowledge_documents").select("id, source_id").eq("source_type", "assignment").like("source_id", `${assignmentId}:%`).neq("status", "archived")
  if (error) throw error
  const removedIds = (documents ?? []).filter((document) => !activeSourceIds.has(String(document.source_id))).map((document) => document.id)
  if (!removedIds.length) return
  const { error: archiveError } = await admin.from("knowledge_documents").update({ status: "archived", updated_at: new Date().toISOString() }).in("id", removedIds)
  if (archiveError) throw archiveError
}

export async function archiveAssignmentKnowledge(admin: SupabaseClient, assignmentId: string): Promise<void> {
  const { data: documents } = await admin.from("knowledge_documents").select("id").eq("source_type", "assignment").like("source_id", `${assignmentId}:%`).neq("status", "archived")
  const ids = (documents ?? []).map((document) => document.id)
  if (!ids.length) return
  await admin.from("knowledge_documents").update({ status: "archived", updated_at: new Date().toISOString() }).in("id", ids)
}
