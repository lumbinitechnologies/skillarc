# GitHub workflow and quality controls

**Audience:** Keane and repository maintainers. Intern instructions live in mobile `CONTRIBUTING.md`. GitHub identifies `lumbinitechnologies` as a **user account**, not an organization. `keanesc` has repository write access; `@lumbinitechnologies` is the independent owner/reviewer.

## Tracking before Jira integration

Create one **public user-level Project**, `SkillArc Mobile R1`, under `lumbinitechnologies`, then grant `keanesc` admin access. Use weekly W01–W06 iterations from [delivery](delivery.md), Group values G1–G8/Solo/Backend, and statuses `Backlog`, `Ready`, `In Progress`, `Review`, `Blocked`, `Done`. Add current-sprint, group, and review-queue views. The owner must create/grant access; `keanesc` needs the GitHub CLI `project` scope to edit it.

**Owner handoff:** `keanesc` now has the `project` scope, but GitHub rejected `gh project create --owner lumbinitechnologies` because he cannot create a Project under that user account. The `@lumbinitechnologies` operator should run `gh project create --owner lumbinitechnologies --title 'SkillArc Mobile R1'`, set visibility to public, grant `keanesc` admin, then add the six one-week iterations starting 30 September in the Project UI. Configure the Group and Status fields and the three views there; Keane can then add issues #1–#17 and manage the board with `gh project item-add` or the UI.

Each W01/W02 Jira group task gets a complete intern-facing GitHub issue with Jira key/URL, `mobile-gN` and `mobile-wNN` labels, captain, allowed paths, API dependency, acceptance criteria and device evidence. GitHub is the daily board; Keane updates Jira at Tuesday review. Later, a Jira site admin and GitHub account owner connect **both** repos via [GitHub for Atlassian](https://marketplace.atlassian.com/apps/1219592/github-for-jira?tab=overview). Put Jira keys in issue titles, branch names, commits and PR titles; verify one PR appears on its Jira issue. This does not give interns Jira access.

## Branches and reviews

| Work | Branch / merge rule |
| --- | --- |
| Intern feature | Fork mobile `main`; name a branch like `SCRUM-26-g1-shell`; open a draft PR early; rebase on current `main`; squash merge after CI and Keane review. |
| Keane maintenance | Name a branch like `keane-SCRUM-44-governance`; `@lumbinitechnologies` reviews the PR. |
| Hotfix | Branch `hotfix/SCRUM-KEY-short-description` from `main`; same CI/review; other branches rebase after merge. |
| Release | Tag a reviewed commit on mobile `main` after [release gates](release-1.md). No permanent mobile `develop` branch. |

Use `git push --force-with-lease` only on your **own rebased branch**, never `main` or another person's branch. One issue per PR; split cross-group changes unless the owning group and Keane review. Interns work via forks, so they need no repository write access. Captains provide peer review; Keane approves intern/Sai PRs. CODEOWNERS lists Keane and the independent owner globally so Keane's PRs can also receive valid approval.

## Required checks

On PRs and `main`: lockfile install, Prettier, ESLint, strict TypeScript, Jest with `jest-expo` and React Native Testing Library, generated-contract drift, forbidden server/web imports, `expo-doctor`, and Android/iOS Metro exports. A trusted-base review check verifies the linked issue/group, file boundary and correct human approval. It **never executes fork code with a write token**. No service keys or real student data go into CI or public fixtures.

Each feature PR declares AI use and human verification, test commands, and Android/iOS evidence for success/loading/empty/error/expired/poor-network states. Writes additionally show duplicate and retry handling. Green CI cannot replace device review. Expo SDK 57 uses the [Expo Jest setup](https://docs.expo.dev/develop/unit-testing/); tests remain outside Expo Router's `src/app`.

## Enable protection in order

1. Independently review and merge the initial [CI/CODEOWNERS PR](https://github.com/lumbinitechnologies/skillarc-mobile/pull/18). Disposable [fork PR #19](https://github.com/lumbinitechnologies/skillarc-mobile/pull/19) passed `checks` and was closed. Then confirm `governance/review-policy` on a new fork PR against `main`; verify wrong-group paths and missing Keane approval fail. GitHub has not yet installed the review workflow on the default branch, so the first fork probe could only test CI.
2. `@lumbinitechnologies` enables the existing disabled `protect-main` ruleset: PR, one CODEOWNER approval, stale-approval dismissal, resolved conversations, required `checks` and `governance/review-policy`, linear history, no deletion/force push, and squash merge. Disable direct merge commits and rebase merging in repo settings. Avoid routine bypass.
3. Verify missing check, unresolved thread and missing approval block merge. Enable available public-repo secret scanning, push protection and dependency alerts.

[GitHub Free rulesets apply to public repos](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets). The SkillArc repo is private and its ruleset API currently returns a GitHub Free upgrade error; use lead-controlled server PR review unless the account plan changes.
