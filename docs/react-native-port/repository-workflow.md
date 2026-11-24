# Mobile repository workflow

The [SkillArc Mobile R1 Project](https://github.com/users/lumbinitechnologies/projects/1) tracks mobile work and its server dependencies. Keep the Project and linked repository content private. Use Ready, In Progress, Review, Blocked and Done to reflect the issue's state. Use Backlog for unscheduled work.

Follow the [server contribution guide](../../CONTRIBUTING.md) and the [mobile contribution guide](https://github.com/lumbinitechnologies/skillarc-mobile/blob/staging/CONTRIBUTING.md) for assignment, branches, review, and handoff. The two repos have distinct author requirements. Use the linked issue and PR to establish the task owner and next action.

## Main protection history and current limitation

[Setup PR #18](https://github.com/lumbinitechnologies/skillarc-mobile/pull/18) passed CI and merged after independent owner review. [Hotfix PR #36](https://github.com/lumbinitechnologies/skillarc-mobile/pull/36) showed `governance/review-policy` fail without owner approval, pass after approval, and allow a squash merge. [Disposable PR #37](https://github.com/lumbinitechnologies/skillarc-mobile/pull/37) stayed blocked when checks were pending and after CI passed without approval; it was closed without merging.

Historical verification (October 2026, before the current visibility check): `protect-main` was active with required `checks` and `governance/review-policy`, CODEOWNER approval, stale-review dismissal, resolved conversations, linear history, squash-only merging, no force pushes or deletion, and no bypass actors. The unresolved-conversation setting was verified from the ruleset configuration; no review thread was created solely for a probe. Dependency alerts, Dependabot security updates, secret scanning and push protection are enabled.

The private SkillArc repository cannot use GitHub Free rulesets on its current plan; its server work still needs lead-controlled review.

Current verification on 16 October 2026: the mobile repository and Project are private. The mobile rulesets API returned 403 (upgrade or public repository required), and main branch protection returned 404. Enforceable protection cannot currently be confirmed; do not describe the historical ruleset as active. Keep manual independent review and green-check requirements while a separate GitHub readiness issue resolves plan/visibility support. Do not change visibility or purchase a plan without owner authorization.
