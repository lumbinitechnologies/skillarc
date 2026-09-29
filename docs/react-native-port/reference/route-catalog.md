# Web route and API catalog

Generated from the repository on 27 September 2026 and updated with the first mobile handler. This is a discovery checklist: existence of a page or handler does not guarantee a complete or mobile-ready contract. `loading.tsx` files and nested client components are excluded. See [feature-inventory.md](feature-inventory.md) for workflow notes.

## Pages (94)

| Current web path | Source |
| --- | --- |
| `/about` | [`src/app/about/page.tsx`](../../../src/app/about/page.tsx) |
| `/apply/[institutionId]` | [`src/app/apply/[institutionId]/page.tsx`](../../../src/app/apply/[institutionId]/page.tsx) |
| `/apply` | [`src/app/apply/page.tsx`](../../../src/app/apply/page.tsx) |
| `/apply/status/[id]` | [`src/app/apply/status/[id]/page.tsx`](../../../src/app/apply/status/[id]/page.tsx) |
| `/apply/status` | [`src/app/apply/status/page.tsx`](../../../src/app/apply/status/page.tsx) |
| `/auth/callback-finish` | [`src/app/auth/callback-finish/page.tsx`](../../../src/app/auth/callback-finish/page.tsx) |
| `/auth/forgot-password` | [`src/app/auth/forgot-password/page.tsx`](../../../src/app/auth/forgot-password/page.tsx) |
| `/auth/inactive` | [`src/app/auth/inactive/page.tsx`](../../../src/app/auth/inactive/page.tsx) |
| `/auth/login` | [`src/app/auth/login/page.tsx`](../../../src/app/auth/login/page.tsx) |
| `/auth/reset-password` | [`src/app/auth/reset-password/page.tsx`](../../../src/app/auth/reset-password/page.tsx) |
| `/auth/set-password` | [`src/app/auth/set-password/page.tsx`](../../../src/app/auth/set-password/page.tsx) |
| `/auth/signup` | [`src/app/auth/signup/page.tsx`](../../../src/app/auth/signup/page.tsx) |
| `/dashboard/account/notifications` | [`src/app/dashboard/account/notifications/page.tsx`](../../../src/app/dashboard/account/notifications/page.tsx) |
| `/dashboard/account` | [`src/app/dashboard/account/page.tsx`](../../../src/app/dashboard/account/page.tsx) |
| `/dashboard/account/profile` | [`src/app/dashboard/account/profile/page.tsx`](../../../src/app/dashboard/account/profile/page.tsx) |
| `/dashboard/account/settings` | [`src/app/dashboard/account/settings/page.tsx`](../../../src/app/dashboard/account/settings/page.tsx) |
| `/dashboard/change-password` | [`src/app/dashboard/change-password/page.tsx`](../../../src/app/dashboard/change-password/page.tsx) |
| `/dashboard/courses` | [`src/app/dashboard/courses/page.tsx`](../../../src/app/dashboard/courses/page.tsx) |
| `/dashboard/faculty/attendance` | [`src/app/dashboard/faculty/attendance/page.tsx`](../../../src/app/dashboard/faculty/attendance/page.tsx) |
| `/dashboard/faculty/events` | [`src/app/dashboard/faculty/events/page.tsx`](../../../src/app/dashboard/faculty/events/page.tsx) |
| `/dashboard/faculty` | [`src/app/dashboard/faculty/page.tsx`](../../../src/app/dashboard/faculty/page.tsx) |
| `/dashboard/faculty/placements` | [`src/app/dashboard/faculty/placements/page.tsx`](../../../src/app/dashboard/faculty/placements/page.tsx) |
| `/dashboard/faculty/profile` | [`src/app/dashboard/faculty/profile/page.tsx`](../../../src/app/dashboard/faculty/profile/page.tsx) |
| `/dashboard/faculty/subjects/[subjectId]` | [`src/app/dashboard/faculty/subjects/[subjectId]/page.tsx`](../../../src/app/dashboard/faculty/subjects/[subjectId]/page.tsx) |
| `/dashboard/faculty/subjects` | [`src/app/dashboard/faculty/subjects/page.tsx`](../../../src/app/dashboard/faculty/subjects/page.tsx) |
| `/dashboard/faculty/timetable` | [`src/app/dashboard/faculty/timetable/page.tsx`](../../../src/app/dashboard/faculty/timetable/page.tsx) |
| `/dashboard/hod/events` | [`src/app/dashboard/hod/events/page.tsx`](../../../src/app/dashboard/hod/events/page.tsx) |
| `/dashboard/hod` | [`src/app/dashboard/hod/page.tsx`](../../../src/app/dashboard/hod/page.tsx) |
| `/dashboard/hod/placements` | [`src/app/dashboard/hod/placements/page.tsx`](../../../src/app/dashboard/hod/placements/page.tsx) |
| `/dashboard/institution-admin/admissions` | [`src/app/dashboard/institution-admin/admissions/page.tsx`](../../../src/app/dashboard/institution-admin/admissions/page.tsx) |
| `/dashboard/institution-admin/attendance` | [`src/app/dashboard/institution-admin/attendance/page.tsx`](../../../src/app/dashboard/institution-admin/attendance/page.tsx) |
| `/dashboard/institution-admin/billing` | [`src/app/dashboard/institution-admin/billing/page.tsx`](../../../src/app/dashboard/institution-admin/billing/page.tsx) |
| `/dashboard/institution-admin/departments/[id]` | [`src/app/dashboard/institution-admin/departments/[id]/page.tsx`](../../../src/app/dashboard/institution-admin/departments/[id]/page.tsx) |
| `/dashboard/institution-admin/departments` | [`src/app/dashboard/institution-admin/departments/page.tsx`](../../../src/app/dashboard/institution-admin/departments/page.tsx) |
| `/dashboard/institution-admin/events` | [`src/app/dashboard/institution-admin/events/page.tsx`](../../../src/app/dashboard/institution-admin/events/page.tsx) |
| `/dashboard/institution-admin/faculty` | [`src/app/dashboard/institution-admin/faculty/page.tsx`](../../../src/app/dashboard/institution-admin/faculty/page.tsx) |
| `/dashboard/institution-admin/faculty-subjects` | [`src/app/dashboard/institution-admin/faculty-subjects/page.tsx`](../../../src/app/dashboard/institution-admin/faculty-subjects/page.tsx) |
| `/dashboard/institution-admin/intakes` | [`src/app/dashboard/institution-admin/intakes/page.tsx`](../../../src/app/dashboard/institution-admin/intakes/page.tsx) |
| `/dashboard/institution-admin` | [`src/app/dashboard/institution-admin/page.tsx`](../../../src/app/dashboard/institution-admin/page.tsx) |
| `/dashboard/institution-admin/parents` | [`src/app/dashboard/institution-admin/parents/page.tsx`](../../../src/app/dashboard/institution-admin/parents/page.tsx) |
| `/dashboard/institution-admin/placements/companies` | [`src/app/dashboard/institution-admin/placements/companies/page.tsx`](../../../src/app/dashboard/institution-admin/placements/companies/page.tsx) |
| `/dashboard/institution-admin/placements/drives` | [`src/app/dashboard/institution-admin/placements/drives/page.tsx`](../../../src/app/dashboard/institution-admin/placements/drives/page.tsx) |
| `/dashboard/institution-admin/placements` | [`src/app/dashboard/institution-admin/placements/page.tsx`](../../../src/app/dashboard/institution-admin/placements/page.tsx) |
| `/dashboard/institution-admin/programs` | [`src/app/dashboard/institution-admin/programs/page.tsx`](../../../src/app/dashboard/institution-admin/programs/page.tsx) |
| `/dashboard/institution-admin/sections` | [`src/app/dashboard/institution-admin/sections/page.tsx`](../../../src/app/dashboard/institution-admin/sections/page.tsx) |
| `/dashboard/institution-admin/students` | [`src/app/dashboard/institution-admin/students/page.tsx`](../../../src/app/dashboard/institution-admin/students/page.tsx) |
| `/dashboard/institution-admin/subjects` | [`src/app/dashboard/institution-admin/subjects/page.tsx`](../../../src/app/dashboard/institution-admin/subjects/page.tsx) |
| `/dashboard/institution-admin/timetable/builder` | [`src/app/dashboard/institution-admin/timetable/builder/page.tsx`](../../../src/app/dashboard/institution-admin/timetable/builder/page.tsx) |
| `/dashboard/institution-admin/timetable` | [`src/app/dashboard/institution-admin/timetable/page.tsx`](../../../src/app/dashboard/institution-admin/timetable/page.tsx) |
| `/dashboard/institution-admin/warnings` | [`src/app/dashboard/institution-admin/warnings/page.tsx`](../../../src/app/dashboard/institution-admin/warnings/page.tsx) |
| `/dashboard/org-admin/events` | [`src/app/dashboard/org-admin/events/page.tsx`](../../../src/app/dashboard/org-admin/events/page.tsx) |
| `/dashboard/org-admin` | [`src/app/dashboard/org-admin/page.tsx`](../../../src/app/dashboard/org-admin/page.tsx) |
| `/dashboard/org-admin/placements` | [`src/app/dashboard/org-admin/placements/page.tsx`](../../../src/app/dashboard/org-admin/placements/page.tsx) |
| `/dashboard` | [`src/app/dashboard/page.tsx`](../../../src/app/dashboard/page.tsx) |
| `/dashboard/parent/events` | [`src/app/dashboard/parent/events/page.tsx`](../../../src/app/dashboard/parent/events/page.tsx) |
| `/dashboard/parent` | [`src/app/dashboard/parent/page.tsx`](../../../src/app/dashboard/parent/page.tsx) |
| `/dashboard/placements` | [`src/app/dashboard/placements/page.tsx`](../../../src/app/dashboard/placements/page.tsx) |
| `/dashboard/program-head/events` | [`src/app/dashboard/program-head/events/page.tsx`](../../../src/app/dashboard/program-head/events/page.tsx) |
| `/dashboard/program-head` | [`src/app/dashboard/program-head/page.tsx`](../../../src/app/dashboard/program-head/page.tsx) |
| `/dashboard/program-head/placements` | [`src/app/dashboard/program-head/placements/page.tsx`](../../../src/app/dashboard/program-head/placements/page.tsx) |
| `/dashboard/project-groups` | [`src/app/dashboard/project-groups/page.tsx`](../../../src/app/dashboard/project-groups/page.tsx) |
| `/dashboard/student/admissions` | [`src/app/dashboard/student/admissions/page.tsx`](../../../src/app/dashboard/student/admissions/page.tsx) |
| `/dashboard/student/assignments/[assignmentId]` | [`src/app/dashboard/student/assignments/[assignmentId]/page.tsx`](../../../src/app/dashboard/student/assignments/[assignmentId]/page.tsx) |
| `/dashboard/student/attendance` | [`src/app/dashboard/student/attendance/page.tsx`](../../../src/app/dashboard/student/attendance/page.tsx) |
| `/dashboard/student/billing` | [`src/app/dashboard/student/billing/page.tsx`](../../../src/app/dashboard/student/billing/page.tsx) |
| `/dashboard/student/events` | [`src/app/dashboard/student/events/page.tsx`](../../../src/app/dashboard/student/events/page.tsx) |
| `/dashboard/student/grades` | [`src/app/dashboard/student/grades/page.tsx`](../../../src/app/dashboard/student/grades/page.tsx) |
| `/dashboard/student` | [`src/app/dashboard/student/page.tsx`](../../../src/app/dashboard/student/page.tsx) |
| `/dashboard/student/placements` | [`src/app/dashboard/student/placements/page.tsx`](../../../src/app/dashboard/student/placements/page.tsx) |
| `/dashboard/student/quiz/[quizId]` | [`src/app/dashboard/student/quiz/[quizId]/page.tsx`](../../../src/app/dashboard/student/quiz/[quizId]/page.tsx) |
| `/dashboard/student/quizzes/[quizId]` | [`src/app/dashboard/student/quizzes/[quizId]/page.tsx`](../../../src/app/dashboard/student/quizzes/[quizId]/page.tsx) |
| `/dashboard/student/report-card` | [`src/app/dashboard/student/report-card/page.tsx`](../../../src/app/dashboard/student/report-card/page.tsx) |
| `/dashboard/student/subjects/[subjectId]/assignments/[assignmentId]` | [`src/app/dashboard/student/subjects/[subjectId]/assignments/[assignmentId]/page.tsx`](../../../src/app/dashboard/student/subjects/[subjectId]/assignments/[assignmentId]/page.tsx) |
| `/dashboard/student/subjects/[subjectId]` | [`src/app/dashboard/student/subjects/[subjectId]/page.tsx`](../../../src/app/dashboard/student/subjects/[subjectId]/page.tsx) |
| `/dashboard/student/subjects/[subjectId]/quizzes/[quizId]` | [`src/app/dashboard/student/subjects/[subjectId]/quizzes/[quizId]/page.tsx`](../../../src/app/dashboard/student/subjects/[subjectId]/quizzes/[quizId]/page.tsx) |
| `/dashboard/student/subjects` | [`src/app/dashboard/student/subjects/page.tsx`](../../../src/app/dashboard/student/subjects/page.tsx) |
| `/dashboard/student/timetable` | [`src/app/dashboard/student/timetable/page.tsx`](../../../src/app/dashboard/student/timetable/page.tsx) |
| `/dashboard/student/todo` | [`src/app/dashboard/student/todo/page.tsx`](../../../src/app/dashboard/student/todo/page.tsx) |
| `/dashboard/super-admin/analytics` | [`src/app/dashboard/super-admin/analytics/page.tsx`](../../../src/app/dashboard/super-admin/analytics/page.tsx) |
| `/dashboard/super-admin/audit-logs` | [`src/app/dashboard/super-admin/audit-logs/page.tsx`](../../../src/app/dashboard/super-admin/audit-logs/page.tsx) |
| `/dashboard/super-admin/events` | [`src/app/dashboard/super-admin/events/page.tsx`](../../../src/app/dashboard/super-admin/events/page.tsx) |
| `/dashboard/super-admin/institutions` | [`src/app/dashboard/super-admin/institutions/page.tsx`](../../../src/app/dashboard/super-admin/institutions/page.tsx) |
| `/dashboard/super-admin/org-admins` | [`src/app/dashboard/super-admin/org-admins/page.tsx`](../../../src/app/dashboard/super-admin/org-admins/page.tsx) |
| `/dashboard/super-admin/organizations` | [`src/app/dashboard/super-admin/organizations/page.tsx`](../../../src/app/dashboard/super-admin/organizations/page.tsx) |
| `/dashboard/super-admin` | [`src/app/dashboard/super-admin/page.tsx`](../../../src/app/dashboard/super-admin/page.tsx) |
| `/dashboard/super-admin/placements` | [`src/app/dashboard/super-admin/placements/page.tsx`](../../../src/app/dashboard/super-admin/placements/page.tsx) |
| `/dashboard/super-admin/settings` | [`src/app/dashboard/super-admin/settings/page.tsx`](../../../src/app/dashboard/super-admin/settings/page.tsx) |
| `/dashboard/teacher` | [`src/app/dashboard/teacher/page.tsx`](../../../src/app/dashboard/teacher/page.tsx) |
| `/features` | [`src/app/features/page.tsx`](../../../src/app/features/page.tsx) |
| `/meetings/[meetingCode]` | [`src/app/meetings/[meetingCode]/page.tsx`](../../../src/app/meetings/[meetingCode]/page.tsx) |
| `/` | [`src/app/page.tsx`](../../../src/app/page.tsx) |
| `/platform` | [`src/app/platform/page.tsx`](../../../src/app/platform/page.tsx) |
| `/resources` | [`src/app/resources/page.tsx`](../../../src/app/resources/page.tsx) |
| `/solutions` | [`src/app/solutions/page.tsx`](../../../src/app/solutions/page.tsx) |

