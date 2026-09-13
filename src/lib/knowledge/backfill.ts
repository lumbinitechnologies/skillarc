import { readFile } from "node:fs/promises"
import { resolve, relative } from "node:path"
import type { SupabaseClient } from "@supabase/supabase-js"

import { KNOWLEDGE_ALLOWED_EXTENSIONS, KNOWLEDGE_BUCKET, safeExtension, safeFilename, sha256 } from "@/lib/knowledge/service"
import { knowledgeEmbeddingDimensions, knowledgeEmbeddingModel, knowledgeEmbeddingProfile, knowledgeEmbeddingProvider, knowledgeEmbeddingRevision } from "@/lib/knowledge/config"

export type LegacyBackfillScope = {
  organization_id: string
  institution_id: string
  owner_id: string
  department_id?: string | null
  subject_id?: string | null
  section_id?: string | null
  visibility?: "private" | "department" | "institution" | "organization"
  allowed_roles?: string[]
}

export type LegacyBackfillRecord = {
  legacy_id: string
  filename?: string | null
  file_path?: string | null
  content?: string | null
  chunks?: Array<{
    text?: string | null
    content?: string | null
    chunk_index?: number | null
  }> | null
  scope: LegacyBackfillScope
}

export type LegacyBackfillSource = {
  bytes: Uint8Array
  filename: string
  mimeType: string
}

export type BackfillReport = {
  started_at: string
  finished_at?: string
  dry_run: boolean
  source_counts: { legacy_manifest: number; assignments: number }
  imported_counts: {
    legacy: number
    assignments: number
    jobs: number
    skipped: number
  }
  skipped_records: Array<{ source: string; id: string; reason: string }>
  failed_jobs: Array<{ source: string; id: string; error: string }>
  missing_files: Array<{ source: string; id: string; path?: string | null }>
  unscoped_records: Array<{ source: string; id: string; reason: string }>
  warnings: Array<{ source: string; id: string; warning: string }>
}

export function createBackfillReport(dryRun = false): BackfillReport {
  return {
    started_at: new Date().toISOString(),
    dry_run: dryRun,
    source_counts: { legacy_manifest: 0, assignments: 0 },
    imported_counts: { legacy: 0, assignments: 0, jobs: 0, skipped: 0 },
    skipped_records: [],
    failed_jobs: [],
    missing_files: [],
    unscoped_records: [],
    warnings: [],
  }
}

export function parseLegacyManifest(value: unknown): LegacyBackfillRecord[] {
  const records = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as { documents?: unknown }).documents) ? (value as { documents: unknown[] }).documents : null
  if (!records) throw new Error("Legacy manifest must be an array or an object with a documents array")
  return records.filter((record): record is LegacyBackfillRecord => {
    if (!record || typeof record !== "object") return false
    const candidate = record as Partial<LegacyBackfillRecord>
    return typeof candidate.legacy_id === "string" && Boolean(candidate.scope && typeof candidate.scope === "object")
  })
}

export function legacyContent(record: LegacyBackfillRecord): string {
  if (typeof record.content === "string" && record.content.trim()) return record.content.trim()
  const chunks = Array.isArray(record.chunks) ? record.chunks : []
  return chunks
    .map((chunk, index) => ({
      index: Number.isInteger(chunk.chunk_index) ? Number(chunk.chunk_index) : index,
      text: String(chunk.text ?? chunk.content ?? "").trim(),
    }))
    .filter((chunk) => chunk.text)
    .sort((left, right) => left.index - right.index)
    .map((chunk) => chunk.text)
    .join("\n\n")
}

export function resolveMigrationFile(sourceRoot: string, relativePath: string): string {
  const root = resolve(sourceRoot)
  const target = resolve(root, relativePath)
  const outsideRoot = relative(root, target).startsWith("..")
  if (outsideRoot) throw new Error("Migration file must remain inside --source-root")
  return target
}

export async function readLegacyContent(record: LegacyBackfillRecord, sourceRoot: string): Promise<{ content: string; filename: string }> {
  const source = await readLegacySource(record, sourceRoot)
  if (source.mimeType !== "text/plain") throw new Error("Binary source files must be imported as raw bytes")
  return {
    content: new TextDecoder().decode(source.bytes).trim(),
    filename: source.filename,
  }
}

function mimeTypeFor(filename: string): string {
  const extension = safeExtension(filename)
  if (extension === "pdf") return "application/pdf"
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if (extension === "txt") return "text/plain"
  throw new Error(`Unsupported legacy source extension; expected one of ${[...KNOWLEDGE_ALLOWED_EXTENSIONS].join(", ")}`)
}

