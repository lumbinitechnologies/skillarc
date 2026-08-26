# Task 09 — Student documents validation

Validation date: 26 August 2026.

## Adopted storage policy

The implementation uses the recommended baseline in
`docs/student-document-storage-policy.md`: private `student-documents`
bucket, institution/student-scoped opaque paths, 20 MiB maximum, approved
document MIME types, 10-minute signed URLs, versioned non-destructive
replacement, and no public links. Malware scanning remains a production
deployment gate because no scanner adapter is present in this repository.

## Evidence

- `migrations/008_task09_student_documents.sql` creates the private bucket and
  categorized, checksummed, versioned document metadata.
- `migrations/014_student_document_linkage.sql` adds application/source-document
  linkage and supersession lineage.
- `src/app/api/students/[id]/documents/route.ts` validates ownership,
  institution/application linkage, MIME type, size, safe paths, checksums,
  upload rollback, versioning, and audit events.
- `src/app/api/students/[id]/documents/[documentId]/route.ts` limits signed
  retrieval to the student owner/admins and review mutations to admins.
- `StudentDrawer` provides category/status filters, upload/replacement,
  version history, review feedback, and signed download controls.

## Checks

- `npx tsc --noEmit --pretty false` passed.
- Targeted ESLint passed for changed document/profile/admissions files.
- `node --import tsx --test src/lib/admission-migration.test.ts` passed.
- `git diff --check` passed.
- Supabase MCP confirmed the private bucket, RLS enabled on
  `student_documents`, focused owner/admin SELECT/INSERT/UPDATE policies, and
  the application-linkage columns.

## Remaining deployment gate

The repository does not contain a malware scanner adapter or a disposable
storage smoke-test fixture. Production approval therefore remains gated on
scanner configuration and a non-production upload/download/replacement smoke
test; physical deletion is intentionally not exposed.
