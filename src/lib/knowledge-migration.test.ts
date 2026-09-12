import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const migration = readFileSync("migrations/027_canonical_knowledge_ingestion.sql", "utf8")

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
