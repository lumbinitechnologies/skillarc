import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { extractText } from "unpdf"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { KNOWLEDGE_BUCKET, KNOWLEDGE_MAX_FILE_BYTES } from "@/lib/knowledge/service"
import { embedKnowledgeMany } from "@/lib/knowledge/embeddings"
import { knowledgeEmbeddingDimensions, knowledgeEmbeddingModel, knowledgeEmbeddingProfile, knowledgeEmbeddingProvider, knowledgeEmbeddingRevision } from "@/lib/knowledge/config"
import type { SupabaseClient } from "@supabase/supabase-js"
import mammoth from "mammoth"

const CLAIM_LIMIT = 5
const LEASE_SECONDS = 240
const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 120
const MAX_CHUNKS = 2000
const MAX_EXTRACTED_CHARACTERS = 2_000_000
const INSERT_BATCH_SIZE = 100

export type KnowledgeIngestionJob = {
  id: string
  document_id: string
  attempts: number
  max_attempts: number
}

type KnowledgeDocument = {
  id: string
  organization_id: string | null
  institution_id: string | null
  department_id: string | null
  subject_id: string | null
  section_id: string | null
  owner_id: string | null
  title: string
  original_filename: string
  storage_bucket: string
  storage_path: string | null
  visibility: string
  allowed_roles: string[]
  document_version: number
  source_type: "upload" | "assignment" | "legacy"
  source_id: string | null
  content_hash: string | null
  mime_type: string | null
}

export function normalizeExtractedText(text: string): string {
  const normalized = text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
  if (!normalized) throw new Error("The document contains no extractable text")
  if (normalized.length > MAX_EXTRACTED_CHARACTERS) {
    throw new Error(`The extracted document is too large (maximum ${MAX_EXTRACTED_CHARACTERS} characters)`)
  }
  return normalized
}

export async function extractKnowledgeText(bytes: Uint8Array, mimeType: string | null, filename: string): Promise<string> {
  const extension = filename.split(".").pop()?.toLowerCase()
  if (mimeType === "text/plain" || extension === "txt") {
    return normalizeExtractedText(new TextDecoder().decode(bytes))
  }

  if (mimeType === "application/pdf" || extension === "pdf") {
    const result = await extractText(bytes, { mergePages: true })
    return normalizeExtractedText(result.text)
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || extension === "docx") {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
    return normalizeExtractedText(result.value)
  }

  throw new Error("Unsupported document format")
}

export async function splitKnowledgeText(text: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  })
  const chunks = await splitter.splitText(text)
  if (!chunks.length) throw new Error("The document produced no searchable chunks")
  if (chunks.length > MAX_CHUNKS) throw new Error(`The document has too many chunks (maximum ${MAX_CHUNKS})`)
  return chunks
}

export function assertEmbeddingDimensions(embeddings: number[][], dimensions = knowledgeEmbeddingDimensions()): void {
  if (embeddings.length === 0 || embeddings.some((embedding) => embedding.length !== dimensions)) {
    throw new Error(`Embedding provider returned vectors that are not ${dimensions}-dimensional`)
  }
}

async function sourceText(admin: SupabaseClient, document: KnowledgeDocument): Promise<{ text: string; mimeType: string; filename: string }> {
  if (document.source_type === "assignment") {
    const assignmentId = document.source_id?.split(":", 1)[0]
    if (!assignmentId) throw new Error("Assignment knowledge document has no source assignment")
    const { data, error } = await admin.from("assignments").select("title, description").eq("id", assignmentId).maybeSingle()
    if (error) throw error
    if (!data) throw new Error("The source assignment no longer exists")
    return {
      text: normalizeExtractedText(`${data.title}\n\n${data.description ?? ""}`),
      mimeType: "text/plain",
      filename: document.original_filename,
    }
  }

  if (!document.storage_path) throw new Error("Knowledge document has no approved storage object")
  const { data, error } = await admin.storage.from(document.storage_bucket || KNOWLEDGE_BUCKET).download(document.storage_path)
  if (error || !data) throw error ?? new Error("Failed to download the source document")
  if (data.size > KNOWLEDGE_MAX_FILE_BYTES) throw new Error("The stored document exceeds the 50 MB size limit")
  return {
    text: await extractKnowledgeText(new Uint8Array(await data.arrayBuffer()), document.mime_type, document.original_filename),
    mimeType: document.mime_type || "application/octet-stream",
    filename: document.original_filename,
  }
}

function claimedJob(data: unknown): KnowledgeIngestionJob[] {
  if (!Array.isArray(data)) return []
  return data.filter((job): job is KnowledgeIngestionJob => {
    if (!job || typeof job !== "object") return false
    const candidate = job as Partial<KnowledgeIngestionJob>
    return typeof candidate.id === "string" && typeof candidate.document_id === "string"
  })
}