## Route handlers (60)

| Current HTTP path | Methods in source | Source |
| --- | --- | --- |
| `/api/account/avatar` | POST, DELETE | [`src/app/api/account/avatar/route.ts`](../../../src/app/api/account/avatar/route.ts) |
| `/api/account/notifications` | GET, PUT | [`src/app/api/account/notifications/route.ts`](../../../src/app/api/account/notifications/route.ts) |
| `/api/account/notifications/test` | POST | [`src/app/api/account/notifications/test/route.ts`](../../../src/app/api/account/notifications/test/route.ts) |
| `/api/account/profile` | GET, PUT | [`src/app/api/account/profile/route.ts`](../../../src/app/api/account/profile/route.ts) |
| `/api/account/settings` | GET, PUT | [`src/app/api/account/settings/route.ts`](../../../src/app/api/account/settings/route.ts) |
| `/api/admissions/[id]/accept` | POST | [`src/app/api/admissions/[id]/accept/route.ts`](../../../src/app/api/admissions/[id]/accept/route.ts) |
| `/api/admissions/[id]/agreement` | POST | [`src/app/api/admissions/[id]/agreement/route.ts`](../../../src/app/api/admissions/[id]/agreement/route.ts) |
| `/api/admissions/[id]/enrolment` | GET, POST | [`src/app/api/admissions/[id]/enrolment/route.ts`](../../../src/app/api/admissions/[id]/enrolment/route.ts) |
| `/api/admissions/[id]/offer` | POST | [`src/app/api/admissions/[id]/offer/route.ts`](../../../src/app/api/admissions/[id]/offer/route.ts) |
| `/api/admissions/[id]` | GET, PATCH | [`src/app/api/admissions/[id]/route.ts`](../../../src/app/api/admissions/[id]/route.ts) |
| `/api/admissions/configuration` | GET, POST | [`src/app/api/admissions/configuration/route.ts`](../../../src/app/api/admissions/configuration/route.ts) |
| `/api/admissions/my` | GET | [`src/app/api/admissions/my/route.ts`](../../../src/app/api/admissions/my/route.ts) |
| `/api/admissions/public-apply` | GET, POST | [`src/app/api/admissions/public-apply/route.ts`](../../../src/app/api/admissions/public-apply/route.ts) |
| `/api/admissions/public-status` | GET, POST | [`src/app/api/admissions/public-status/route.ts`](../../../src/app/api/admissions/public-status/route.ts) |
| `/api/admissions` | GET, POST | [`src/app/api/admissions/route.ts`](../../../src/app/api/admissions/route.ts) |
| `/api/ai/chat` | POST | [`src/app/api/ai/chat/route.ts`](../../../src/app/api/ai/chat/route.ts) |
| `/api/assistant/chat` | POST | [`src/app/api/assistant/chat/route.ts`](../../../src/app/api/assistant/chat/route.ts) |
| `/api/assistant/public` | POST | [`src/app/api/assistant/public/route.ts`](../../../src/app/api/assistant/public/route.ts) |
| `/api/assistant/thread` | POST | [`src/app/api/assistant/thread/route.ts`](../../../src/app/api/assistant/thread/route.ts) |
| `/api/assistant/threads/[threadId]` | GET | [`src/app/api/assistant/threads/[threadId]/route.ts`](../../../src/app/api/assistant/threads/[threadId]/route.ts) |
| `/api/assistant/threads` | GET | [`src/app/api/assistant/threads/route.ts`](../../../src/app/api/assistant/threads/route.ts) |
| `/api/auth/profile` | GET | [`src/app/api/auth/profile/route.ts`](../../../src/app/api/auth/profile/route.ts) |
| `/api/bulk-import` | POST | [`src/app/api/bulk-import/route.ts`](../../../src/app/api/bulk-import/route.ts) |
| `/api/dashboard/events` | GET | [`src/app/api/dashboard/events/route.ts`](../../../src/app/api/dashboard/events/route.ts) |
| `/api/dashboard/placements` | GET | [`src/app/api/dashboard/placements/route.ts`](../../../src/app/api/dashboard/placements/route.ts) |
| `/api/departments/[id]` | DELETE | [`src/app/api/departments/[id]/route.ts`](../../../src/app/api/departments/[id]/route.ts) |
| `/api/departments` | GET, POST | [`src/app/api/departments/route.ts`](../../../src/app/api/departments/route.ts) |
| `/api/events/[id]` | PATCH, DELETE | [`src/app/api/events/[id]/route.ts`](../../../src/app/api/events/[id]/route.ts) |
| `/api/events/register` | POST, DELETE | [`src/app/api/events/register/route.ts`](../../../src/app/api/events/register/route.ts) |
| `/api/events` | GET, POST | [`src/app/api/events/route.ts`](../../../src/app/api/events/route.ts) |
| `/api/events/upload` | POST, DELETE | [`src/app/api/events/upload/route.ts`](../../../src/app/api/events/upload/route.ts) |
| `/api/faculty/[id]` | PUT, DELETE | [`src/app/api/faculty/[id]/route.ts`](../../../src/app/api/faculty/[id]/route.ts) |
| `/api/faculty` | POST, GET | [`src/app/api/faculty/route.ts`](../../../src/app/api/faculty/route.ts) |
| `/api/faculty-subjects` | POST | [`src/app/api/faculty-subjects/route.ts`](../../../src/app/api/faculty-subjects/route.ts) |
| `/api/internal/knowledge/worker` | POST, GET | [`src/app/api/internal/knowledge/worker/route.ts`](../../../src/app/api/internal/knowledge/worker/route.ts) |
| `/api/invite-user` | POST | [`src/app/api/invite-user/route.ts`](../../../src/app/api/invite-user/route.ts) |
| `/api/knowledge/documents/[documentId]/status` | GET | [`src/app/api/knowledge/documents/[documentId]/status/route.ts`](../../../src/app/api/knowledge/documents/[documentId]/status/route.ts) |
| `/api/knowledge/documents` | POST | [`src/app/api/knowledge/documents/route.ts`](../../../src/app/api/knowledge/documents/route.ts) |
| `/api/mobile/v1/me` | GET | [`src/app/api/mobile/v1/me/route.ts`](../../../src/app/api/mobile/v1/me/route.ts) |
| `/api/org-features` | GET | [`src/app/api/org-features/route.ts`](../../../src/app/api/org-features/route.ts) |
| `/api/parents/[id]` | PUT, DELETE | [`src/app/api/parents/[id]/route.ts`](../../../src/app/api/parents/[id]/route.ts) |
| `/api/parents/relations` | GET, POST, DELETE | [`src/app/api/parents/relations/route.ts`](../../../src/app/api/parents/relations/route.ts) |
| `/api/parents` | POST, GET | [`src/app/api/parents/route.ts`](../../../src/app/api/parents/route.ts) |
| `/api/programs/[id]` | GET, PUT, DELETE | [`src/app/api/programs/[id]/route.ts`](../../../src/app/api/programs/[id]/route.ts) |
| `/api/programs` | POST, GET | [`src/app/api/programs/route.ts`](../../../src/app/api/programs/route.ts) |
| `/api/sections/[id]` | GET, PUT, DELETE | [`src/app/api/sections/[id]/route.ts`](../../../src/app/api/sections/[id]/route.ts) |
| `/api/sections` | POST, GET | [`src/app/api/sections/route.ts`](../../../src/app/api/sections/route.ts) |
| `/api/send-email` | POST | [`src/app/api/send-email/route.ts`](../../../src/app/api/send-email/route.ts) |
| `/api/students/[id]/documents/[documentId]` | GET, PATCH | [`src/app/api/students/[id]/documents/[documentId]/route.ts`](../../../src/app/api/students/[id]/documents/[documentId]/route.ts) |
| `/api/students/[id]/documents` | GET, POST | [`src/app/api/students/[id]/documents/route.ts`](../../../src/app/api/students/[id]/documents/route.ts) |
| `/api/students/[id]/portal-access` | GET, POST | [`src/app/api/students/[id]/portal-access/route.ts`](../../../src/app/api/students/[id]/portal-access/route.ts) |
| `/api/students/[id]/profile` | GET, PATCH | [`src/app/api/students/[id]/profile/route.ts`](../../../src/app/api/students/[id]/profile/route.ts) |
| `/api/students/[id]` | PUT, DELETE | [`src/app/api/students/[id]/route.ts`](../../../src/app/api/students/[id]/route.ts) |
| `/api/students` | GET, POST | [`src/app/api/students/route.ts`](../../../src/app/api/students/route.ts) |
| `/api/subjects/[id]` | PUT, DELETE | [`src/app/api/subjects/[id]/route.ts`](../../../src/app/api/subjects/[id]/route.ts) |
| `/api/subjects` | POST, GET | [`src/app/api/subjects/route.ts`](../../../src/app/api/subjects/route.ts) |
| `/api/super-admin/impersonate` | POST | [`src/app/api/super-admin/impersonate/route.ts`](../../../src/app/api/super-admin/impersonate/route.ts) |
| `/api/super-admin/impersonate-options` | GET | [`src/app/api/super-admin/impersonate-options/route.ts`](../../../src/app/api/super-admin/impersonate-options/route.ts) |
| `/api/super-admin/impersonated-users` | GET | [`src/app/api/super-admin/impersonated-users/route.ts`](../../../src/app/api/super-admin/impersonated-users/route.ts) |
| `/api/timetable/settings` | GET, POST | [`src/app/api/timetable/settings/route.ts`](../../../src/app/api/timetable/settings/route.ts) |

