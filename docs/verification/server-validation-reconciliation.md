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

## Local verification

- Full canonical replay in a disposable PostgreSQL 17 Supabase database, without seeds.
- Database lint: no errors after repairs.
- pgTAP: 22 assertions passed, including partial-index inference, denied administrative execution, unknown/inactive actors, cross-tenant conversion denial, constrained organization types and owned notification cascades.
- All 21 discovered server test files passed with model smoke enabled (run directly with Node 24 and tsx, not a wrapper that counts files without individual tests).
- TypeScript check passed.
- Root ESLint remains failing: 1,035 errors and 383 warnings across 200 files after safe `prefer-const` fixes and correcting the malformed Tailwind theme object. The largest groups are 781 explicit `any` annotations and React lifecycle/purity violations. Existing lint rules remain enabled. Nested local worktrees/runtime state are excluded, not application source.
- The broader security-readiness checks remain incomplete. Detailed audit evidence is retained locally; authorization-specific repairs and regression evidence are required before readiness can be claimed.

Passing the targeted repairs does not meet the full #67 release gate. #68/#65 must be validated on their actual merged trees; staging activation and client onboarding remain blocked until required checks, review and environment configuration are complete.

## Integrated PR candidates (2026-11-01)

Both PR branches were updated to main `28f6dd6`. Testing their combined trees with repair commit `24f15b5` produced:

| Candidate | Result |
| --- | --- |
| #68 plus main and repairs | 28 discovered test files pass, including the exact-candidate staging alias assertion; typecheck passes. |
| #65 plus main and repairs | 23 discovered test files pass; typecheck and isolated PostgreSQL timezone assertions pass. |
| #68 harness with all three migration sets | 18 canonical migrations replayed without seeds; 22 pgTAP assertions, deterministic fixture replay/collision rejection, and database lint pass. |

These are local integration results, not passing GitHub checks for the unmerged repair or hosted staging evidence. #68 checks the stable staging alias's project and exact deployment ID before and after smoke and requires fresh independent review. The trusted-base policy workflow still has a bootstrap dependency: its policy script is not yet on main.

Staging/policy environment credential listings were empty on 2026-11-01. No activation flags were enabled. Full root lint and broader readiness work remain required.
