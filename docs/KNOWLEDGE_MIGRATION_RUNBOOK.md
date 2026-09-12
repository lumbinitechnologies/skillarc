# Canonical knowledge migration runbook

This runbook moves document search from the retired Python/Render/Chroma system to the Next.js + Supabase pipeline. The first migration is deliberately non-destructive: legacy exports and source files must be retained until production verification is complete.

## Architecture

Uploads and syllabus/material changes create a `knowledge_documents` row and a queued `knowledge_ingestion_jobs` row. Vercel Cron calls `POST /api/internal/knowledge/worker` with `Authorization: Bearer $CRON_SECRET`. The Node worker claims a bounded batch through `claim_knowledge_ingestion_jobs`, parses outside the database transaction, calls `embedMany()` with `text-embedding-3-small` and `dimensions: 384`, writes `knowledge_chunks`, and completes the job.

The assistant calls `match_knowledge_chunks` only through the server-side Supabase service-role client. The RPC applies organization, institution, role, owner, department, subject, and section predicates before vector ranking. Browser roles cannot execute the RPC.

## Deployment order

1. Apply `migrations/024_ai_copilot.sql`, then `migrations/027_canonical_knowledge_ingestion.sql`.
2. Create or verify the private `knowledge-documents` Storage bucket and service-role access. Do not expose Storage paths or service keys to clients.
3. Configure `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`, `KNOWLEDGE_EMBEDDING_MODEL=text-embedding-3-small`, `KNOWLEDGE_EMBEDDING_DIMENSIONS=384`, and leave `KNOWLEDGE_SEARCH_ENABLED=false`.
4. Deploy the Next.js producer and worker. On Vercel Hobby, `vercel.json` schedules the worker once daily at 03:00 UTC (with Vercel's documented timing variance); Cron requests must still pass the secret check.
5. Export the legacy SQLite/Chroma metadata, chunk text, and source files before removing or shutting down any legacy filesystem. Keep the export immutable.
6. Run the backfill command in a controlled environment. It creates `legacy` source documents and jobs; it never copies incompatible legacy vectors and never deletes legacy data.
7. Wait for jobs to finish, then run the verification gates below. Resolve failed, missing, unscoped, and orphaned records before enabling search.
8. Set `KNOWLEDGE_SEARCH_ENABLED=true`, deploy the configuration, and run role-specific smoke searches.
9. Monitor the worker and search metrics for at least one normal operating cycle before deleting temporary export/backfill tooling or removing any rollback artifacts.

## Backfill input and command

The command accepts a JSON manifest containing either an array or `{ "documents": [...] }`. Each document must have a stable `legacy_id`, validated tenant scope, and one of inline `content`, ordered `chunks`, or a `file_path` relative to `--source-root`:

```json
{
  "documents": [
    {
      "legacy_id": "legacy-document-id",
      "filename": "syllabus.txt",
      "chunks": [
        { "chunk_index": 0, "text": "First exported Chroma chunk" },
        { "chunk_index": 1, "text": "Second exported Chroma chunk" }
      ],
      "scope": {
        "organization_id": "uuid",
        "institution_id": "uuid",
        "owner_id": "uuid",
        "department_id": "uuid",
        "subject_id": "uuid",
        "section_id": "uuid",
        "visibility": "institution",
        "allowed_roles": ["FACULTY", "STUDENT"]
      }
    }
  ]
}
```

Run:

```bash
npm run knowledge:backfill -- --manifest ./exports/legacy-knowledge.json --source-root ./exports --report ./exports/knowledge-backfill-report.json --dry-run
npm run knowledge:backfill -- --manifest ./exports/legacy-knowledge.json --source-root ./exports --report ./exports/knowledge-backfill-report.json
```

The command also reads current `assignments` rows whose type is `Syllabus` or `Material`. It creates one section-scoped document per valid target section, or a subject-scoped fallback when no section targets are present. Invalid tenant relationships are reported as `unscoped_records`. Re-running the command with the same source/version/content hash skips existing work; a failed version can be retried as a new version.

The JSON report contains source counts, imported counts, skipped records, failed jobs, missing files, and unscoped records. Save it with the export and attach it to the deployment change record.

## Verification gates

Run these checks with the Supabase service role or an approved read-only operational connection:

```sql
-- Every ready document must have canonical chunks and the current version.
SELECT d.id, d.source_type, d.document_version
FROM public.knowledge_documents d
LEFT JOIN public.knowledge_chunks c
  ON c.document_id = d.id AND c.document_version = d.document_version
WHERE d.status = 'ready'
GROUP BY d.id, d.source_type, d.document_version
HAVING count(c.id) = 0;

-- No canonical ready chunk may lack the required vector.
SELECT count(*) AS missing_embeddings
FROM public.knowledge_chunks c
JOIN public.knowledge_documents d ON d.id = c.document_id
WHERE d.status = 'ready' AND c.embedding IS NULL;

-- Queue health: investigate all rows returned before enablement.
SELECT status, count(*)
FROM public.knowledge_ingestion_jobs
GROUP BY status
ORDER BY status;

-- Detect chunks whose document no longer exists or whose version is stale.
SELECT count(*) AS orphaned_or_stale_chunks
FROM public.knowledge_chunks c
LEFT JOIN public.knowledge_documents d
  ON d.id = c.document_id AND d.document_version = c.document_version
WHERE d.id IS NULL;

-- Scope completeness for records that can be searched.
SELECT count(*) AS unscoped_ready_documents
FROM public.knowledge_documents
WHERE status = 'ready'
  AND (organization_id IS NULL OR institution_id IS NULL);
```

The first, second, fourth, and fifth queries must return zero. Queue rows may be queued during normal operation, but running/failed rows require an explanation and failed rows must have an actionable error. Perform sample searches as a private owner, department user, institution user, organization administrator, student, parent, and an impersonated effective user. Confirm a document from another organization never appears and section-scoped content does not cross sections.

## Operations and rollback

Worker leases expire after four minutes and are reclaimable. The database function limits a claim to 50 rows; the application worker claims five rows per invocation and retries with bounded exponential backoff up to `max_attempts`. Inspect `knowledge_ingestion_jobs.error_message`, `attempts`, `lease_expires_at`, and `updated_at` when troubleshooting.

To pause retrieval, set `KNOWLEDGE_SEARCH_ENABLED=false`; the assistant then returns no document context. To pause ingestion, disable the Vercel Cron schedule while preserving queued rows. Do not delete documents, chunks, exports, or legacy backups as a rollback mechanism. Re-enable the canonical flag only after the verification report and smoke tests pass.

After the production observation window shows no legacy callers and canonical search is healthy, remove the temporary legacy export/backfill compatibility tooling in a separate cleanup change. The backfill command is intentionally retained until that gate is approved.
