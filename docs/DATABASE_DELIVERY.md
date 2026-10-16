# Database and application delivery

Owner: @keanesc. Independent review and production approval: @lumbinitechnologies.
Tracker: server #66; GitHub Projects only.

## Status and targets — 16 October 2026

Workflows are prepared for review, **not activated**. Existing validation failures
block release. Review protection, release environments and the Vercel staging check
are configured; credentials, required CI checks after bootstrap and gate rehearsal
remain pending.

| Environment | Supabase | Vercel | Data policy |
| --- | --- | --- | --- |
| Staging/sandbox | `sjyotfnhdfmjkulyssps` | `skillarc`, `prj_qF0sUZ0vnVS0pTLpnPELUusGnNaE` | Existing test records only |
| Production | `skillarc-production`, `fvkvfcsqetdxtoosmizq` | `skillarc-production`, `prj_YeaRlzqqi27AlwiCs87G6wD28bqf` | Empty; reviewed migrations only |
| PR databases | Owned branches of staging | No automatic app binding in this change | Fresh schema and synthetic institutions only |

Databases belong to Lumbini Technologies (`ssuwihnqhpwltrscmsmf`), Singapore
(`ap-southeast-1`). Vercel team: `team_Aaz7lak1klst5hnFKJxCcG6G`.
The user approved provisioning costs. Production database and empty, Git-unlinked
Vercel project exist; production has no application tables, migrations, accounts
or deployments. No existing domain moved. `config/deployment-targets.json` is the
reviewed allowlist, containing no secrets.

The existing website's production-designated domain still serves the test
environment. Do not onboard clients there. Production Auth/provider/Storage setup,
application secrets, backup/restore rehearsal and a separate domain cutover remain
required before onboarding.

## One migration owner

GitHub Actions owns migrations. Leave Supabase native GitHub migration deployment
disabled, including automatic migration/seed execution; do not attach a second
migrating integration. Provider-internal empty-branch creation is allowed; preview
automation waits for it to finish and refuses Git-configured actions or pre-existing
migration history.

Pin Supabase CLI `2.117.0`, Vercel CLI `63.1.2`, and Actions by commit. CLI 2.117's
`db push --project-ref` API path was rehearsed on an isolated hosted preview. It
requires an access token, without mutable link state or a database password.
The runner verifies target and remote ledger, dry-runs, pushes with `--skip-vault`,
then verifies the complete ledger. Staging must contain the reconciled baseline;
clean production may bootstrap from empty. Unknown versions, gaps and swaps stop.

Never use hosted resets, automatic history repair, `--include-all`, `--include-seed`,
`--include-roles`, or automatic Vault/config synchronization. Never edit applied SQL.
The fixed-password local account seed stays local. Production receives no test data.
Ledger checks verify versions, not remote SQL checksums: immutable local hashes and
independent review protect canonical SQL.

## Owner setup before activation

The user authorized switching `gh` to the already signed-in owner account.
Admin access was verified and used to configure review protection and environments.
Production has only the owner reviewer, self-review prevention, administrator bypass
disabled and main-only deployment. Staging/previews are main-only. Target variables
are recorded; all activation flags are false. No credentials were copied.
No paid plan or visibility change is included; the server repository is public.

1. Independently review the CI PR. Repair the existing validation baseline below
   through reviewed PRs; do not waive tests to enable release.
2. Main now requires independent review, stale approval dismissal, code-owner review,
   approval of the latest push, resolved conversations and linear history, including
   administrators; force pushes/deletion are disabled. After this workflow is merged,
   require up-to-date branches and GitHub Actions checks `Database validation` and
   `Server tests` (App ID `15368`). They are deliberately not required before their
   workflow exists on main, which would deadlock separate remediation PRs. Production
   preflight refuses release until both requirements are armed and tests pass.
   It also verifies @lumbinitechnologies approved the exact merged PR head.
3. The environments below have **main-only deployment branch policies**.
   For production select **only @lumbinitechnologies** as required reviewer,
   **Prevent self-review**, and disable administrator bypass. Keane dispatches;
   the owner approves after tests. Existing unprotected `Production` environments
   do not meet this requirement.
4. Add `GH_POLICY_READ_TOKEN` to **skillarc-policy** and **skillarc-staging**:
   an expiring fine-grained token for
   this repository only, **Administration: read**, **Actions: read**, and
   required metadata. It reads protection settings only in trusted-main steps.
   `GITHUB_TOKEN` cannot request Administration permission; do not substitute it
   for this policy metadata check or grant write access. Never store it as a
   repository secret: main-only environments keep it out of same-repository PR jobs.
5. Enter secrets directly in protected environment settings, never chat/issues/
   committed files/logs. Use separate Supabase tokens with the narrowest available
   scope per job and expiring team-scoped Vercel credentials. Branch creation may
   need organization permission: isolate that credential from production jobs.

