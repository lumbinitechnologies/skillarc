# Team and sprint delivery

**Audience:** Keane and the eight captains. All eight groups of three report directly to Keane. Each names one captain. Sai Kiran is a separate solo contributor reporting to Keane; he has no group-lead or default PR-approval role. Nikhil primarily owns SkillArc server tickets. Interns work only in [skillarc-mobile](https://github.com/lumbinitechnologies/skillarc-mobile).

| Group | Sole mobile feature ownership | Boundary |
| --- | --- | --- |
| G1 | Shell, role navigation and route composition | Consumes Keane-owned auth/API modules; does not configure Supabase or Expo. |
| G2 | Student home, courses, timetable, to-do | No attendance, assignment or grade logic. |
| G3 | Student/faculty assignments, submissions and file UI | No course resource or gradebook implementation. |
| G4 | Faculty course content, resources and announcements | No assignment authoring or attendance logic. |
| G5 | Student/faculty attendance and leave UI | Server owns totals and write rules. |
| G6 | Faculty gradebook and student report-card UI | Server owns official totals and release state. |
| G7 | Parent child selection and parent views | Consumes approved timetable/attendance/grade data; never reimplements calculations. |
| G8 | Design tokens, native controls, accessibility and device test harness | Reports feature defects to the owning group. |

Keane owns `src/auth`, `src/api`, app configuration/EAS, Supabase setup, contracts, and cross-group architecture. Sai takes explicitly assigned solo issues in either repository. Nikhil is primary SkillArc API implementer. A group changing another group's file needs that group's review and Keane's approval; each GitHub issue states allowed paths.

## One-week sprints

The existing Apex `SCRUM` board holds six distinct **Mobile R1 W01–W06** sprints, Wednesday–Tuesday in India time. Leave the web issues in `SCRUM Sprint 1` untouched. Jira group tickets belong to Keane, backend to Nikhil, and Sai only to his own solo tickets. GitHub issues and PRs show individual intern work.

| Sprint | Dates, 2026 | Exit result |
| --- | --- | --- |
| W01 | 30 Sep–6 Oct | Repo controls and dev builds; G1 shell; each feature group has fixture-backed UI; verified auth/profile contract. |
| W02 | 7–13 Oct | Device sign-in/recovery, role navigation, and one approved read slice per feature group. |
| W03 | 14–20 Oct | Core reads and cross-role authorization, including linked-child views. |
| W04 | 21–27 Oct | Submission/leave and faculty attendance/content/grading writes, with retries and idempotency. |
| W05 | 28 Oct–3 Nov | End-to-end, poor-network, expiry, accessibility and device regression. |
| W06 | 4–10 Nov | Internal candidate, privacy/security review, pilot feedback and release/defer decision. |

W03–W06 remain goals until prior contract/device gates pass. Keane creates the next week's detailed issues at Tuesday review.

## Existing Jira work

| Stream | Epic | W01 | W02 |
| --- | --- | --- | --- |
| G1 | [SCRUM-17](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-17) | [SCRUM-26](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-26) | [SCRUM-35](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-35) |
| G2 | [SCRUM-18](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-18) | [SCRUM-27](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-27) | [SCRUM-36](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-36) |
| G3 | [SCRUM-19](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-19) | [SCRUM-28](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-28) | [SCRUM-37](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-37) |
| G4 | [SCRUM-20](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-20) | [SCRUM-29](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-29) | [SCRUM-38](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-38) |
| G5 | [SCRUM-21](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-21) | [SCRUM-30](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-30) | [SCRUM-39](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-39) |
| G6 | [SCRUM-22](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-22) | [SCRUM-31](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-31) | [SCRUM-40](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-40) |
| G7 | [SCRUM-23](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-23) | [SCRUM-32](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-32) | [SCRUM-41](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-41) |
| G8 | [SCRUM-24](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-24) | [SCRUM-33](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-33) | [SCRUM-42](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-42) |
| Server | [SCRUM-25](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-25) | [SCRUM-34](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-34) | [SCRUM-43](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-43) |

[SCRUM-44](https://lumbinitechnologies-team.atlassian.net/browse/SCRUM-44) is Keane's W01 governance task. W01/W02 group tasks need matching GitHub issues; interns need no Jira account.

## Cadence

- **29 Sep kickoff:** Keane, Sai, Nikhil and captains confirm roster, W01 issues, dependencies and device demos; Keane explicitly assigns Sai's first solo ticket.
- **Wednesday:** plan one demonstrable result per group. **Daily:** captain comments done/next/blocker on the GitHub issue. **Monday:** Keane, Sai and Nikhil resolve contracts/dependencies. **Tuesday:** demos, retrospective and Jira updates.
- Every work packet has one Jira key, one GitHub issue, one group, allowed paths, approved fixture or API revision, acceptance criteria and Android/iOS evidence. Missing APIs become linked SkillArc contract requests; interns continue fixture, failure-state, accessibility or test work within their boundary.