## Server Actions and non-API handlers

| Source | Domain |
| --- | --- |
| [`src/app/actions/announcements.ts`](../../../src/app/actions/announcements.ts) | announcements |
| [`src/app/actions/assignments.ts`](../../../src/app/actions/assignments.ts) | assignments |
| [`src/app/actions/auth.ts`](../../../src/app/actions/auth.ts) | auth |
| [`src/app/actions/code-runner.ts`](../../../src/app/actions/code-runner.ts) | code-runner |
| [`src/app/actions/gradebook.ts`](../../../src/app/actions/gradebook.ts) | gradebook |
| [`src/app/actions/meetings.ts`](../../../src/app/actions/meetings.ts) | meetings |
| [`src/app/actions/project-groups.ts`](../../../src/app/actions/project-groups.ts) | project-groups |
| [`src/app/dashboard/faculty/attendance/actions.ts`](../../../src/app/dashboard/faculty/attendance/actions.ts) | attendance |
| [`src/app/dashboard/student/attendance/actions.ts`](../../../src/app/dashboard/student/attendance/actions.ts) | attendance |
| [`src/app/dashboard/super-admin/actions.ts`](../../../src/app/dashboard/super-admin/actions.ts) | super-admin |
| [`src/app/auth/callback/route.ts`](../../../src/app/auth/callback/route.ts) | callback |

Convert required Server Actions to explicit authenticated mobile HTTP contracts. The auth callback is a web redirect handler and needs a native deep-link flow. `src/proxy.ts` is an HTTP gate for web routes, not a native session layer.
