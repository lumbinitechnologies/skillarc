# SkillArc mobile release 1

**Status:** Delivery setup in progress. The [Expo repository](https://github.com/lumbinitechnologies/skillarc-mobile) exists; the six one-week sprints target an **internal release candidate on 10 November 2026**, subject to the release gates.

| Read this | For |
| --- | --- |
| [Release scope](release-1.md) | Student, parent, and faculty workflows and deferrals. |
| [Architecture](architecture.md) | API boundary, authentication, and test environments. |
| [Delivery](delivery.md) | Group ownership, sprint dates, dependencies, and Jira keys. |
| [Repository workflow](repository-workflow.md) | GitHub Project, branches, reviews, and CI. |
| [Web audit](reference/feature-inventory.md) and [route catalog](reference/route-catalog.md) | Source evidence for later ports, not release commitments. |

## Decisions

- Keane directly leads **all eight three-person intern groups** and Sai Kiran's separate solo workstream. Nikhil primarily owns SkillArc server implementation. Interns contribute only to the public mobile repository.
- Keane owns Expo/EAS configuration, Supabase integration, authentication, generated API transport, and final intern PR review. Interns build React Native screens and tests within their assigned areas.
- Keep official calculations, authorization, database access, and privileged writes in SkillArc. Mobile uses versioned `/api/mobile/v1` contracts. The first implemented operation is `GET /api/mobile/v1/me` in [the OpenAPI contract](../../contracts/mobile-v1.openapi.yaml).
- Protect mobile `main`. Use short-lived Jira-key branches, rebase onto `main`, and squash merge reviewed PRs. Test against a persistent synthetic-data Supabase preview branch and a stable SkillArc Vercel preview URL.

## Immediate work

1. At the 29 September kickoff, Keane and the captains confirm all 24 GitHub handles, eight captains, ownership, W01 GitHub issues, and each group's first device demo.
2. Finish mobile CI, CODEOWNERS, and a fork test PR before the repository owner enables `protect-main`. The `@lumbinitechnologies` account must perform owner-only settings.
3. Keane publishes reviewed contracts and fixtures. Groups begin with fixture-backed UI, then integrate after server role/tenant tests pass.
4. A feature is Done only after Keane approves its PR, CI passes, and Android/iOS evidence covers success, loading, empty, error, expired-session, and poor-network states. Writes also need duplicate/retry tests.
