# Database and application delivery

Owner: Keane. Server issue #66 / PR #68; mobile issue #55. GitHub Projects is the only active tracker. This replaces the earlier two-project deployment design. It does not deliver mobile v1 features or establish client readiness.

## Target architecture

| Use | Git branches (both repositories) | Database | Website / Android |
| --- | --- | --- | --- |
| Local development | feature from staging | disposable local, synthetic | local app/dev variant |
| Shared staging | staging | persistent staging child | staging.theskillarc.com / staging APK |
| PR | target staging | owned temporary direct child of parent | matched isolated preview |
| Production | main | clean parent's default database | current production domains / signed client APK |

Active Supabase parent: `fvkvfcsqetdxtoosmizq`, organization `ssuwihnqhpwltrscmsmf`, Singapore. A branch is an isolated database instance with its own Auth/API keys, not another permanent parent project. `config/deployment-targets.json` is the reviewed allowlist. Staging is deliberately **null**, not a guessed reference, until provisioned after the cost proposal approval. All activation switches remain false; runners require both reviewed registry activation and the matching GitHub environment flag.

Existing Vercel project: `prj_qF0sUZ0vnVS0pTLpnPELUusGnNaE` (`skillarc`), team `team_Aaz7lak1klst5hnFKJxCcG6G`. Production and staging use this same project. Keep the extra `skillarc-production` Vercel project unused. Do not delete it implicitly.

Legacy Supabase `sjyotfnhdfmjkulyssps` and its records remain untouched fallback; migration and fixture runners reject it. Current serving website/mobile development settings remain legacy until replacement staging is populated and verified. No domains or existing EAS public settings are switched as part of bootstrap. No test account is copied into the clean parent.

GitHub Actions is the sole orchestrator. `vercel.json` disables competing Git deployments when this configuration is merged. Before merge, review the cutover impact: it stops new automatic Git deployments, not the currently serving website. Keep Supabase native GitHub migration/branch deployment disconnected; never use native merge/rebase as an additional production migration owner.

## Implemented bootstrap and remaining activation gates

### Current branch and hosting state — verified 2026-11-02

- Server `main` is `28f6dd6`; server `staging` is `59763db` from the merged #63 contract proposal and is an ancestor of `main`, not current with it. After the server repair/bootstrap changes merge, synchronize server `staging` from the resulting `main` through a reviewed PR before staging releases.
- GitHub reports server `main` and `staging` as protected, but required status checks are off with no required contexts. This connection cannot read the detailed protection rules, so required reviews, admin bypass and environment reviewers still need owner verification. Do not treat branch protection or green checks as enforced until verified.
- Mobile `main` is `f2ecd96`; mobile `staging` is `c23d76e`, containing merged PR #56. Mobile staging protection remains deferred by the owner; keep the repository private and do not purchase an upgrade.
- The clean Supabase parent `fvkvfcsqetdxtoosmizq` is healthy and has no branches. No persistent staging database branch, PR preview database, hosted migration or production record change exists. `staging.projectRef` and all deployment activation flags remain unset/false.
- PR #68 sets `git.deploymentEnabled: false` in the existing Vercel project. If merged, this pauses new automatic Git deployments on every branch, including PR previews and production pushes, while the currently serving deployment remains live. The Actions staging, PR-preview and production paths also remain disabled until their targets, scoped credentials, protections and evidence are verified. This is an intentional deployment freeze during cutover; no staging release is implied.

### Remaining activation gates

- #68 remains a main-targeted bootstrap PR. After independent review/merge, open a reviewed bootstrap PR bringing current `main` into `staging`. Subsequent feature PRs target staging. Never silently fast-forward the server staging branch around review.
- Infrastructure stays disabled pending independent review/merge of #70, #74, #75 and #68; verified environment protections and scoped credentials; a provisioned isolated staging branch; approval for any outstanding Vercel/staging costs; and complete fixture, preview, browser and Android evidence. Existing legacy Vercel check named `Migrate staging` must be removed/replaced during cutover; it targets production incorrectly under the old design.
- GitHub environment names are referenced by the workflows, but their current protection rules, reviewers and secret values are not verified by this connection. The owner must verify them directly before any activation.
## CI and release order

Feature PRs and pushes to main/staging run full root lint/typecheck/tests plus immutable migration history checks, fresh local replay and fixture SQL replay. Existing #67 failures stay visible. No automatic repair, hosted reset, `--include-seed` or seed on production.

