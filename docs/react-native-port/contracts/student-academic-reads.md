# Student academic reads

The server implementation and examples for [#55](https://github.com/lumbinitechnologies/skillarc/issues/55) follow [mobile v1 S1–S3](https://github.com/lumbinitechnologies/skillarc-mobile/blob/main/docs/product/mobile-v1.md). The [canonical OpenAPI](../../../contracts/mobile-v1.openapi.yaml) defines the response shapes. The [synthetic examples](student-academic-examples.json) cover each operation and its unavailable states. Mobile copies the contract only after the exact server revision is verified on staging.

## Student operations

All operations are read-only under `/api/mobile/v1/student`. They use the existing verified Bearer principal, require exact STUDENT role and active account, and derive identity/tenant from the server. No caller-supplied student, institution, section, or organization ID is accepted as an authority.

| Operation                                                | Minimum response and behavior                                                                                                                                                                                                         | Product/design use                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `GET /courses`                                           | `context`, authorized `courses[]`: ID, name, code, type, faculty IDs/names, program and section context. Return multiple instructors when present; missing instructor is explicit rather than invented.                               | Course list and summary-only course overview. No content/assignment-detail promise.                              |
| `GET /timetable?date=YYYY-MM-DD&week_id=<optional UUID>` | `context`, selected date, server-local today, timezone, multiweek capability, allowed weeks, selected week, ordered sessions, configured timing labels, applicable calendar closures, an explicit next-class reference, and an explicit empty reason.                   | Next class, day selector, week selector when enabled, room/delivery mode and closure notice. No meetings launch. |
| `GET /tasks`                                             | `context`, server `as_of`, ordered pending regular-assignment/quiz/coding summaries: ID, title, course ID/name/code, type, nullable absolute deadline, deadline state, server status and mobile availability. Submitted work is excluded from pending results. | Pending work grouped by type and deadline; unsupported actions are explained.                                    |

Keep `/me` compatible. Use `{data, request_id}` success and `{error:{code,message}, request_id}` failures; send `Cache-Control: private, no-store` and matching `X-Request-Id` on success and failure. Errors must not contain SQL, private identifiers, credentials, or object existence outside the authorized scope.

`context` contains `status: ready | no_enrollment | no_section`, nullable program/section summaries, and no unnecessary profile fields. Missing academic relationships return explicit context and empty lists where the relationship is required. Failed relationship lookup is an error, never an empty result. A profile/tenant mismatch fails closed.

## Authorization and source mapping

Existing references are implementation evidence, not authorization policy to copy:

- Courses: `src/app/dashboard/student/subjects/page.tsx` currently combines timetable relationships with program/semester fallback. The mobile implementation must constrain the query before reading data, not fetch institution-wide data and filter afterward.
- Timetable: `src/app/dashboard/student/timetable/page.tsx` and its client expose static/multiweek schedules, `institution_timetable_settings`, and `academic_calendar_events`. Its no-section fallback and hard-coded timings are explicitly excluded.
- Tasks: `src/app/dashboard/student/todo/page.tsx` reads assignments and the student's submissions, filters material and section targeting, and normalizes mixed type labels. Mobile must exclude questions, answers, test cases, grades, file URLs and execution payloads.
- Schema evidence: `supabase/migrations/20261010094633_reconciled_hosted_schema.sql` includes students, sections, enrolments/enrolment_units/enrolment_timetable_slots, subjects, faculty_subjects, timetable slots/weeks/settings, academic events, assignments and submissions. No live records were inspected for this proposal.

Confirmed access policy — Keane, 16 October 2026:

1. Verify the token with the existing `requireMobilePrincipal`; never trust identity headers or user-editable metadata. Check current student/section/program records against the principal's organization and institution.
2. Where explicit enrollment records exist, derive permitted subjects from current ENROLLED/ACTIVE enrollment units and their dates/status; historical, withdrawn, discontinued, or completed enrollment alone does not grant access. Use only ACTIVE units with applicable dates under ENROLLED/ACTIVE enrollments. Existing formal records are authoritative: ineligible or historical records never trigger section fallback.
3. Only when no formal enrollment records exist, support section-based students through their current validated section and its assigned timetable/course relationships. Do not grant every program/semester/institution subject when a relationship is absent. Keane explicitly approved this compatibility rule; manually added records are test data, not a reason to widen access.
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

## Timezone and deadline policy

The institutional timezone comes from the nullable IANA `institutions.academic_time_zone` setting delivered in #64. An administrator’s or student’s display preference has no effect on it. The India and Sydney fixtures explicitly configure `Asia/Kolkata` and `Australia/Sydney`. A third synthetic campus leaves the field unset. The real Australian campus setting requires a confirmed location.

The same server clock determines Today, date-based access, next class, and task status for each response. When the timezone is absent or invalid, timetable Today and next class are unavailable. A caller can still select an explicit date. For date-based access only, an unconfigured campus grants current formal relationships if their valid dates cover the range of possible current local dates. This prevents early grants and late revocations around midnight without assigning an institution a timezone.

Multiweek lists include eligible weeks that overlap four weeks before through twelve weeks after the selected date. An explicitly supplied week is first validated within an authorized section and semester. If no date is given, use Today when it falls in the chosen week and otherwise use the configured week start. When a section has no weeks in the selector window, its static schedule is available. When weeks exist in that window, the day follows its authorized week. Closures that affect classes suppress the day’s sessions. Next class refers to a timed session on the selected day. Skipped or repeated clock times during a timezone transition cannot establish an absolute start or end.

An explicit absolute deadline is stored in nullable `assignments.due_at`. The migration preserves `due_date` and leaves existing `due_at` values unset. A known deadline has a normalized ISO instant and server-derived status. Where both columns are absent, the deadline is absent. Where only a legacy deadline exists, display “Deadline unavailable” and keep the status pending. Synthetic fixtures set explicit absolute instants to verify the known and overdue states.

## Errors and completeness

Use existing 401/403/503 behavior for invalid/missing token, inactive/wrong-role/missing-tenant scope, and upstream failure. Define documented 400 validation responses for malformed date/week inputs and 403 for unrelated requested relationships. Do not transform query errors into “All caught up”.

Lists must be complete for the authorized current academic context. Implementation must account for database response row limits; the service reads every authorized page by stable database ID before returning the complete list. The client does not need a cursor.

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

Verify success and denial over HTTP using the synthetic staging accounts and record the deployed commit and deployment ID before handing off the OpenAPI snapshot.
