# Mobile release-one scope

The [SkillArc Mobile v1 specification](https://github.com/lumbinitechnologies/skillarc-mobile/blob/main/docs/product/mobile-v1.md) is the authoritative product scope. It replaces the earlier three-role workflow matrix. The [backlog reconciliation](https://github.com/lumbinitechnologies/skillarc-mobile/blob/main/docs/product/backlog-reconciliation.md) maps scope to GitHub issues. Keane owns the current work in both repositories; independent review remains required.

## Audience and capability boundary

- Students: daily timetable, courses, resources/announcements, all task summaries, regular assignment details/file submissions, attendance/leave and released grades.
- Faculty: assigned courses, timetable/rosters, attendance marking/review and reading existing resources/announcements.
- Shared: sign-in/recovery, secure sessions, profile display and role home.
- Parents and administrative roles: deferred feature delivery. Existing parent authentication is retained without promising parent v1 workflows.
- Quiz/coding tasks are read-only summaries; execution, complex authoring, grading/publication, payments, admissions, placements, events, project groups, meetings, AI, notification delivery and profile writes are deferred. See the public specification for the complete disposition register.

## Server acceptance

An existing website page is not a mobile API. Every feature needs a reviewed Bearer-compatible contract, scoped handler, synthetic fixtures and authorization tests before mobile integration. Keep private query/security evidence here; public work items describe outcomes without credentials or private implementation details.

Each handler must reject invalid/expired tokens, forged identity headers, inactive accounts, wrong roles, disabled applicable features, wrong tenants and unrelated course/section/object IDs. Missing enrollment must not fall back to institution-wide access. Server calculations determine official attendance, released results and deadlines. File and write operations need validation, retries, duplicate/conflict handling and audit tests.

## Platform and release evidence

Authentication and `/api/mobile/v1/me` are implemented; academic feature delivery remains planned. Android and iOS device readiness are distinct. Mobile #39 retains deferred Apple/iPhone setup, end-to-end reset email, controlled slow-response, natural expiration and large-text checks. JS exports do not establish device verification. Do not disable the phone's mobile data.

No fixed release date is committed. A full cross-platform v1 needs both platform gates; an Android-only decision must say so explicitly. Keep testing synthetic-only, separate it before real client data arrives, and resolve the private findings in [migration reconciliation](../MIGRATION_RECONCILIATION.md).
