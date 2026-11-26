# Mobile delivery sequence

[Mobile v1 scope](https://github.com/lumbinitechnologies/skillarc-mobile/blob/main/docs/product/mobile-v1.md) governs product commitments. [GitHub Project SkillArc Mobile R1](https://github.com/users/lumbinitechnologies/projects/1) is the sole active tracker across the mobile and server repositories. Jira references and old W01–W06 intervals are historical; they are not active sprint commitments or a release promise. Do not update Jira as part of mobile delivery.

Keane owns the current mobile and server work; @lumbinitechnologies independently reviews. Nikhil may take separately approved server work. Former groups have no mobile assignments.

## Dependency order

1. Review the scope, backlog reconciliation and GitHub-only governance transition through mobile #9; review these server guide changes separately.
2. Implement and review student academic read contracts and scoped handlers with synthetic fixtures/security tests.
3. Deliver mobile #22 from the approved generated contract: courses, timetable and all pending task summaries.
4. Deliver faculty reads, timetable/rosters, student/faculty content and role homes using the tracked contract dependencies.
5. Deliver student/faculty attendance, leave and regular assignment submissions with retry/conflict/file/audit coverage.
6. Deliver student released results; collect platform-specific QA and dependency/security triage before a release decision.

The [reconciliation register](https://github.com/lumbinitechnologies/skillarc-mobile/blob/main/docs/product/backlog-reconciliation.md) contains exact issue links and dispositions. Parent delivery, complex authoring and grading/publication stay in later-release backlog. Do not put feature items in Ready until their approved contract or synthetic fixture and preceding scope/governance gates exist. Server contract work can become Ready after the scope is reviewed.

## Review and evidence

Use one GitHub work item per PR and link cross-repository dependencies. Keane records tests, AI assistance and manual verification; the reviewer independently approves. No calendar-based automatic advancement. Check Android/iOS separately and retain the explicit mobile #39 deferral. Before real-data use, enforce the private environment/security gates in [architecture](architecture.md).