export async function readLegacySource(record: LegacyBackfillRecord, sourceRoot: string): Promise<LegacyBackfillSource> {
  const filename = safeFilename(record.filename || record.file_path || `${record.legacy_id}.txt`)
  const inline = legacyContent(record)
  if (inline) {
    return {
      bytes: new TextEncoder().encode(inline),
      filename,
      mimeType: "text/plain",
    }
  }
  if (!record.file_path) throw new Error("No inline content, Chroma text, or source file was provided")
  const file = await readFile(resolveMigrationFile(sourceRoot, record.file_path))
  if (!file.length) throw new Error("Source file is empty")
  return {
    bytes: new Uint8Array(file),
    filename,
    mimeType: mimeTypeFor(filename),
  }
}

async function exists(query: PromiseLike<{ data: unknown }>): Promise<boolean> {
  const { data } = await query
  return Boolean(data)
}

export async function validateLegacyScope(admin: SupabaseClient, scope: LegacyBackfillScope): Promise<string | null> {
  const required = ["organization_id", "institution_id", "owner_id"] as const
  if (required.some((field) => !scope[field])) return "organization_id, institution_id, and owner_id are required"
  if (scope.visibility === "department" && !scope.department_id) return "department visibility requires department_id"

  const [organization, institution, owner] = await Promise.all([exists(admin.from("organizations").select("id").eq("id", scope.organization_id).maybeSingle()), exists(admin.from("institutions").select("id").eq("id", scope.institution_id).eq("organization_id", scope.organization_id).maybeSingle()), exists(admin.from("users").select("id").eq("id", scope.owner_id).eq("organization_id", scope.organization_id).eq("institution_id", scope.institution_id).maybeSingle())])
  if (!organization || !institution || !owner) return "organization, institution, or owner is not in the declared tenant"

  const checks: Array<[string, string | null | undefined, string]> = [
    ["department_id", scope.department_id, "departments"],
    ["subject_id", scope.subject_id, "subjects"],
    ["section_id", scope.section_id, "sections"],
  ]
  for (const [field, id, table] of checks) {
    if (!id) continue
    const valid = await exists(admin.from(table).select("id").eq("id", id).eq("institution_id", scope.institution_id).maybeSingle())
    if (!valid) return `${field} is not in the declared institution`
  }
  return null
}

export async function importLegacyRecord(admin: SupabaseClient, record: LegacyBackfillRecord, source: LegacyBackfillSource): Promise<"imported" | "skipped"> {
  const scope = record.scope
  const contentHash = sha256(source.bytes)
  const profile = knowledgeEmbeddingProfile()
  const { data: previous, error: previousError } = await admin.from("knowledge_documents").select("id, document_version, content_hash, embedding_profile, status").eq("source_type", "legacy").eq("source_id", record.legacy_id).order("document_version", { ascending: false }).limit(1).maybeSingle()
  if (previousError) throw previousError
  if (previous?.content_hash === contentHash && previous.status !== "failed" && previous.embedding_profile === profile) return "skipped"

  const documentId = crypto.randomUUID()
  const version = Number(previous?.document_version ?? 0) + 1
  const extension = safeExtension(source.filename) || "txt"
  const storagePath = `${scope.organization_id}/${scope.institution_id}/legacy/${record.legacy_id}-${contentHash.slice(0, 12)}.${extension}`
  const { error: uploadError } = await admin.storage.from(KNOWLEDGE_BUCKET).upload(storagePath, source.bytes, {
    contentType: source.mimeType,
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { error: documentError } = await admin.from("knowledge_documents").insert({
    id: documentId,
    organization_id: scope.organization_id,
    institution_id: scope.institution_id,
    department_id: scope.department_id ?? null,
    subject_id: scope.subject_id ?? null,
    section_id: scope.section_id ?? null,
    owner_id: scope.owner_id,
    title: source.filename,
    original_filename: source.filename,
    storage_bucket: KNOWLEDGE_BUCKET,
    storage_path: storagePath,
    visibility: scope.visibility ?? "institution",
    allowed_roles: scope.allowed_roles ?? [],
    document_version: version,
    source_type: "legacy",
    source_id: record.legacy_id,
    content_hash: contentHash,
    mime_type: source.mimeType,
    embedding_provider: knowledgeEmbeddingProvider(),
    embedding_model: knowledgeEmbeddingModel(),
    embedding_revision: knowledgeEmbeddingRevision(),
    embedding_dimensions: knowledgeEmbeddingDimensions(),
    embedding_profile: profile,
    status: "pending",
  })
  if (documentError) {
    await admin.storage.from(KNOWLEDGE_BUCKET).remove([storagePath])
    throw documentError
  }

  const { error: jobError } = await admin.from("knowledge_ingestion_jobs").insert({
    document_id: documentId,
    requested_by: scope.owner_id,
    status: "queued",
    attempts: 0,
    max_attempts: 5,
    available_at: new Date().toISOString(),
  })
  if (jobError) {
    await admin.from("knowledge_documents").delete().eq("id", documentId)
    await admin.storage.from(KNOWLEDGE_BUCKET).remove([storagePath])
    throw jobError
  }
  return "imported"
}
