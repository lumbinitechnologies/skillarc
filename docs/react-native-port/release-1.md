# Release-one workflow scope

**Audience:** Product review and acceptance. This is the native target for `STUDENT`, `PARENT`, and `FACULTY` on Android and iOS. A workflow listed here is not a claim that its API already exists.

| Workflow | Student | Parent | Faculty | Server rule |
| --- | --- | --- | --- | --- |
| Account | Sign-in, recovery, profile | Same | Same | Verified token, active profile, feature flags and deep links. |
| Academics | Home, courses, timetable, to-do | Linked-child summary and timetable | Assigned courses and timetable | Scope by tenant, enrolment, assignment and parent-child relation. |
| Assignments | View and submit permitted work/files | Linked-child status | Author, review and grade permitted work | Server enforces deadlines, ownership, file limits and idempotency. |
| Content | Read resources and announcements | Authorized child view | Publish assigned-course resources and announcements | Server owns publication and audience checks. |
| Attendance/leave | View attendance, request leave | Linked-child attendance | Mark attendance and handle permitted leave | Server owns totals, conflicts and audit. |
| Results | Released grades and reports | Linked-child released results | Gradebook and released reports | Server calculates official totals and release visibility. |

## Deferred

Meetings, secure quizzes, code execution, payments, AI, administration, and public admissions need separately approved native designs. Offer a clear web handoff only after the web flow is verified safe and usable on a phone. The existing billing UI simulates settlement; never present it as a real mobile payment. Remote push is deferred; the current `push_enabled` field does not establish device delivery. Safe draft recovery is in scope, full offline operation is not promised.

## Release decision

Set an internal release-candidate date only after staging and the first live vertical slice pass their gates. Keane records release or defer after all of these pass:

1. Each exposed API rejects invalid/expired tokens, forged identity headers, inactive users, disabled features, wrong tenants, and unrelated parent-child access.
2. Writes pass duplicate, retry, file-validation, and audit tests. Official attendance and grade results match the web app for the same synthetic users.
3. Every enabled screen has Android/iOS evidence for success, loading, empty, error, expired session, and poor network; labels, focus, and large text are checked.
4. No privileged key, production credential, real student record, or simulated payment success appears in the public app or repository.
