# Mobile repository workflow

The [SkillArc Mobile R1 Project](https://github.com/users/lumbinitechnologies/projects/1) tracks mobile and server issues/PRs; access to private content remains restricted. `@keanesc` is its admin and sole developer; `@lumbinitechnologies` owns the Project and independently reviews Keane's PRs. Statuses are Backlog, Ready, In Progress, Review, Blocked and Done. Area is Platform, Identity, Student, Faculty, Parent or Quality; Priority is P0, P1 or P2. Old W01–W06 iteration values are historical; delivery advances by dependencies, not a fixed schedule. The Ready, Backlog, Blocked and Review views show current actionable work.

GitHub Projects is the sole active tracker. Each active item has a Keane-assigned GitHub issue, acceptance criteria, scope workflow and contract dependencies. Jira links and old iterations remain historical; new tasks have plain-language titles without SCRUM prefixes. The Project is private as verified on 16 October 2026; do not change its visibility.

## Branches and review

Start from current `main`, e.g. `keane-22-student-academics`. Keep one issue per PR and use `GitHub issue: #<number>` in its body. Link server dependencies explicitly. Rebase before independent review and use force-with-lease only on your own branch. Squash merge only after green checks and independent approval; preserve existing branch protection and contributor boundaries.

The transition PR uses mobile #9 and legacy SCRUM-44 to pass the old policy on protected base code. After that merges, the policy accepts plain-language and legacy titles, requires a real linked GitHub issue assigned to Keane, and retains the author/reviewer checks and narrow Dependabot exception. Verify the rollout using a real plain-language PR after merge; do not bypass protection or impersonate the independent reviewer.

CI checks formatting, lint, types, behavior/policy tests, API generation, source boundaries, Expo health and Android/iOS exports. Device verification is separate. Documentation-only work needs link/content review; changed screens need platform-specific evidence, with iOS deferral tracked in #39.

## Main protection history and current limitation

[Setup PR #18](https://github.com/lumbinitechnologies/skillarc-mobile/pull/18) passed CI and merged after independent owner review. [Hotfix PR #36](https://github.com/lumbinitechnologies/skillarc-mobile/pull/36) showed `governance/review-policy` fail without owner approval, pass after approval, and allow a squash merge. [Disposable PR #37](https://github.com/lumbinitechnologies/skillarc-mobile/pull/37) stayed blocked when checks were pending and after CI passed without approval; it was closed without merging.

Historical verification (October 2026, before the current visibility check): `protect-main` was active with required `checks` and `governance/review-policy`, CODEOWNER approval, stale-review dismissal, resolved conversations, linear history, squash-only merging, no force pushes or deletion, and no bypass actors. The unresolved-conversation setting was verified from the ruleset configuration; no review thread was created solely for a probe. Dependency alerts, Dependabot security updates, secret scanning and push protection are enabled.

The private SkillArc repository cannot use GitHub Free rulesets on its current plan; its server work still needs lead-controlled review.

Current verification on 16 October 2026: the mobile repository and Project are private. The mobile rulesets API returned 403 (upgrade or public repository required), and main branch protection returned 404. Enforceable protection cannot currently be confirmed; do not describe the historical ruleset as active. Keep manual independent review and green-check requirements while a separate GitHub readiness issue resolves plan/visibility support. Do not change visibility or purchase a plan without owner authorization.
