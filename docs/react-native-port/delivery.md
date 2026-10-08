# Solo delivery roadmap

Keane implements the Expo app and owns mobile integration, Supabase/Expo configuration, and PR preparation. The independent `@lumbinitechnologies` account reviews Keane's mobile PRs. Nikhil may implement approved SkillArc server handlers under the separate [backend epic SCRUM-25](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-25). Sai and the former eight groups have no mobile assignments.

The [solo epic SCRUM-45](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-45) is the active Jira parent. [GitHub Project SkillArc Mobile R1](https://github.com/users/lumbinitechnologies/projects/1) is the daily board. Only governance and the first integrated slice enter W01; move later work from Backlog when its contract and device dependencies are ready.

| Week | India dates, 2026 | Planning goal |
| --- | --- | --- |
| W01 | 7–13 Oct | [Governance SCRUM-44](https://github.com/lumbinitechnologies/skillarc-mobile/issues/9) and [staging/build slice SCRUM-47](https://github.com/lumbinitechnologies/skillarc-mobile/issues/20). |
| W02 | 14–20 Oct | [Sign-in and role navigation SCRUM-46](https://github.com/lumbinitechnologies/skillarc-mobile/issues/21). |
| W03 | 21–27 Oct | Prioritized student read flows after server authorization passes. |
| W04 | 28 Oct–3 Nov | Faculty and parent read flows using approved contracts. |
| W05 | 4–10 Nov | Approved writes, attachments, retries and idempotency. |
| W06 | 11–17 Nov | Device, accessibility, privacy and network QA; decide the next candidate date from evidence. |

These are unstarted sprints on the existing Apex `SCRUM` board. The separate web sprint is unchanged. A date is **not** a release promise.

## Prioritized backlog

| Area | Jira | GitHub issue |
| --- | --- | --- |
| Student academics | SCRUM-48 | [Courses, timetable, to-do](https://github.com/lumbinitechnologies/skillarc-mobile/issues/22) |
| Assignments | SCRUM-50 | [Assignments and submissions](https://github.com/lumbinitechnologies/skillarc-mobile/issues/23) |
| Faculty content | SCRUM-51 | [Courses, resources, announcements](https://github.com/lumbinitechnologies/skillarc-mobile/issues/24) |
| Attendance | SCRUM-49 | [Attendance and leave](https://github.com/lumbinitechnologies/skillarc-mobile/issues/25) |
| Results | SCRUM-53 | [Grades and reports](https://github.com/lumbinitechnologies/skillarc-mobile/issues/26) |
| Parent | SCRUM-54 | [Linked-child views](https://github.com/lumbinitechnologies/skillarc-mobile/issues/27) |
| Faculty writes | SCRUM-55 | [Grading and publication](https://github.com/lumbinitechnologies/skillarc-mobile/issues/28) |
| Quality | SCRUM-52 | [Device and release QA](https://github.com/lumbinitechnologies/skillarc-mobile/issues/29) |

At each Tuesday review, Keane updates Jira from GitHub, chooses only the next feasible slice, and checks API dependencies with Nikhil. The old G1–G8 issues link to successors and remain closed; their Jira tasks and epics are On Hold and labelled `mobile-plan-superseded`.
