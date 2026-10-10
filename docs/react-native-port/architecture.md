# Mobile architecture and environments

**Audience:** Keane and Nikhil. [Release scope](release-1.md) defines behavior; this guide defines the technical boundary. The canonical transport specification is [SkillArc's mobile OpenAPI file](../../contracts/mobile-v1.openapi.yaml).

```text
Expo app (Android/iOS)
  ├─ Keane-owned session, config and generated API client
  ├─ Keane-owned native features and typed view states
  └─ Bearer token → SkillArc /api/mobile/v1 → authorized logic → Supabase
```

## API and data ownership

- Keep one versioned `/api/mobile/v1` contract in SkillArc. Keane syncs a pinned reviewed OpenAPI snapshot into mobile; CI regenerates the client and fails on drift. A contract change starts in SkillArc. Do not import Next.js code or copy official calculations into Expo.
- `GET /api/mobile/v1/me` is the first implemented operation. The [web route catalog](reference/route-catalog.md) is **not** a list of mobile-ready APIs. Keane uses approved synthetic fixtures until the contract and handler pass tests.
- Each handler verifies the Supabase Bearer token, loads a trusted active profile and tenant, checks role, feature flag and object relationship, then performs scoped work. Never trust caller identity headers, `user_metadata.role`, or hidden navigation as authorization. Keep service-role, email, AI, cron and provider keys server-side.
- Server Actions and cookie-only web handlers are not native APIs. Preserve their validation and audit behavior. Version response/error shapes for app-store clients. Direct Supabase reads or Storage access require explicit RLS and tenant tests first; Keane owns any mobile Supabase client setup.

## Test environment

- The initial shared synthetic environment is the existing SkillArc Supabase project `sjyotfnhdfmjkulyssps`, served by **https://www.theskillarc.com** (the canonical destination of `https://theskillarc.com`). Keane approved this existing production-designated host while it contains synthetic data only. Supabase reports no separate preview branch; another paid branch is not a prerequisite.
- EAS project `39a579fe-c094-4804-92ce-c284dc5fae66` has matching public API origin, Supabase Auth URL and public key in its `development` and `preview` environments. The deployed web bundle and EAS use the same Auth project/key. Privileged keys stay server-side. The mobile repository documents `env:development`, `start:shared` and `staging:check` commands.
- Before real client data arrives, separate ongoing tests from the live client environment and resolve the existing access-control findings documented in [migration reconciliation](../MIGRATION_RECONCILIATION.md). This synthetic setup does not establish production authorization readiness.
- Canonical SQL is now tracked in `supabase/migrations`: 14 historical markers plus the verified complete hosted baseline. Original statements remain archived under `migrations/hosted-history`. A fresh local reset with synthetic seed passed; schema diff and the 12 custom Storage policies match the hosted environment; all 15 local/remote migration versions align. The old generated projection is no longer used.
- Expo/EAS builds and distributes the app. A development client still needs Metro; EAS values can supply Metro through `env:exec`. A standalone preview build bundles its JavaScript. No new native build is needed for this configuration-only change.
- `supabase/seed.sql` contains fixed **local-only** passwords. Disable that seed for a network-accessible branch; provision private synthetic accounts and the branch-specific Auth, Storage and server configuration separately.

## Contract test matrix

For every endpoint: unauthenticated, invalid and expired token; forged `x-user-*` headers; inactive account; wrong role/feature/tenant/object; unrelated child. For writes: duplicate request, retry, file size/type, concurrent edit and audit. Keane approves only after these and web regression checks pass.