async function failJob(admin: SupabaseClient, job: KnowledgeIngestionJob, workerId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  const { data, error: failError } = await admin.rpc("fail_knowledge_ingestion_job", {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_error: message,
  })
  if (failError) {
    console.error("Failed to update knowledge ingestion job", job.id, failError)
    return
  }
  const failedJob = Array.isArray(data) ? data[0] : data
  await admin
    .from("knowledge_documents")
    .update({
      status: failedJob?.status === "failed" ? "failed" : "pending",
      failure_reason: message.slice(0, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.document_id)
}

async function processJob(admin: SupabaseClient, job: KnowledgeIngestionJob, workerId: string): Promise<void> {
  const { data: document, error: documentError } = (await admin.from("knowledge_documents").select("id, organization_id, institution_id, department_id, subject_id, section_id, owner_id, title, original_filename, storage_bucket, storage_path, visibility, allowed_roles, document_version, source_type, source_id, content_hash, mime_type").eq("id", job.document_id).maybeSingle()) as { data: KnowledgeDocument | null; error: unknown }
  if (documentError) throw documentError
  if (!document) throw new Error("Knowledge document no longer exists")

  await admin
    .from("knowledge_documents")
    .update({
      status: "processing",
      failure_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id)
  let leaseError: Error | null = null
  const leaseHeartbeat = setInterval(() => {
    void admin
      .rpc("renew_knowledge_ingestion_job", {
        p_job_id: job.id,
        p_worker_id: workerId,
        p_lease_seconds: LEASE_SECONDS,
      })
      .then(({ error }) => {
        if (error) leaseError = error
      })
  }, 60_000)

  try {
    const source = await sourceText(admin, document)
    const chunks = await splitKnowledgeText(source.text)
    const embeddings = await embedKnowledgeMany(chunks)
    assertEmbeddingDimensions(embeddings)
    if (leaseError) throw leaseError

    // Content is parsed and embedded before replacing chunks, so no database
    // lock is held while storage or model work is running.
    const { error: deleteError } = await admin.from("knowledge_chunks").delete().eq("document_id", document.id).eq("document_version", document.document_version)
    if (deleteError) throw deleteError
    for (let offset = 0; offset < chunks.length; offset += INSERT_BATCH_SIZE) {
      const rows = chunks.slice(offset, offset + INSERT_BATCH_SIZE).map((content, index) => ({
        document_id: document.id,
        organization_id: document.organization_id,
        institution_id: document.institution_id,
        department_id: document.department_id,
        subject_id: document.subject_id,
        section_id: document.section_id,
        owner_id: document.owner_id,
        visibility: document.visibility,
        allowed_roles: document.allowed_roles,
        chunk_index: offset + index,
        content,
        embedding: embeddings[offset + index],
        document_version: document.document_version,
      }))
      const { error } = await admin.from("knowledge_chunks").insert(rows)
      if (error) throw error
    }

    if (leaseError) throw leaseError
    const { error: metadataError } = await admin
      .from("knowledge_documents")
      .update({
        embedding_provider: knowledgeEmbeddingProvider(),
        embedding_model: knowledgeEmbeddingModel(),
        embedding_revision: knowledgeEmbeddingRevision(),
        embedding_dimensions: knowledgeEmbeddingDimensions(),
        embedding_profile: knowledgeEmbeddingProfile(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id)
    if (metadataError) throw metadataError
    if (leaseError) throw leaseError
    const { error: finalizeError } = await admin.rpc("finalize_knowledge_ingestion_job", {
      p_job_id: job.id,
      p_worker_id: workerId,
    })
    if (finalizeError) throw finalizeError
  } finally {
    clearInterval(leaseHeartbeat)
  }
}

export async function runKnowledgeWorker(admin = createSupabaseAdminClient()): Promise<{ claimed: number; completed: number; failed: number }> {
  const workerId = crypto.randomUUID()
  const { data, error } = await admin.rpc("claim_knowledge_ingestion_jobs", {
    p_limit: CLAIM_LIMIT,
    p_worker_id: workerId,
    p_lease_seconds: LEASE_SECONDS,
  })
  if (error) throw error

  const jobs = claimedJob(data)
  let completed = 0
  let failed = 0
  for (const job of jobs) {
    try {
      await processJob(admin, job, workerId)
      completed += 1
    } catch (error) {
      failed += 1
      await failJob(admin, job, workerId, error)
      console.error("Knowledge ingestion failed", {
        jobId: job.id,
        documentId: job.document_id,
        error,
      })
    }
  }
  return { claimed: jobs.length, completed, failed }
}

export const knowledgeWorkerInternals = { processJob, sourceText }
