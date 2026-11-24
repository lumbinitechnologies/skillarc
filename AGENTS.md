<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SkillArc agent instructions

## Issue and handoff

- For delivery work, follow [CONTRIBUTING.md](CONTRIBUTING.md). Read the GitHub issue, latest decisions, linked PRs and applicable contract before editing. Confirm the user outcome, scope, issue owner and acceptance evidence. Check the server author and review requirements before publishing.
- For server/mobile work, link both issues and use the [canonical OpenAPI](contracts/mobile-v1.openapi.yaml) and [synthetic examples](docs/react-native-port/contracts/student-academic-examples.json) to agree on behavior. Surface disagreements about user behavior, ownership or scope to the humans.
- Record confirmed decisions and rationale in the issue and verification in the PR. Link the exact revision, distinguish local/CI/merged/staging evidence, and leave the next owner and action. Report meaningful progress and blockers in the active chat. Continue authorized work to the agreed endpoint.

## Development

- For web UI work, read [design guidance](docs/ui-guidance.md) and extend the existing components and styles.
- For database changes and releases, follow [database delivery](docs/DATABASE_DELIVERY.md). Use synthetic data and keep credentials private. Preserve scoped authorization, applied migrations and release approval gates.
- Run `npm run lint`, `npm run typecheck` and `node scripts/ci/server-tests.mjs` for server changes. Use the existing CI checks for database and deployment changes. Fix the underlying problem when checks fail and report unrelated baseline failures with evidence.
