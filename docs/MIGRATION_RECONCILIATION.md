# Reconciled SkillArc migration history — SCRUM-47

On 10 October 2026, the existing synthetic SkillArc project (`sjyotfnhdfmjkulyssps`) was reconciled with tracked SQL under `supabase/migrations`. It is the current shared mobile test database; Supabase reports no separate preview branches. Another paid branch is not required for this initial environment.

## Canonical history

- The 14 original hosted migration versions remain in the hosted ledger. Their exact fetched SQL is preserved in `migrations/hosted-history/`.
- Those 14 versions are represented by comment-only historical markers in `supabase/migrations`. A new database runs these markers followed by `20261010094633_reconciled_hosted_schema.sql`, which restores the complete observed application schema. This explicitly supersedes the earlier partial history; the markers are not stand-alone schema migrations.
- The baseline contains schema, extensions, explicit grants, functions, triggers, indexes, RLS state and 12 custom Storage policies. It contains no user records, Auth credentials, uploaded objects or copied production seed data. Managed Supabase Auth/Storage schemas are initialized by Supabase itself. Storage bucket records and provider/dashboard configuration are not schema migrations and must be provisioned separately for workflows that need them.
- Root `migrations/*.sql` and `skillarc_schema_v1.sql` remain historical development sources. They are not the replay plan. Some later local SQL is absent from, or differs from, the hosted schema; reconciliation does not silently claim it was deployed. Port any intended further changes into new timestamped migrations and review/test them separately.
- `scripts/local/sync-migrations.sh` now validates tracked files rather than generating a conflicting second history. `supabase/migration-baseline.json` records immutable file hashes. Add new migrations after the baseline; do not edit applied SQL.

## Verification and hosted bookkeeping

1. Exported schema only using Supabase CLI 2.117.0 and fetched the original migration statements before making changes.
2. Replayed all 15 canonical versions in a fresh isolated local Supabase project on ports 55320–55329 (`skillarc-reconcile`), with separate Docker volumes.
3. `supabase db diff --linked --schema public` using pg-delta reported **No schema changes found**, including grants and default privileges. The 12 custom Storage policy definitions matched hosted metadata exactly. There are no custom Auth triggers.
4. A local `db reset --local --yes` with the synthetic seed succeeded: four Auth accounts, four profiles, one student, 15 migration records. The seed now explicitly qualifies `extensions.crypt` and `extensions.gen_salt` to work after the restored search path.
5. Marked only the new baseline version as **already applied** with `supabase migration repair ... --status applied --linked`. Existing hosted migration rows were retained; application DDL and user data were not changed. Local and remote histories now align at all 15 versions; `db push --linked --dry-run --skip-vault` confirms the remote is up to date with no migrations, roles or seeds to apply. This baseline must never be replayed against that existing hosted database.
6. Server typecheck, migration guard lint and five guard tests passed. Mobile API behavior was unchanged.

## Local workflow

Run `npm run db:check-migrations` and `npm run db:test-migrations`. Existing checkouts may still contain old ignored generated SQL. The guard rejects it; move that old projection outside `supabase/migrations` after comparing it with Git. Do not blindly remove uncommitted SQL. The original projection from this reconciliation was preserved privately under `/tmp/skillarc-generated-migrations-before-reconciliation`.

For a fresh local environment, use the existing `npm run local:start` / `npm run local:reset` workflow. Reset is local only. The root `supabase/seed.sql` has fixed **local-only** test passwords. Do not use this seed on a network-accessible database; future hosted branches need private synthetic account provisioning. Review `supabase migration list --linked` and `supabase db push --dry-run` before any later hosted deployment.

Before creating a new hosted branch, disable the local seed for that target and configure its private synthetic accounts, Auth settings, Storage bucket configuration, server environment and matching EAS public values. No new hosted branch or paid resource was created here.

## Existing access-control findings

This is a faithful baseline of the existing synthetic environment, not a production security certification. Supabase advisors report 34 public tables with RLS disabled (25 already have policies), six anonymously executable SECURITY DEFINER functions, and additional GraphQL exposure/search-path/password-protection warnings. These were pre-existing and are not changed by migration-history bookkeeping. Existing Storage policies also include broad public access. Keep this environment synthetic-only. Resolve these findings with scoped authorization regression tests before introducing real client data or enabling further direct mobile database/storage access.

See [RLS advisor remediation](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public) and [SECURITY DEFINER remediation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
