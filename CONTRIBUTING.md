# SkillArc delivery

GitHub Projects is the active tracker; Jira keys remain historical. Start from a Keane-assigned issue with acceptance criteria, dependencies and verification requirements. Keane owns delivery. Other server contributors work only on explicitly assigned approved tasks.

Feature branches start from current `staging`, use `keane-<issue>-<description>` for Keane, and open one issue per PR targeting staging. New titles use plain language; historical SCRUM titles remain accepted. Link `GitHub issue: #<number>` in the PR body. Independent review by @lumbinitechnologies must approve the latest head, with resolved conversations and all required checks. Never approve your own PR through an owner account. Squash feature PRs.

Release PRs promote `staging` to `main`, link one release issue listing included work and evidence, and use merge commits to preserve ancestry. Production candidate trees must match the tested staging tree. Hotfixes branch `keane-hotfix-<issue>-<description>` from main, receive the same checks/review, then immediately return through a reviewed merge into staging. Production promotion still requires a staging-tested candidate.

Trusted review workflows execute protected base code, never PR scripts with write tokens. Dependabot's narrow issue exception allows manifests, lockfiles and workflow action-version updates only, with Keane's latest-head approval. Do not widen this exception.

Run root lint, typecheck, all discovered tests, migration-history guards, full local migration replay, database tests/lint and security advisors as applicable. Record existing failures honestly; issue #67 blocks activation until resolved. No edits to applied baseline SQL, automatic history repair, hosted reset or production seed.

See [database delivery](docs/DATABASE_DELIVERY.md). One active Supabase parent, isolated staging/PR branches and one existing Vercel project. Production requires passing checks and a human owner approval binding the exact website and signed Android candidate. Mobile source, signing secrets and APKs stay private. No new integration, secret, purchase, resource retirement or production release is implied by a passing PR.