Staging: reviewed staging merge → passing full checks → verify branch ownership/persistence and ledger → dry run/apply migrations → supported Auth fixture administration and login/profile checks → build with matching staging API/Auth/DB settings → deploy custom staging environment → app-auth smoke. Independent browser/Android journey and cross-tenant evidence is additionally required before activation; schema success alone never establishes useful staging.

Production: reviewed staging-to-main merge → verify latest main, independent current-head review, strict branch checks, staging run including a genuinely successful staging deployment job → require exact promotion parent/tree identity → full checks/security on the exact production SHA → verify successful private Android candidate metadata → build/stage website without assigning production domains → owner approval in public server environment → recheck unchanged server/mobile heads and mobile digest → migrate production → smoke/verify the exact production deployment → promote.

`config/launch-readiness.json` blocks all launch candidates until complete approved student/faculty v1, security, staging journeys, synthetic recovery rehearsal, zero production fixtures and commercial hosting have reviewed evidence. Do not flip it to claim future work is shipped. #22 alone is insufficient. iOS remains deferred in #39. No unchanged authentication regression repetition is required; test the changed environment/session boundaries.

Mobile candidate records are read from private `android-candidate-record` Actions artifacts using a read-only mobile credential. They bind successful CI run, main SHA, production profile, EAS build ID, APK SHA256 and device-evidence comment. APK/source stay private. The public gate authorizes distribution metadata, not public APK upload. Missing records or stale heads fail closed. The candidate job creates a whole-release record binding this metadata, exact website URL, staging evidence and migration digest. The owner approves its digest; after approval the record is recomputed and must match. Successful promotion publishes metadata-only release authorization; APK/source remain private. These paths still need hosted rehearsal before activation.

## Synthetic fixtures

`scripts/fixtures/academic.mjs` defines versioned India and synthetic Sydney organizations, student/faculty/admin accounts, empty/withdrawn cases, enrolled units, courses, static/multiweek timetables, a closure, regular/quiz/coding tasks, submission, content metadata, attendance, leave and results. It uses fixture-owned IDs and non-destructive conflict handling; refreshes only owned date fields. Timezones are explicit; Sydney is **not** the unknown real Australian campus. Existing timezone-less assignment timestamps are explicitly ambiguous; known-instant/overdue fixtures await the reviewed #55 deadline representation, not guessed UTC.

`scripts/ci/fixtures.mjs staging|preview` first verifies a live allowlisted child, rejects production/legacy, retrieves only that branch's Auth keys, provisions confirmed `.invalid` accounts using Auth Admin (no email invitations), and validates actual password login and linked role/profile reads. Existing fixture passwords are not rotated implicitly. `FIXTURE_PASSWORD` is a private protected-environment secret (minimum 20 chars); share credentials privately through an ignored owner-local `.local/fixture-credentials.json`, never in issues/PRs/artifacts. Local fixture SQL replay uses disposable Auth identities without passwords; it is not a hosted login test.

Coverage and readiness limitations are explicit in [fixture coverage](FIXTURE_COVERAGE.md): resource fixture URLs are intentionally unavailable examples; actual owned downloadable files, supported wider website workflow samples, known-deadline contract fixtures and authenticated browser/Android journeys must be added and verified before environments are declared ready. Do not expose placeholder links as working journeys. No outbound payments, real notifications, email or production records. Configure branch integrations in sandbox/simulated mode before any hosted fixture run.

Temporary PR databases are direct children of the active parent, data-less, with the complete trusted staging/PR migration chain. They never branch from staging. The runner does not execute PR scripts locally with hosted credentials. It fetches SQL as data; immutable trusted history must match. Native initialization may replay the parent's migration prefix; ledger drift is rejected rather than repaired. Only server/database PRs qualify. Two-hour expiry, PR-close cleanup, recreation and max two owned previews are retained. Cleanup runs every five minutes, best-effort, not a billing cap. The preview runner binds branch-specific encrypted Vercel preview settings to the exact PR SHA, refuses inherited unrelated preview credentials, verifies deployment identity, and exercises synthetic Auth → /me identity. It removes only owned preview variables/deployments on expiry. Protected-preview bypass stays in trusted CI only, never in mobile. These paths require hosted rehearsal; previews stay disabled until their end-to-end test is complete.

## Credentials and environment configuration

Never copy the broad gh CLI OAuth credential into CI. Plugins/CLI sessions cannot mint the required scoped PATs; owner-authenticated account settings must create them. Do not paste tokens in chat. Use `gh secret set --env <name>` with stdin/private input after creation. No credential values are printed or committed.

