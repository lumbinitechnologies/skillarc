# Canonical knowledge migration runbook

This runbook moves document search from the Python/Render/Chroma system to the Next.js + Supabase pipeline. The first migration is non-destructive: preserve legacy exports, source files, and reports until production verification is complete.

## Architecture and provider

Uploads and syllabus/material changes create a `knowledge_documents` row and a queued `knowledge_ingestion_jobs` row. Vercel Cron calls `POST /api/internal/knowledge/worker` with `Authorization: Bearer $CRON_SECRET`. The Node worker claims a bounded batch through `claim_knowledge_ingestion_jobs`, parses outside the database transaction, uses the server-only local Hugging Face adapter, writes `knowledge_chunks`, and publishes the ready version atomically.

The canonical profile is:

```text
provider: huggingface-local
model: Xenova/all-MiniLM-L6-v2
revision: 751bff3
dimensions: 384
pooling: mean
normalize: true
chunking: v2 (800 characters, 120 overlap)
```

The model is downloaded and executed locally by `@huggingface/transformers`; no OpenAI or Hugging Face API key is used. The first worker invocation may be slower while the model loads. MiniLM is English-focused and truncates long model inputs, so the worker uses bounded chunks and records the chunking version in the embedding profile.

Groq remains the chat and tool-calling provider. When Groq emits `search_permitted_documents`, Next.js executes the tool, creates the query embedding locally, calls the service-role-only `match_knowledge_chunks` RPC, and returns authorized citations to Groq. Tool calling is orchestration; embeddings are retrieval and do not need to come from Groq.

## Deployment order

The CLI/deployment pipeline applies database structure; the backfill command migrates knowledge data. Keep search disabled throughout the migration:

