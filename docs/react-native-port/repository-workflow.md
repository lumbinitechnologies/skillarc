# Mobile repository workflow

The public [SkillArc Mobile R1 Project](https://github.com/users/lumbinitechnologies/projects/1) contains only public mobile issues and PRs. `@keanesc` is its admin and sole developer; `@lumbinitechnologies` owns the Project and independently reviews Keane's PRs. Statuses are Backlog, Ready, In Progress, Review, Blocked and Done. Area is Platform, Identity, Student, Faculty, Parent or Quality; Priority is P0, P1 or P2. Iterations W01–W06 start 7 October, one week apart. The This Week, Backlog, Blocked and Review views filter by current iteration or matching status.

GitHub is the daily board until a Jira admin connects both repositories through [GitHub for Atlassian](https://marketplace.atlassian.com/apps/1219592/github-for-jira?tab=overview). Each active issue has one Jira key, Keane as assignee, acceptance criteria and contract dependencies. Put that key in branch names, commits and PR titles. Keane updates Jira at sprint review.

## Branches and review

Start each issue branch from `main`, for example `keane-SCRUM-47-staging-builds`. Open a draft PR linked to its GitHub issue; rebase on current `main`, then squash merge after green checks and independent owner approval. Use `git push --force-with-lease` only on your own rebased branch. Delete the merged branch. There is no permanent mobile `develop` branch. Start hotfixes from `main` with the same checks and approval, then rebase open branches. Tag reviewed `main` commits for release builds.

The PR template requires the Jira key, linked issue, AI-use declaration, tests and Android/iOS evidence. The trusted-base review policy rejects human authors other than Keane, rejects missing Jira/issue links, and requires `@lumbinitechnologies` approval for Keane PRs. Dependabot has a narrow exception and requires Keane's review. CI checks formatting, lint, strict TypeScript, behavior and policy tests, API generation, import boundaries, Expo health, and Android/iOS Metro exports. Device tests remain a separate acceptance gate.

## Main protection rollout

1. Get independent owner review and merge [setup PR #18](https://github.com/lumbinitechnologies/skillarc-mobile/pull/18) after CI passes.
2. Test `governance/review-policy` on a fresh PR against `main`, including a missing owner approval. Verify a missing check or unresolved conversation blocks merge.
3. Enable `protect-main`: PRs, squash merges, required `checks` and `governance/review-policy`, CODEOWNER approval, resolved conversations, linear history, and no force pushes or deletion. Enable available security alerts.

This order matters because the review-policy workflow is introduced by PR #18. The private SkillArc repository cannot use GitHub Free rulesets on its current plan; its server work still needs lead-controlled review.
