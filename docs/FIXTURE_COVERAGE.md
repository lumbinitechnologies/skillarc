# Synthetic fixture coverage v1

Owner: Keane; #66. This matrix separates implemented fixture data from verified user journeys. No hosted fixtures have been run in replacement staging or production.

| Workflow | Current fixture data | Remaining readiness evidence |
| --- | --- | --- |
| Student/faculty/admin login | supported Auth Admin runner + linked profiles, two tenants | hosted password login, browser roles, Android binding |
| Student academics | courses, formal enrollment, withdrawn/empty cases, static/multiweek schedules/closure, quiz/coding summaries | #55 APIs, explicit known-deadline storage contract, India/DST/date boundaries, long lists |
| Assignment/submission | regular task + graded submission; no-deadline/ambiguous timestamp samples | actual synthetic uploaded file, due-instant/overdue/submitted exclusion, #58 journey |
| Resources/announcements | announcements and intentionally unavailable resource metadata | owned downloadable file + content permissions + #57 journey |
| Attendance/leave | saved attendance and pending leave | write/review/approval and cross-tenant denial journeys |
| Released results | grade column and entry only | verify actual release/publication semantics; no invented published flag |
| Faculty rosters/timetable | faculty-course/section relationships and schedules | roster/scoped timetable and attendance UI journeys |
| Profile/recovery | linked identities and active profiles | environment/session boundary checks; do not repeat unchanged waived auth suite |
| Admissions, placements, payments, meetings, events, assistant, documents, parent and broader admin | not covered by this fixture generator | inventory supported website operations; add synthetic/sandbox fixtures and readiness tests before claiming full website coverage |

Known deadline instants must be recorded by explicit timezone/instant fixtures once #55 settles canonical representation. The existing due_date column is timezone-less; do not label it known UTC or calculate overdue based on it. Australia/Sydney is synthetic only.

Fixture creation never proves authorization: current #67 security findings remain blockers. Add cross-tenant denied tests using real synthetic student/faculty sessions against each supported route. A linked profile read alone is insufficient. Production must have zero `.invalid` fixture Auth users, fixture-owned IDs and synthetic objects before release. Legacy is excluded from all new fixture operations.