1. Apply migrations 024, 027, and 028 through the Supabase CLI or deployment pipeline. Do not hand-edit the linked database. Confirm migration history and inspect the resulting functions, grants, indexes, and columns.
2. Create or verify the private `knowledge-documents` Storage bucket and service-role access. Do not expose Storage paths or service keys to clients.
3. Configure `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`, `CRON_SECRET`, `KNOWLEDGE_EMBEDDING_PROVIDER=huggingface-local`, `KNOWLEDGE_EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2`, `KNOWLEDGE_EMBEDDING_REVISION=751bff3`, `KNOWLEDGE_EMBEDDING_DIMENSIONS=384`, and `KNOWLEDGE_SEARCH_ENABLED=false`.
4. Deploy the Next.js producer and worker. On Vercel Hobby, `vercel.json` schedules the worker once daily at 03:00 UTC (with Vercel's documented timing variance); Cron requests must still pass the secret check. Use a manual protected invocation when immediate processing is required. Verify Node runtime, memory, outbound model download, cold-start time, and the 300-second function limit. Move to a more frequent external scheduler or Vercel Pro only if the product requires lower ingestion latency.
5. Export and validate legacy SQLite/Chroma metadata, chunk text, and source files before removing or shutting down any legacy filesystem. Keep the export immutable. The current legacy stores may contain no usable corpus; record that rather than treating an empty export as a successful document migration.
6. Run the backfill dry-run, review its JSON report, then run the backfill command in a controlled environment. It creates canonical source documents and queued jobs; it never copies incompatible legacy vectors and never deletes legacy data.
7. Leave the three existing queued assignment jobs in place. After the worker deployment, let the worker process them. Confirm they become section-scoped ready documents with 384-dimensional vectors. Their descriptions are empty, so the report must contain title-only content warnings.
8. Verify the report and readiness RPC/database checks below. Resolve failed, missing, unscoped, stale, or orphaned records before enablement.
9. Run role- and tenant-specific smoke searches. Only after all gates pass, set `KNOWLEDGE_SEARCH_ENABLED=true` and deploy the configuration.

To roll back before enablement, keep the flag false and pause Cron. Do not delete the queued jobs, documents, vectors, exports, or legacy backups.

## Backfill input and command

The command accepts a JSON manifest containing either an array or `{ "documents": [...] }`. Each document must have a stable `legacy_id`, validated tenant scope, and one of inline `content`, ordered `chunks`, or a `file_path` relative to `--source-root`:

```json
{
  "documents": [
    {
      "legacy_id": "legacy-document-id",
      "filename": "syllabus.pdf",
      "file_path": "files/syllabus.pdf",
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

PDF and DOCX `file_path` inputs are uploaded as raw bytes and extracted by the canonical worker. Do not decode binary files as UTF-8. Unsupported or missing files are reported and do not create jobs. Re-running compares content hash, source/version, embedding profile, model revision, and chunking version; unchanged records are counted as skipped, while changed or incompatible records receive a new version. Legacy vectors are never reused.

The command also reads current `assignments` rows whose type is `Syllabus` or `Material`. It creates one section-scoped document per valid target section, or a subject-scoped fallback when no section targets are present. Removed section targets are archived, and prior ready versions are archived only after a replacement version has fully persisted. Invalid tenant relationships are reported as `unscoped_records`.

The JSON report contains source counts, imported counts, skipped records, failed jobs, missing files, unscoped records, and title-only/content-quality warnings. Save it with the export and attach it to the deployment change record.

## Verification gates

Run these checks with the Supabase service role or an approved read-only operational connection. The readiness function is service-role-only and is the authoritative pre-enable summary:

```sql
SELECT * FROM public.knowledge_ingestion_readiness();

SELECT d.id, d.source_type, d.document_version
FROM public.knowledge_documents d
LEFT JOIN public.knowledge_chunks c
  ON c.document_id = d.id AND c.document_version = d.document_version
WHERE d.status = 'ready'
GROUP BY d.id, d.source_type, d.document_version
HAVING count(c.id) = 0;

SELECT count(*) AS missing_embeddings
FROM public.knowledge_chunks c
JOIN public.knowledge_documents d
  ON d.id = c.document_id AND d.document_version = c.document_version
WHERE d.status = 'ready'
  AND (c.embedding IS NULL OR d.embedding_profile IS DISTINCT FROM 'huggingface-local:Xenova/all-MiniLM-L6-v2:751bff3:384:v2');

SELECT count(*) AS orphaned_or_stale_chunks
FROM public.knowledge_chunks c
LEFT JOIN public.knowledge_documents d
  ON d.id = c.document_id AND d.document_version = c.document_version
WHERE d.id IS NULL;

SELECT count(*) AS unscoped_ready_documents
FROM public.knowledge_documents
WHERE status = 'ready'
  AND (organization_id IS NULL OR institution_id IS NULL);
```

Ready documents must have current-version chunks, vectors, and the active profile. Orphaned/stale and unscoped ready records must be zero. Queued rows may remain during normal operation, but running/failed rows require an explanation; failed rows must have an actionable error. Confirm all three current assignment jobs complete and inspect their title-only warnings.

Perform sample searches as a private owner, department user, institution user, organization administrator, student, parent, and an impersonated effective user. Confirm a document from another organization never appears, section-scoped content does not cross sections, and citations use the top-level RPC `title` field.

## Operations, failure recovery, and rollback

Worker leases expire after four minutes and are renewed during long model/extraction work. The database function limits a claim to 50 rows; the application worker claims five rows per invocation and retries with bounded exponential backoff up to `max_attempts`. Inspect `knowledge_ingestion_jobs.error_message`, `attempts`, `locked_at`, `lease_expires_at`, and `updated_at` when troubleshooting. Expired jobs are safely reclaimable through `FOR UPDATE SKIP LOCKED`.

Monitor worker duration, model initialization failures, memory/cold-start latency, retries, lease recovery, failed jobs, queue depth, embedding profile mismatches, no-match rates, citation correctness, and cross-tenant probe results.

To pause retrieval, set `KNOWLEDGE_SEARCH_ENABLED=false`; the assistant returns no document context. To pause ingestion, disable the Vercel Cron schedule while preserving queued rows. If the local model exceeds Vercel resource limits, stop this rollout and evaluate the separate Supabase Edge Function `gte-small` architecture; do not silently change providers or dimensions.

If a future model is selected, create a new embedding profile, re-embed every source with the new profile, verify it independently, then archive the old profile. Never compare vectors from different models. Retain the export/backfill compatibility tooling until the production observation window shows healthy canonical search and no legacy callers; remove it in a separate cleanup change.
