# Task 08 — Student profile validation

Validation date: 26 August 2026.

## Evidence

- `migrations/009_task08_student_profile.sql` provides normalized profile
  details, residential/postal addresses, emergency contacts, notes,
  communications, institution indexes, and current/primary uniqueness rules.
- `src/app/api/students/[id]/profile/route.ts` is server-authorized, derives
  the actor from `getCurrentUserContext`, validates institution-owned agent and
  marketing-staff assignments, persists partial updates, and records audit
  events.
- `src/modules/students/components/StudentDrawer.tsx` exposes identity,
  academic, immigration, identifiers, agent/marketing, addresses, emergency
  contacts, notes, communications, and live audit activity.
- `src/lib/student-access.ts` and `src/lib/student-access.test.ts` cover the
  self, institution-admin, global-admin, academic-staff, and cross-institution
  access matrix. Academic staff receive only identity/academic fields.
- The general student list/update/delete routes now force institution scope for
  non-global actors and reject unauthorized roles.

## Checks

- `npx tsc --noEmit --pretty false` passed.
- Targeted ESLint passed for the changed profile/student/admissions/document
  files.
- `node --import tsx --test src/lib/student-access.test.ts` passed.
- `git diff --check` passed.
- Supabase MCP confirmed RLS enabled on the five profile tables and
  `student_documents`; the focused profile SELECT policies are self/global
  admin/institution-admin scoped.

## Deliberate blocker

The `profile-vet-avetmiss` checkpoint remains blocked by `STU-001`. No
VET/AVETMISS fields, permissive JSON substitute, or guessed validation rules
were added.
