# Feature and dependency inventory

This audit groups the current product by workflow. The exact pages and HTTP methods are in [route-catalog.md](route-catalog.md). A page being present does not prove its complete business flow is production ready. Screen names below describe existing code, not committed mobile scope.

## Roles and navigation

`src/constants/roles.ts` defines `SUPER_ADMIN`, `ORG_ADMIN`, `INSTITUTION_ADMIN`, `HOD`, `PROGRAM_HEAD`, `FACULTY`, `STUDENT`, and `PARENT`. `src/components/sidebar.tsx` is the most direct menu inventory. HOD/program head and timetable-permitted faculty inherit faculty links; organization features conditionally hide admissions, billing, placements, report cards, intake cohorts, and interventions. `src/app/dashboard/page.tsx` selects role home screens. Build the mobile access map from **role + organization features + permission + tenant**, and verify each destination with the backend. Release one supports the exact `STUDENT`, `PARENT`, and `FACULTY` roles described in [release-1.md](../release-1.md); this table remains the full-port audit. `src/constants/routes.ts` contains a timetable-manager route name that is not represented by a matching `src/app/dashboard/timetable-builder/page.tsx`; the active builder lives under institution administration.

| User group | Web workflows to account for | Main source | Proposed rollout |
| --- | --- | --- | --- |
| Student | Overview; attendance and leave; subjects, resources and live meetings; assignment/quiz/coding submissions; to-do; timetable; report card; admissions; billing; events; placements | `src/app/dashboard/student/`, assignment actions, `src/components/placements/` | Release-one academic core only; high-risk web flows deferred |
| Faculty | Overview/profile; assigned subjects; announcements/resources/assignments/quiz/gradebook; attendance; timetable; events; placements; project groups; meetings | `src/app/dashboard/faculty/`, `src/app/actions/`, `src/modules/attendance/` | Release-one academic core only |
| HOD and program head | Role overviews; events/placements; faculty features; builder permission and timetable | `src/app/dashboard/hod/`, `program-head/`, sidebar | After core faculty; verify role-specific data scope |
| Parent | Linked child overview, timetable/attendance, events | `src/app/dashboard/parent/`, `src/modules/parent-student/` | Release one; relationship checks mandatory |
| Institution admin | Admissions/intakes/billing/interventions; departments/programs/sections/faculty/students/parents/subjects; assignments of courses; timetable builder; attendance/events/placements | `src/app/dashboard/institution-admin/`, `src/app/api/` | Later, many privileged mutations |
| Org admin | Organization overview, institution creation/management paths, events/placements | `src/app/dashboard/org-admin/`, `src/modules/org-admin/` | Later |
| Super admin | Organizations, admins, institutions, analytics, audit logs, settings, impersonation, events/placements | `src/app/dashboard/super-admin/` | Last, especially impersonation |
| Public applicant | Apply and status pages; offer/agreement/enrolment | `src/app/apply/`, `src/app/api/admissions/` | Product decision: native or web link |

Other reachable screens include `/dashboard/courses`, `/dashboard/placements`, `/dashboard/project-groups`, `/dashboard/teacher`, `/meetings/[meetingCode]`, account center, and marketing pages. Some are not first-class sidebar items. `student/grades` redirects to `student/report-card`; there are multiple quiz URL forms that should become one canonical native route. Preserve deep links from existing emails and notifications or redirect them safely to the corresponding native screen.

## Workflows and backend migration map

| Workflow | Current client/server behavior | Mobile API or native requirement |
| --- | --- | --- |
| Sign-in and invitations | `src/app/actions/auth.ts`, `src/app/auth/*`, `src/lib/invite-user.ts`; SSR cookie sessions and web callbacks | Native Supabase session, invite/recovery deep links, verified principal endpoint, no cookie assumptions |
| Account | `/api/account/{profile,avatar,settings,notifications}` and account screens | Bearer-compatible profile/settings/avatar/inbox contracts; photo picker and upload |
| Organization features | `src/lib/dashboard-session.ts`, `src/lib/organization-features.ts`, `/api/org-features` | Fetch scoped feature map, invalidate on change, authorize on server |
| Student directory/profile/docs | `/api/students*`, `src/modules/students/`; private document signed URL handler | Paginated directory for authorized staff; document picker and private preview; student self-access |
| Academic organization | `/api/departments*`, `/api/programs*`, `/api/sections*`, `/api/subjects*`, `/api/faculty*`, `/api/parents*`, `/api/faculty-subjects`, `/api/bulk-import` | Typed list/detail/mutation endpoints; invite/import kept server-side; native bulk import may remain web-only |
| Timetable | `src/modules/timetable/`, `/api/timetable/settings`; DnD builder and clash service | Native calendar/list; save/version/conflict API; redesigned touch builder if scoped |
| Attendance | Faculty/student Server Actions, admin/student/faculty screens, leave/warnings | Bearer endpoints for mark/overwrite/leave/review; protect section and date scope, duplicate saves |
| Learning and assessment | Assignment, announcement, gradebook, project-group and code-runner Server Actions; subject pages | JSON/multipart endpoints for authoring, submissions, grading, announcements, teams, execution; server deadline and idempotency |
| Events | `/api/events*`, registration and uploads; `/api/dashboard/events` | Events list/detail/register/manage/upload; device images, scoped permissions |
| Placements | `/api/dashboard/placements`, portal and role pages; resume Storage upload and mock interview | Placement DTOs, resume upload policy, native audio/speech if interview enabled |
| Admissions | Public apply/status; `/api/admissions*`; transition RPC, document and offer paths | Applicant authorization, private file handling, bounded forms, state machine and signing |
| Billing | `student/billing`, `institution-admin/billing`, `payment_plans`, `invoices`, `payments` | Read-only ledger initially; real gateway integration and server reconciliation for payments |
| Notifications | `src/lib/notification-service.ts`, `/api/account/notifications`, navbar bell | Inbox, preferences, device tokens and backend push send if enabled |
| AI copilot | `/api/assistant/*`, `/api/knowledge/*`, `src/lib/assistant/`, `src/lib/knowledge/` | Authenticated streaming client, thread history, citations, scoped file upload; model runs on server |
| Meetings | `src/app/actions/meetings.ts`, `src/app/meetings/*`; JaaS browser external API and realtime messages | Native meeting integration or authenticated web fallback; permissions, messaging, lifecycle |

