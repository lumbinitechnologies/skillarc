# Student academic reads — contract proposal

Status: **proposed for review, not implemented or approved**. Owner: @keanesc; independent reviewer: @lumbinitechnologies. Delivery: [server #55](https://github.com/lumbinitechnologies/skillarc/issues/55). Product authority: [mobile v1 S1–S3](https://github.com/lumbinitechnologies/skillarc-mobile/blob/main/docs/product/mobile-v1.md). Synthetic examples: [student-academic-examples.json](student-academic-examples.json).

This proposal is reviewed before handlers are written. The canonical `contracts/mobile-v1.openapi.yaml` continues to advertise only implemented, tested operations. No database migration, runtime route, generated client, or mobile production screen changes in this contract-review PR.

## User outcomes and proposed interface

All operations are read-only under `/api/mobile/v1/student`. They use the existing verified Bearer principal, require exact STUDENT role and active account, and derive identity/tenant from the server. No caller-supplied student, institution, section, or organization ID is accepted as an authority.

| Operation                                                | Minimum response and behavior                                                                                                                                                                                                         | Product/design use                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `GET /courses`                                           | `context`, authorized `courses[]`: ID, name, code, type, faculty IDs/names, program and section context. Return multiple instructors when present; missing instructor is explicit rather than invented.                               | Course list and summary-only course overview. No content/assignment-detail promise.                              |
| `GET /timetable?date=YYYY-MM-DD&week_id=<optional UUID>` | `context`, selected date, server-local today, timezone, multiweek capability, allowed weeks, selected week, ordered sessions, configured timing labels, applicable calendar closures, and an explicit empty reason.                   | Next class, day selector, week selector when enabled, room/delivery mode and closure notice. No meetings launch. |
| `GET /tasks`                                             | `context`, server `as_of`, ordered pending regular-assignment/quiz/coding summaries: ID, title, course ID/name/code, type, nullable deadline, server status and mobile availability. Submitted work is excluded from pending results. | Pending work grouped by type and deadline; unsupported actions are explained.                                    |

Keep `/me` compatible. Use `{data, request_id}` success and `{error:{code,message}, request_id}` failures; send `Cache-Control: private, no-store` and matching `X-Request-Id` on success and failure. Errors must not contain SQL, private identifiers, credentials, or object existence outside the authorized scope.

`context` contains `status: ready | no_enrollment | no_section`, nullable program/section summaries, and no unnecessary profile fields. Missing academic relationships are successful, explicit empty states, not an institution-wide fallback. Failed relationship lookup is an error, never an empty result. A profile/tenant mismatch fails closed.

## Authorization and source mapping

Existing references are implementation evidence, not authorization policy to copy:

- Courses: `src/app/dashboard/student/subjects/page.tsx` currently combines timetable relationships with program/semester fallback. The mobile implementation must constrain the query before reading data, not fetch institution-wide data and filter afterward.
- Timetable: `src/app/dashboard/student/timetable/page.tsx` and its client expose static/multiweek schedules, `institution_timetable_settings`, and `academic_calendar_events`. Its no-section fallback and hard-coded timings are explicitly excluded.
- Tasks: `src/app/dashboard/student/todo/page.tsx` reads assignments and the student's submissions, filters material and section targeting, and normalizes mixed type labels. Mobile must exclude questions, answers, test cases, grades, file URLs and execution payloads.
- Schema evidence: `supabase/migrations/20261010094633_reconciled_hosted_schema.sql` includes students, sections, enrolments/enrolment_units/enrolment_timetable_slots, subjects, faculty_subjects, timetable slots/weeks/settings, academic events, assignments and submissions. No live records were inspected for this proposal.

Proposed access policy for review:

1. Verify the token with the existing `requireMobilePrincipal`; never trust identity headers or user-editable metadata. Check current student/section/program records against the principal's organization and institution.
2. Where explicit enrollment records exist, derive permitted subjects from current ENROLLED/ACTIVE enrollment units and their dates/status; historical, withdrawn, discontinued, or completed enrollment alone does not grant access. Confirm which unit statuses count as current before implementation.
3. Support legacy section-based students only through their current validated section and its assigned timetable/course relationships. Do not grant every program/semester/institution subject when a relationship is absent. Confirm the legacy section policy below.
4. Every joined subject, faculty relationship, week and slot must belong to that authorized institution and section/enrollment. Institution-wide academic closures are allowed only within the principal's institution. Restrict faculty context to identifiers/names needed for the course.
5. A supplied week must be an allowed week, belong to the student's section and agree with feature/date semantics. Reject unrelated IDs without returning their contents. Feature-off requests cannot reveal disabled multiweek data.
6. Task targeting requires both authorized course membership and matching section targeting. Null/empty assignment targeting means all authorized students of that course; missing section never grants access to another targeted section. Read submissions for the authenticated student only.

Do not rely on RLS to rescue server-admin queries. All privileged reads require explicit predicates and negative tests. Mobile receives no privileged credentials and performs no direct academic-table reads.

## Dates, timing and task semantics

- `date` is a strict calendar date. The server determines the weekday and default/current week; date/week conflicts are validation errors. Static schedules return no invented week selector. Disabled multiweek mode does not return other weeks.
- Slots are ordered by weekday/period with stable ID tie-breaks. No configured period time produces a null time label plus `timings_unavailable`; the UI displays “Time not configured”. Do not infer a time from period number or a global template.
- Closure rows preserve dates and whether classes are affected. The server determines applicable closure state; the UI must not label a normal empty day as a closure or silently show canceled sessions as normal.
- Deadlines are nullable. The server computes pending/overdue from the same normalized instant and `as_of`; the client only formats the result. Submission presence removes a task from the pending list, regardless of grade status. Unknown task types must not become regular assignments accidentally.
- Regular assignments in this slice have `mobile_action: unavailable` with “Assignment details and submission are not available in this version yet.” A later reviewed submission feature can enable its destination. Quiz/coding summaries say “Available on the website; completing this task is not supported in mobile v1.” No URL, execution action, or automatic browser handoff is provided.

## Review decisions required before implementation

### Confirmed timezone direction — 16 October 2026

Keane approved an **institution-owned IANA timezone setting** after explaining that the two institutions are in India and Australia. The Australian city/state is unknown; do not choose an Australian zone from country alone. Use `Asia/Kolkata` for the explicitly configured Indian example. An administrator's or student's personal timezone must not become the institution's academic policy.

Recommended implementation: an explicitly configured, nullable `academic_time_zone` value owned by each institution, validated as a supported IANA identifier by server-side configuration writes and reads. No global default and no silent backfill from user preferences. Its storage/migration and configuration procedure need their own reviewed change; no schema is altered by this proposal. Unknown configuration remains visible as `time_zone: null`, `today: null`, and an explicit configuration-unavailable state, not an invented Today schedule. Courses and non-time-dependent reads need not disappear merely because schedule configuration is incomplete.

Use institutional local dates/times for recurring classes, academic weeks and closures. Store new absolute deadline instants as timezone-aware values and return ISO instants; a user's optional display conversion cannot change the deadline or the server's overdue decision. Existing timestamp-without-time-zone deadline rows remain subject to the legacy interpretation audit below; this direction does not authorize reinterpreting them or a bulk conversion.

The clickable prototype's configured India example is synthetic. Its unknown-timezone state removes the academic Today/date claim. This does not constitute approval of handlers, canonical OpenAPI changes, database backfills, or production screens.

1. **Academic timezone:** the current institution/timetable settings have no academic IANA timezone. `user_account_settings.timezone` is a user preference with an unrelated default; it is not institutional policy. Approve the institution-owned timezone source/configuration before implementing today/default-week/date-boundary behavior. No database migration is assumed.
2. **Legacy deadlines:** assignments store `due_date` as timestamp without time zone, while current write actions convert submitted input to ISO UTC before persistence. Confirm whether legacy rows use the same UTC convention. Do not silently append `Z` to ambiguous historical values or calculate a potentially incorrect overdue state. This is a data interpretation decision, not a phone formatting choice.
3. **Enrollment compatibility:** confirm active enrollment/unit status rules and whether validated section membership is authoritative for legacy students without formal enrollment rows. The recommended rule preserves section-based workflows while never falling back to institution/program-wide subjects.

Examples use a deliberately configured synthetic Asia/Kolkata institution and UTC deadlines. They demonstrate the proposed shape, not a deployment policy or a claim these decisions are settled. The design prototype must label synthetic times and retain unavailable-time states.

## Errors and completeness

Use existing 401/403/503 behavior for invalid/missing token, inactive/wrong-role/missing-tenant scope, and upstream failure. Define documented 400 validation responses for malformed date/week inputs and 403 for unrelated requested relationships. Do not transform query errors into “All caught up”.

Lists must be complete for the authorized current academic context. Implementation must account for database response row limits; use bounded paging internally or documented client pagination, never silently truncate a task/course/week list. Settle any cursor shape in the OpenAPI review before generation.

## Required acceptance evidence

| Scenario                                                                      | Expected evidence                                                                                                                 |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Valid synthetic student                                                       | Minimal authorized courses; correct static and multiweek schedules, configured periods, closures and all three pending task types |
| Missing student/enrollment/section                                            | Distinct documented context/empty state; zero institution-wide fallback reads                                                     |
| Missing/forged/expired token, forged identity headers                         | Existing 401 handling; forged headers cannot alter the student or tenant                                                          |
| Parent/faculty/admin, inactive or cross-tenant profile                        | Denied by server even if the route is called directly                                                                             |
| Unrelated course/week/section; revoked relationship                           | No leaked rows, names, existence or task payloads                                                                                 |
| Targeted/global tasks, mixed type labels, submitted/overdue/no deadline       | Correct server filtering/status and explicit unavailable actions; no answer/test-case fields                                      |
| Midnight, timezone change, selected-week boundary, closures and absent timing | Deterministic server results from a fixed clock and reviewed time policy                                                          |
| Query failure or malformed data                                               | Safe error with request ID; never an empty-success claim                                                                          |
| More records than one database page                                           | Complete results with deterministic ordering and no duplicates                                                                    |

After review: implement scoped handlers/services and authorization tests, extend canonical OpenAPI with validated examples, run server typecheck and relevant lint/tests, and demonstrate synthetic success/denial over HTTP. Record pre-existing repository check failures separately. Only after independent server review may mobile copy the reviewed contract and generate its client. Preserve web behavior; this work does not rewrite website queries.
