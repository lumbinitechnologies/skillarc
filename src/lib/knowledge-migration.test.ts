import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const migration = readFileSync("migrations/027_canonical_knowledge_ingestion.sql", "utf8")
const localEmbeddingMigration = readFileSync("migrations/028_local_knowledge_embeddings.sql", "utf8")

test("canonical knowledge migration defines leased queue claiming", () => {
  assert.match(migration, /FOR UPDATE SKIP LOCKED/)
  assert.match(migration, /lease_expires_at/)
  assert.match(migration, /locked_by = p_worker_id/)
  assert.match(migration, /knowledge_ingestion_jobs_claim_idx/)
})

test("canonical knowledge migration keeps vector search server-only", () => {
  assert.match(migration, /match_knowledge_chunks/)
  assert.match(migration, /embedding vector\(384\)/)
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.match_knowledge_chunks/)
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.match_knowledge_chunks.*TO service_role/)
  assert.doesNotMatch(migration, /GRANT EXECUTE ON FUNCTION public\.match_knowledge_chunks[^\n]*authenticated/)
})

test("canonical knowledge migration supports source idempotency", () => {
  assert.match(migration, /source_type text NOT NULL DEFAULT 'upload'/)
  assert.match(migration, /source_id text/)
  assert.match(migration, /content_hash text/)
  assert.match(migration, /knowledge_documents_source_version_uidx/)
})

test("local embedding migration pins the profile and protects publication", () => {
  assert.match(localEmbeddingMigration, /embedding_profile text/)
  assert.match(localEmbeddingMigration, /embedding_dimensions_check/)
  assert.match(localEmbeddingMigration, /locked_at = now\(\)/)
  assert.match(localEmbeddingMigration, /renew_knowledge_ingestion_job/)
  assert.match(localEmbeddingMigration, /finalize_knowledge_ingestion_job/)
  assert.match(localEmbeddingMigration, /status = 'archived'/)
  assert.match(localEmbeddingMigration, /p_embedding_profile text/)
  assert.match(localEmbeddingMigration, /huggingface-local:Xenova\/all-MiniLM-L6-v2:751bff3:384:v2/)
  assert.match(localEmbeddingMigration, /knowledge_ingestion_readiness/)
  assert.match(localEmbeddingMigration, /TO service_role/)
})
