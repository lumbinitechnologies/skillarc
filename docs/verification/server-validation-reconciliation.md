# Server validation reconciliation

Status: local repair under review; #67 remains open. No hosted migrations or staging/production releases have run.

## Baseline

Tested against main `28f6dd6a5261af297fa6207699d8c39e7e28c704` (including #69). The 15 recorded baseline migrations are unchanged. New migrations are additive, generated with Supabase CLI 2.117.0.

## #69 migration dispositions

| Legacy SQL | Canonical disposition |
| --- | --- |
| 036 organization type | New forward migration adds the constrained column, default, comment and index. No record cleanup/backfill is needed. |
| 037 user phone | Already present in the reconciled baseline. No duplicate alteration needed. |
| 038 staff grants | Broad authenticated `GRANT ALL` is deliberately not replayed. Staff authorization requires a separate review before changing authenticated grants. Existing service-role access remains. |
| 039 user-dependent cascades | Forward migration reconciles the two parent/student relations and notification FK. Preferences already cascade; its definition is retained consistently. Tests prove deletion removes only owned notifications/preferences. |
| `.db.sql.copy` | Informational SQL export, never a migration or executable deployment input. |

Only `supabase/migrations` is deployment input. Legacy files are historical references; do not run them manually in the hosted SQL editor.

## Function repairs

- Admission conversion conflict targets now include the predicates of the existing partial unique indexes for enrolments, payment plans and invoice installments.
- Timetable slot identifiers are explicitly parsed as UUIDs.
- Institution deletion uses `knowledge_chunks` and `enrolment_timetable_slots`, the tables actually present in the canonical schema.
- Conversion rejects inactive actors and organization administrators outside the target institution's organization; institution comparison is NULL-safe.
- Administrative deletion and conversion are service-role-only database operations, matching the verified server-route boundary. PUBLIC, anon and authenticated execute privileges are revoked.

## Test-contract reconciliation

Commit `a05e7a6` intentionally expanded the assistant limits to 20 queries/5,000 characters and added faculty navigation destinations. The tests still expected the older limits/routes. Updated assertions retain the large-fixture budget checks and role-denial tests; the linked faculty pages exist on current main.

## Current local verification (2026-11-02)

- A fresh replay of all 18 canonical migrations and synthetic seed data completed in a disposable local Supabase database.
- Strict database lint (`--fail-on warning`) passed after the function cleanup and pgvector schema move.
- The #70 reconciliation pgTAP suite has 22 passing assertions. On the same local database, the #72 authorization suite passed all 56 synthetic positive/negative checks.
- All 22 discovered server tests passed with knowledge-model smoke enabled on the #71 branch; all 24 discovered tests passed on the #72 branch.
- TypeScript checks pass on both branches. The #72 focused ESLint checks and production build pass; the root build also passes with the existing `unpdf` dynamic-import warning.
- `npm run lint` passes with 0 errors and 409 warnings. No lint rule was disabled and no application source was excluded.
- Supabase security advisors report no warning-level findings. Remaining information-level results concern private server-only tables that are intentionally inaccessible to client roles.

These checks used local synthetic data only. No hosted schema, storage objects, accounts, or records were changed. PRs #70 and #74 are ready for independent review; #75 remains a draft until its base includes #71. GitHub Actions test and release workflows remain in PR #68, so current GitHub checks are Vercel preview checks rather than the required test gate. Staging and production activation remain disabled.

## Earlier integrated PR candidates (2026-11-01)

Both PR branches were updated to main `28f6dd6`. Testing their combined trees with repair commit `24f15b5` produced:

| Candidate | Result |
| --- | --- |
| #68 plus main and repairs | 28 discovered test files pass, including the exact-candidate staging alias assertion; typecheck passes. |
| #65 plus main and repairs | 23 discovered test files pass; typecheck and isolated PostgreSQL timezone assertions pass. |
| #68 harness with all three migration sets | 18 canonical migrations replayed without seeds; 22 pgTAP assertions, deterministic fixture replay/collision rejection, and database lint pass. |

These were local integration results, not passing GitHub checks or hosted staging evidence. Re-run #65/#68 against the final merged #67 tree before enabling staging. #68 still needs fresh independent review after its earlier review was dismissed; its test and production-release workflows are not yet active on `main`.