| Environment | Allowed workflow refs | Credentials / variables |
| --- | --- | --- |
| skillarc-policy | main only | GH_POLICY_READ_TOKEN (server Administration read, Actions read, metadata); GH_MOBILE_READ_TOKEN (private mobile Actions/contents read only) |
| skillarc-staging | staging only | branch-scoped Supabase token, FIXTURE_PASSWORD, project/team IDs, Vercel token; STAGING_RELEASE_ENABLED=false |
| skillarc-previews | trusted main workflows only | preview-only Supabase token, FIXTURE_PASSWORD, Vercel token and optional CI-only VERCEL_PREVIEW_BYPASS_SECRET; repo PREVIEWS_ENABLED=false; no production write scope |
| skillarc-candidates | main only | existing Vercel project IDs/token, read-only GH_MOBILE_READ_TOKEN, production ref variable; PRODUCTION_RELEASE_ENABLED=false; no Supabase write token |
| skillarc-production | main only + human owner review | production-only Supabase token, Vercel token/IDs; read-only policy/mobile verifier tokens for post-approval recheck; PRODUCTION_RELEASE_ENABLED=false |

Scope Supabase PATs to exact parent/branch operations, with API-key/Auth administration only where fixtures need them. Verify preview credentials cannot query/write production. If provider scoping cannot prevent it, do not enable the job; do not replace it with an organization-wide database-write credential. Do not expose candidate/production keys to PR workflows. Never embed infrastructure bypass secrets in APKs.

Vercel development staging uses Preview on the existing project. Assign staging.theskillarc.com to the staging Preview branch and configure its Preview variables for the isolated Supabase branch and sandbox services. The workflow pulls variables for staging, builds and deploys a Preview after database readiness, and checks the deployment's project, team, branch, and revision before setting the staging alias. It verifies the alias before and after the app-auth smoke check. Keep Git-triggered deployments disabled so the reviewed workflow controls the order.

## Activation checklist and recovery

1. Independent review/merge bootstrap PRs; synchronize staging through reviewed PRs; keep flags off.
2. Resolve #67 using focused reviewed follow-up PRs (no applied baseline edits). At inspection: 2 database lint function failures, 2 server contract failures, root lint and exposed-schema security findings. Rerun all checks; don't suppress or waive them.
3. CEO approves final costs; owner provisions scoped credentials. Create persistent staging directly under clean parent without data, record verified reference, review registry change. No production migration or legacy mutation.
4. Complete fixture coverage, isolated preview app binding, whole-release record/authorization, protected APK candidate build and authenticated staging/browser/Android evidence. Only then declare environments usable and change existing development/EAS settings away from legacy.
5. Arm exact registered passing required checks on server main/staging (Database validation, Server tests, governance/review-policy); retain owner review/admin enforcement. Mobile enforcement remains deferred and must be acknowledged in launch sign-off.
6. Rehearse migrations, release, restore and rollback with synthetic data. Record incident runbook evidence and realistic recovery objectives. Approve exact production migration/app pair; never silently run it from implementation work.

If migration fails, leave existing aliases/APK authorization unchanged; investigate ledger without repair. If app smoke fails after an additive migration, retain schema compatibility and previous website/APK. Roll back the application to the previously verified production deployment; never automatically down-migrate or delete data. Restore only into an isolated synthetic recovery environment for rehearsal. Real restoration, legacy/extra-resource cleanup or destructive operations need a separate explicit request.

## Cost proposal

[Editable CEO proposal](proposals/SkillArc-delivery-approval.docx) and [PDF](proposals/SkillArc-delivery-approval.pdf). One Vercel paid deploying seat ($20/month list, including usage credit) and free viewers; viewers cannot deploy. Further deploying seats cost extra. Server is currently public/personally owned; don't conflate that with private organization repository rules. Account checkout/taxes require owner confirmation before purchase. GitHub upgrade is deferred. Retained legacy compute continues to cost money; branch expiry is not a hard spend cap.

Official references: [Supabase branches](https://supabase.com/docs/guides/deployment/branching), [compute](https://supabase.com/docs/guides/platform/manage-your-usage/compute), [Vercel Pro](https://vercel.com/docs/plans/pro-plan), [Vercel Git collaboration](https://vercel.com/docs/git), [Vercel Git deployment configuration](https://vercel.com/docs/project-configuration/git-configuration), [GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