## Reuse classification

| Classification | Examples | Action |
| --- | --- | --- |
| Framework-free types and presentation helpers | `src/constants/roles.ts`, portions of `src/modules/*/types` | Prefer the generated mobile contract; extract only code that must run in both apps. Keep gradebook and timetable rules on the server. |
| Server-only | `src/lib/supabase-admin.ts`, `src/lib/user-context.ts`, notification service, AI/knowledge worker, code runner, invitations, `src/app/actions/*` | Retain on backend; expose validated endpoints. |
| Web-only UI | `src/app/**/page.tsx`, `src/components/ui/*`, sidebar, `src/app/globals.css`, print modals | Redesign in native UI; copy copywriting/business intent as appropriate. |
| Conditional reuse | `src/lib/supabase.ts`, module services and contexts, `src/lib/dashboard-read-models.ts` | Split pure mapping from web SSR/cookie/client assumptions; use mobile-specific Supabase client and fetchers. |

## Native replacement register

| Web dependency or behavior | Seen in source | Native plan |
| --- | --- | --- |
| Next route/link/redirect and Server Components | `src/app/`, `next/navigation`, `next/link` | Expo Router; explicit query loading and protected route UX |
| Tailwind/CSS, Radix/shadcn, HTML tables/dialogs | `src/app/globals.css`, `src/components/ui/`, dashboards | Native design system, list virtualization, responsive tablet design |
| Recharts and browser print | report card, analytics, gradebook/invoice print modals | Native charts; server-rendered PDF or native share/print |
| Drag and drop | timetable builder and `@dnd-kit/core` | Touch interaction redesign with accessible alternatives |
| Browser file APIs | apply, avatar cropper, resources, resumes, documents | Native pickers/image editor and memory-safe upload |
| Browser storage | faculty attendance session, placement resume/history | Encrypted/scoped storage for sensitive state, ordinary cache only for safe data |
| Fullscreen/tab checks | student assignment solver | New assessment policy; server attempt/deadline enforcement |
| Browser audio/video/speech/Jitsi | meeting room and placement interview terminal | Native SDK/modules, interruption and permission handling, or web fallback |
| Realtime subscription | subject live meetings, meeting messages | Supabase realtime lifecycle and reconnect handling |

## Data/security inventory to verify

The base SQL schema spans organization/institution/departments/programs/intakes/users; sections/students/parents/staff; enrolments/subjects/timetable/attendance; assignments/submissions/resources/projects; events/placements; admissions/fees/invoices/payments; notifications and audit logs. Later migrations add gradebook, account/avatar settings, student document policy, timetable enhancements, AI knowledge tables, RLS, and cascade-delete functions. For mobile, generate a schema report from the **deployed** database, because `skillarc_schema_v1.sql` and numbered migrations may not exactly reflect production.

Required matrix for each table/bucket and operation: anonymous, student self, parent linked child, faculty assigned course/section, HOD/program head department, institution admin own institution, org admin own organization, super admin. Test reads **and** writes, including UPDATE `USING`/`WITH CHECK`, and negative cross-tenant IDs. Review every route that uses service-role access for explicit authorization because RLS does not protect those queries. `tests/rls_security_validation.sql` is a starting point, not evidence of mobile coverage.

## Known inconsistencies and blockers found during audit

1. The pre-port `src/proxy.ts` had an unverified JWT decode fast path and forwarded identity headers; `getCurrentUserContext()` trusted those headers while using the admin client. The initial mobile foundation removes that path. Verify with real forged-token/header and web-session tests before enabling feature endpoints.
2. `src/app/dashboard/student/billing/page.tsx` simulates a transaction and marks invoices paid directly. Block real mobile payments until provider confirmation and server-side ledger mutation exist.
3. `src/app/api/admissions/public-status/route.ts` has broad lookup paths and service-role access to personal application data. Restrict before surfacing it in mobile.
4. `src/app/actions/code-runner.ts` executes subprocesses on the application host. Do not expose it to mobile traffic without isolated execution and rate/resource controls.
5. Notification `push_enabled` is currently an in-app preference; no remote push device registry or send pipeline exists.
6. `src/app/meetings/[meetingCode]/meeting-room-client.tsx` is DOM/JaaS-specific. Native meeting parity requires a separate feasibility decision.
7. The web quiz security model depends on browser focus/fullscreen and cannot be promised as equivalent on mobile.
8. Role/menu and route names have legacy or duplicated paths. Consolidate routes while preserving external links.
