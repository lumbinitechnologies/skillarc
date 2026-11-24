# Institution-owned academic timezones — server #64

Owner: @keanesc. Independent reviewer: @lumbinitechnologies. AI-assisted implementation.

## Behavior and configuration

Each institution has a nullable `academic_time_zone` IANA identifier, with no default. User/admin display preferences are never used as a fallback. The Indian local fixture uses `Asia/Kolkata`; `Australia/Sydney` is an explicit synthetic DST fixture and **not** the unconfirmed real Australian campus location.

The existing cookie-authenticated `/api/timetable/settings` configuration path accepts `PATCH` with exactly `{ "academic_time_zone": "Asia/Kolkata" }` or an explicit `null` to clear. The server derives the active institution-admin actor and tenant from verified Auth plus current profile; caller scope fields and impersonation cookies are not authority. Other roles, including org admins, cannot use this institution-admin operation. Existing period-setting POSTs never change the timezone.

GET adds `academic_time_zone` and `academic_time_zone_status` (`ready`, `unconfigured`, `invalid`). Invalid stored identifiers normalize to null. `academicTimeContext` supplies null timezone/today for missing or invalid configuration. Academic read handlers will consume this server context; they are **not implemented in this PR**. The existing website settings GET's legacy period defaults are retained for compatibility; they are not an approved source of mobile timings. Mobile academic handlers must read configured records and never infer timings from those defaults.

The new column is protected even though the reconciled institution table currently has ineffective RLS. A narrow trigger rejects direct anonymous/authenticated timezone changes. A service-only, SECURITY INVOKER RPC rechecks an active institution-admin and both institution/organization, locks the actor and target row, and writes the timezone plus audit record in one transaction. It is not callable by Data API user roles. No-op retries produce no duplicate audit. No broad table grants, unrelated policies, SECURITY DEFINER functions or mobile administration screens are added.

## Review and rollout

1. Review the new migration and server configuration path together. The migration only adds the nullable column, validation/write guard and audited setter. It does not alter existing timezone/deadline records or set a blanket default.
2. Local verification applies it only to disposable network-isolated PostgreSQL 17 containers. The dependency fixture reproduces the used columns/privileges, not the entire Supabase baseline.
3. Obtain independent PR review and merge before server #55 depends on the column/helper. Do not generate a mobile client or implement production academic screens from this PR.
4. Hosted migration/configuration is **not performed or authorized here**. A future authorized rollout must apply the reviewed migration before deploying readers of the new column, then confirm each institution's zone. Leave the Australian institution unconfigured until its actual zone is known. Existing timetable settings reads fail safely if the schema is missing; there is no silent schema fallback.
5. To reverse a configured zone through the supported path, PATCH explicit null; this is audited. Do not drop the column as an automatic rollback. Revert application use first if a deployment fails.

## Reproducible validation

```bash
node --import tsx src/lib/academic-time-zone.test.ts
node --import tsx src/modules/institutions/academic-time-zone-handler.test.ts
bash scripts/local/test-academic-time-zone.sh
npm run db:check-migrations
npm run db:test-migrations
npm run typecheck
npx --no-install eslint src/lib/academic-time-zone*.ts src/modules/institutions/academic-time-zone-*.ts src/app/api/timetable/settings/route.ts
```

The SQL runner creates and removes its own named Docker container, uses a tmpfs database, publishes no ports, and takes no database URL or hosted credentials. It verifies validation, absent defaults, unrelated institution/organization denial, wrong-role/inactive denial, anonymous/authenticated direct-write and RPC denial, independent India/Australia fixtures, audit rollback, retry and explicit clear. Runtime tests cover institution midnight, both synthetic Australian DST transitions, invalid/absent configuration, HTTP validation/authorization, safe errors and non-cacheable responses.

No hosted database, existing local database, real account, authentication regression, mobile screen, Android installation or iOS device was tested by these checks. Keep iOS deferral #39 unchanged. Whole-repository lint results and any baseline findings are reported in the PR separately from the focused checks.

## Results recorded on 16 October 2026

- Server typecheck and focused lint passed. Eight runtime/HTTP-boundary cases passed.
- Isolated PostgreSQL migration/authorization/audit assertions passed, including same-organization cross-campus denial. Both synthetic institution values were set and checked locally; all test transactions and containers were discarded.
- Migration guard and guard regression suite passed (16 canonical files).
- Whole-repository `npm run lint` failed with 2,785 findings (2,020 errors, 765 warnings) outside the changed source paths, including existing nested worktrees/vendor material and a root Tailwind configuration parse error. These are not reported as a passing full lint run. The touched settings route's prior `any` catches/unused parameter were cleaned up, and its focused lint now passes.
- Database scope: isolated PostgreSQL 17 with minimal dependency tables, not a full Supabase baseline replay or live Data API/installed-device result. No hosted credentials or configuration were used.

- `supabase db advisors --local --type security --fail-on error` was attempted but could not connect: the standard local Supabase stack is not running on 127.0.0.1:54322. It did not contact the linked hosted project. This is an unavailable advisor run, not a security-advisor pass; the independent isolated PostgreSQL assertions above did run successfully.