| Environment | Secrets | Variables |
| --- | --- | --- |
| `skillarc-policy` | Read-only `GH_POLICY_READ_TOKEN` | No deployment credentials; production preflight uses this main-only environment before requesting release approval |
| `skillarc-staging` | Staging `SUPABASE_ACCESS_TOKEN`, read-only `GH_POLICY_READ_TOKEN` | `SUPABASE_PROJECT_ID=sjyotfnhdfmjkulyssps`; `STAGING_RELEASE_ENABLED=true` and `VERCEL_MIGRATION_GATE_CONFIGURED=true` only after step 6 |
| `skillarc-previews` | `SUPABASE_ACCESS_TOKEN` allowed to create/delete staging branches | No production credentials |
| `skillarc-production` | Production `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET` when protection requires it | `SUPABASE_PROJECT_ID=fvkvfcsqetdxtoosmizq`, `VERCEL_ORG_ID=team_Aaz7lak1klst5hnFKJxCcG6G`, `VERCEL_PROJECT_ID=prj_YeaRlzqqi27AlwiCs87G6wD28bqf`; `PRODUCTION_RELEASE_ENABLED=true` only after configuration |

6. In existing Vercel **skillarc** → Settings → Build and Deployment → Deployment
   Checks, require GitHub check **`Migrate staging`** for production deployments.
   This is now configured via the official v2 Checks API: check
   `chk_676a7e68-62e2-411e-98cf-a650f1a3f789`, source GitHub `Migrate staging`,
   target `production`, blocks `deployment-alias`, no prerequisite build event.
   Keep automatic domain assignment enabled; that check must hold domains until
   migrations for the **same commit** succeed. Rehearse a failure holding a build
   and success releasing it. The flag is owner attestation, not an API check of
   Vercel settings. Until configured, the existing Git integration can deploy
   independently: do not merge readers of unapplied schema. Never Force Promote
   a failed check. Then enable the staging flags.
7. Configure the new Vercel production application's production environment directly
   in Vercel using its own Supabase URL, publishable key, server credentials and
   required services. Verify no staging references. Configure Auth redirects and
   Storage deliberately. Keep this project Git-unlinked; the approved workflow
   alone stages/promotes it. All readiness checks block its first release.
8. Set repository variable **`PREVIEWS_ENABLED=true`** after preview credentials and
   cleanup are configured. Repository scope prevents disabled scheduled-job noise.
   Keep scheduled Actions enabled and monitor cleanup failures and actual usage.

