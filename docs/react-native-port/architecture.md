# Mobile architecture and environments

**Audience:** Keane, Nikhil, and Sai Kiran. [Release scope](release-1.md) defines behavior; this guide defines the technical boundary. The canonical transport specification is [SkillArc's mobile OpenAPI file](../../contracts/mobile-v1.openapi.yaml).

```text
Expo app (Android/iOS)
  ├─ Keane-owned session, config and generated API client
  ├─ group-owned native features and typed view states
  └─ Bearer token → SkillArc /api/mobile/v1 → authorized logic → Supabase
```

## API and data ownership

- Keep one versioned `/api/mobile/v1` contract in SkillArc. Keane syncs a pinned reviewed OpenAPI snapshot into mobile; CI regenerates the client and fails on drift. A contract change starts in SkillArc. Do not import Next.js code or copy official calculations into Expo.
- `GET /api/mobile/v1/me` is the first implemented operation. The [web route catalog](reference/route-catalog.md) is **not** a list of mobile-ready APIs. Interns request missing operations and use approved synthetic fixtures until the contract and handler pass tests.
- Each handler verifies the Supabase Bearer token, loads a trusted active profile and tenant, checks role, feature flag and object relationship, then performs scoped work. Never trust caller identity headers, `user_metadata.role`, or hidden navigation as authorization. Keep service-role, email, AI, cron and provider keys server-side.
- Server Actions and cookie-only web handlers are not native APIs. Preserve their validation and audit behavior. Version response/error shapes for app-store clients. Direct Supabase reads or Storage access require explicit RLS and tenant tests first; Keane owns any mobile Supabase client setup.

## Test environment

- Use **one persistent Supabase Pro preview branch** with synthetic data. Mobile PRs share it. Keane may enable ephemeral branches for SkillArc PRs that change schema or authorization. [Preview branches incur usage charges](https://supabase.com/docs/guides/platform/manage-your-usage/branching).
- Use a stable **SkillArc Vercel preview deployment** with server-side secrets scoped to that Supabase branch. Expo development builds point to its HTTPS API origin and matching Supabase Auth project; missing staging config must fail closed.
- Expo/EAS builds and distributes the app. EAS Hosting runs Expo Router server routes but cannot deploy the existing Next.js handlers unchanged. See [Expo Hosting](https://docs.expo.dev/eas/hosting/) and [Vercel environments](https://vercel.com/docs/deployments/environments).
- SQL exists locally under `supabase/migrations`, but only its `.gitignore` is tracked. On 28 September, `supabase migration list` showed 14 remote versions and 33 local versions with only three matching; `supabase branches list` returned no branches. Before Git-based branching, Keane and Nikhil reconcile the applied history, commit the canonical set, and prove a fresh local reset and preview build match. Do not replay unverified migrations into production.
- `supabase/seed.sql` contains fixed **local** passwords. Disable that seed for a network-accessible preview; use branch-specific synthetic fixtures and private login credentials. Configure Auth redirects for development/preview app schemes and disable costly external side effects.

## Contract test matrix

For every endpoint: unauthenticated, invalid and expired token; forged `x-user-*` headers; inactive account; wrong role/feature/tenant/object; unrelated child. For writes: duplicate request, retry, file size/type, concurrent edit and audit. Keane approves only after these and web regression checks pass.
