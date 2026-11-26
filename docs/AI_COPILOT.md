# SkillArc AI Copilot

The canonical assistant boundary is `POST /api/assistant/chat`. It authenticates the Supabase user, resolves the effective role (including super-admin impersonation), loads server-owned thread history, and exposes only read-only, role-scoped tools to Groq through the AI SDK.

`POST /api/assistant/public` is the signed-out product-guide stream. It uses a curated FAQ and cannot access dashboard or academic data.

## Required deployment configuration

Set these server-only variables in the Next.js deployment:

```text
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
SUPABASE_SERVICE_ROLE_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

`SUPABASE_SERVICE_ROLE_KEY` is needed for impersonated thread persistence and must never be exposed through `NEXT_PUBLIC_*` variables. Local development proceeds without a limiter when Redis is unset; production should configure Redis. A configured but unavailable Redis limiter fails closed.

Apply `migrations/024_ai_copilot.sql` and then `migrations/027_canonical_knowledge_ingestion.sql` before enabling the canonical widget. The second migration adds source/version identity, leased jobs, server-only lifecycle/search RPCs, and the 384-dimensional vector contract. The complete migration and rollout procedure is in `docs/KNOWLEDGE_MIGRATION_RUNBOOK.md`.

## Cutover behavior

- The widget uses AI SDK `useChat` with the canonical private/public transports.
- `/api/assistant/chat` and `/api/assistant/public` are the active assistant boundaries. The old `/api/chatbot/*` and `/api/edurag` gateways have been removed after repository caller verification; `/api/ai/chat` remains only as the typed placement/interview task adapter until those callers are fully retired.
- Placement and interview screens call the typed task client. Interview evaluation reads the structured score and feedback instead of parsing model text or using a default score.
- The Next.js Vercel Cron worker is the only active document-ingestion runner. It claims `knowledge_ingestion_jobs` with `FOR UPDATE SKIP LOCKED`, extracts approved Storage objects or assignment text, embeds with the configured 384-dimensional model, and marks documents ready only after chunk persistence.
- The new assistant reads `knowledge_chunks` through the server-only `match_knowledge_chunks` RPC. Retrieval remains fail-closed while `KNOWLEDGE_SEARCH_ENABLED=false` or until the migration verification gates pass.

## Safety boundary

Arca has no insert, update, delete, publish, submit, or generic SQL tool. Workflow links come from the source-controlled registry in `src/lib/assistant/workflows.ts`; the faculty project-team workflow explicitly tells users that the final publish action is manual.