Token creation must use [GitHub fine-grained token settings](https://github.com/settings/personal-access-tokens/new),
[Supabase access-token settings](https://supabase.com/dashboard/account/tokens), and
[Vercel token settings](https://vercel.com/account/settings/tokens) when the connected
app cannot mint a token. Choose an expiry (90 days is a reasonable starting point)
and record renewal ownership. `gh secret set --env <environment>` accepts a token
through stdin and encrypts it before upload; never use a token in a command argument.
Do not repurpose broad personal CLI login credentials as CI secrets.

Staging and production Supabase tokens each need Database and Migrations read/write
for their own project only. Preview operations additionally need Development Branches
read/write and Action Runs read for staging and newly created owned branches. Verify
that the chosen scope covers those fresh branches **and denies production SQL** before
enabling previews. If that cannot be expressed with the available scoped-token grants,
keep previews disabled and review a separate preview access boundary; do not silently
grant organization-wide database writes that include production.

Owner settings: [environments](https://github.com/lumbinitechnologies/skillarc/settings/environments),
[branches](https://github.com/lumbinitechnologies/skillarc/settings/branches),
[Actions secrets](https://github.com/lumbinitechnologies/skillarc/settings/secrets/actions).

## Delivery flows

**PR:** no hosted secrets. Fresh local Supabase replays the complete canonical
history with seeds disabled. Verify ledger/core schema and zero Auth accounts,
run database tests and strict database lint. Separately install locked dependencies,
typecheck and run every discovered source/script test, including model smoke.
History guards reject edits/deletions of reviewed migrations. PR scripts never
execute with hosted credentials.

**Staging:** current-main reviewed merge passes both validation jobs. Serialized
`Migrate staging` verifies independent review/protection and migrates only staging.
The Vercel same-commit check releases its matching app afterwards. Failures leave
the previous app on its domains. Vercel preview deployments are not covered by that
production-domain gate: do not assume they have new schema.

**Production:** Keane dispatches `Approved production release` on main with the
full reviewed merge SHA that passed the push-to-main staging workflow. Verification
checks ancestry/review/staging success and owner-only environment protection. Full
repository lint, typecheck, all discovered tests, complete database replay/tests/
lint and strict security advisors run **before requesting owner approval**. Failure
stops release. The approval job displays the exact SHA.

After approval: build that exact version with production configuration → stage
`--prebuilt --prod --skip-domain` → check/apply production migrations → verify
deployment team/project/SHA and HTTP boundary → promote the **same** build.
Pulled secret configuration stays on an ephemeral runner, is removed in cleanup
and never uploaded as artifacts. HTTP smoke checks unauthenticated `/me` behavior;
it is not full user-journey evidence or a substitute for feature tests.
There is no automatic production push trigger. Dispatch is not approval.

## Preview lifetime and cost

Successful PR CI triggers trusted-main automation only for same-repository Keane
PRs adding SQL migrations. Only SQL is copied as data; PR scripts are never checked
out/executed with secrets. Each fresh branch (`with_data=false`) gets canonical
migrations plus trusted `supabase/preview-fixtures.sql`: one synthetic organization,
two institutions and **zero Auth accounts**. These are not usable login credentials.
No automatic binding to Vercel PR apps is included; their database environment
must not be described as isolated by this change.

Names: `skillarc-ci-pr-<PR>-<head-prefix>`. Reuse the same head before expiry;
delete old-head replacements; at most two owned previews coexist. Cleanup selects
only exact owned names, staging parent, non-default/non-persistent branches.
PR close also cleans up. Recreate with `Isolated database previews` → Run workflow
→ action `create`, PR number. Manual creation still verifies PR identity/history;
it does not release an application.

Expiry is two hours **from creation**. Five-minute scheduled cleanup is best-effort;
GitHub can delay schedules or disable them after inactivity. This is not a hard
shutdown or spend cap. Use workflow action `cleanup` or delete the exact owned
preview if cleanup fails. Never reset/delete staging or production for cleanup.

Approved quote: production approximately **$10/month**, previews **$0.01344/hour**,
additional usage possible. Partial compute hours round up:

| Usage | Ideal compute | Small cleanup delay past expiry |
| --- | --- | --- |
| One 2-hour preview | $0.02688 | 3 hours: $0.04032 |
| One 6-hour preview | $0.08064 | 7 hours: $0.09408 |
| Three 2-hour recreations | $0.08064 | Up to 9 hours: $0.12096 |

No separate creation fee was quoted. Two hours reduces idle cost for short
sessions; it is not universally cheaper. Retaining one six-hour preview may cost
less for frequent active sessions. Review measured usage before changing TTL.

## Verification and blockers

Rehearsal at base `59763dbac84885610876cbcffbca597e6d507723`:

- All 15 canonical migrations replayed in fresh local Supabase without seeds;
  ledger/core schema verified; zero Auth accounts.
- Strict DB lint then failed on existing `delete_institution_cascade` referencing
  missing `knowledge_document_chunks` (42P01) and `admissions_convert_to_enrolment`
  with an invalid ON CONFLICT target (42P10). Fix using new migrations, not edits.
- Existing test failures: `src/lib/academic-context.test.ts` expects 2500/12 bounds,
  implementation exposes 5000/20; `src/lib/assistant/workflows.test.ts` expects a
  smaller faculty route list. Review intended behavior before changing assertions.
- Full lint previously reported 2,020 errors and 765 warnings, including nested
  worktrees/vendor material and Tailwind parsing. No blanket suppression added.
- [Reconciliation findings](MIGRATION_RECONCILIATION.md) also record exposed-table
  RLS and SECURITY DEFINER risks. Strict production advisors remain mandatory;
  this work does not claim them fixed or the baseline safe for real data.
- A disposable hosted preview replayed all 15 migrations and synthetic fixtures:
  one organization, two institutions, zero Auth accounts. Deleted after rehearsal.
- Policy tests, focused script lint, workflow syntax and typecheck are distinct
  from failing full validation. No protected Actions release has run yet.
- Hosted Actions PR validation reproduced the same two server test failures and
  two database lint errors. Replay/guards/typecheck passed before those failures.
  The Supabase plugin can manage the provisioned project but exposes no personal
  access token creation tool. Vercel's plugin returns a team-scope 403, while CLI
  project/check management works but token creation returns `Cannot create tokens
  for this app` (403). No broad cached login token was copied into CI.

Server #67 tracks validation/security remediation. Do not mark production Ready until it, remaining setup
and controlled workflow rehearsal pass. PR #65 remains a separate reviewed
timezone migration dependency; neither staging nor production received it here.

## Failure and recovery

Use additive, backward-compatible migrations first so the old app works through
migration/promotion failure. Remove schema only in a later reviewed release after
all readers upgrade. Failed migration/smoke prevents promotion. The DB can be ahead
of the app; inspect ledger and statement effects before retrying. Multi-file pushes
are not one atomic release. Never auto-repair history, edit applied SQL or run a
destructive down migration. Prefer reviewed forward correction. App rollback must
remain compatible with the applied schema. Rehearse restore before onboarding.

Sources: [Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments),
[CLI workflows](https://supabase.com/docs/guides/local-development/cli-workflows),
[branch usage](https://supabase.com/docs/guides/platform/manage-your-usage/branching),
[compute rounding](https://supabase.com/docs/guides/platform/manage-your-usage/compute),
[Vercel checks](https://vercel.com/docs/deployment-checks),
[GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
