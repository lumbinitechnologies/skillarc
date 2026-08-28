# Student & Admissions Workflow — Feature Status

**Workflows covered:** 2. Student creation and profile management; 3. Application, offer and enrolment process
**Review date:** 26 August 2026

## Overall status

| Status | Count | Meaning |
| --- | ---: | --- |
| Complete | 26 | The requested capability has a connected UI/API/data path in the current branch. |
| Partial | 0 | No in-scope capability remains partially implemented in the current branch review. |
| Not evidenced | 1 | No demonstrable implementation was found in the current repository review. |

**Assessment:** The branch now contains a connected student profile, private document workflow, admissions lifecycle from application through offer and agreement, acceptance, qualification enrolment, unit/timetable allocation, and portal activation. The sole unimplemented capability remains VET/AVETMISS because its authoritative field contract was intentionally withheld. Production document use also remains subject to the malware-scanner deployment gate recorded in `docs/student-document-storage-policy.md`.

## Status method and reference note

- **Complete:** The requested capability has a connected UI/API/data path in the current branch. Runtime deployment or production data is not implied.
- **Partial:** Some related UI, schema, or workflow support exists, but a requested field, connection, action, or end-to-end step is missing.
- **Not evidenced:** No demonstrable implementation was found in the repository review. Confirm whether it exists in an external service before treating it as a build item.

The supplied workflow is treated as the authoritative requirement. The current Student register/profile flow was used as the baseline for the types of information already recorded. Screenshot files were not present in the project workspace, so the status evidence below is based on repository UI and schema inspection rather than image-level comparison.

## 2. Student creation and profile management

| ID | Required capability | Status | Evidence / gap |
| --- | --- | --- | --- |
| 2.1 | Create a new student or contact | **Complete** | The Institution Admin register supports student creation, CRUD, CSV import, invitation, and guardian/contact creation/linking; admissions can also link an existing student or create an applicant record. |
| 2.2 | Enter personal and contact details | **Complete** | The Student Drawer now edits name, phone, DOB, gender, registration number, and admission year through the profile API; the creation and admissions forms provide the initial identity/contact path. |
| 2.3 | Enter residential and postal addresses | **Complete** | `student_addresses` stores current residential and postal records, the API validates/upserts them, and the Student Drawer exposes both grouped address editors. |
| 2.4 | Record passport, visa, citizenship, and country-of-birth details | **Complete** | `student_profile_details` stores the explicit citizenship, birth-country, passport, and visa fields; the Student Drawer exposes the corresponding controls with institution-scoped assignment validation. |
| 2.5 | Record English-language evidence | **Complete** | English evidence type, reference, and date round-trip through the profile API and are editable in the Student Drawer. |
| 2.6 | Enter VET and AVETMISS-related information | **Not evidenced** | No VET/AVETMISS data fields or workflow were found in the current student model or UI. |
| 2.7 | Record the USI and other student identifiers | **Complete** | `usi` and `other_identifiers` are stored by the profile API and editable in the Student Drawer. VET/AVETMISS-specific identifiers remain excluded under 2.6. |
| 2.8 | Assign the education agent and marketing staff member | **Complete** | Institution-scoped education-agent and internal marketing-staff options are loaded into the profile editor; the API validates both institution and role before saving assignments. |
| 2.9 | Add emergency-contact and parent or guardian details | **Complete** | Parent/guardian creation/linking remains separate, while the Student Drawer and API manage up to three normalized emergency contacts with priority and primary-contact constraints. |
| 2.10 | Upload and categorise supporting documents: passport; visa; English evidence; academic documents; signed application; student request forms; other supporting evidence | **Complete** | The Student Drawer Documents tab calls the storage-backed student-document API, supports all requested categories, versioning, checksums, review status, and admin upload/review actions. |
| 2.11 | View all uploaded documents from the student profile | **Complete** | The Student Drawer now includes a Documents tab with listing and signed-download actions backed by `/api/students/[id]/documents`. |
| 2.12 | Maintain notes, communication records, and a complete activity history | **Complete** | The Student Drawer provides note and communication forms, profile mutations write audit events, and the activity tab renders the server-backed reverse-chronological audit history with an empty state. |

### Current profile baseline

| Current area | Observed fields or behavior | Assessment |
| --- | --- | --- |
| Identity and contact | Full name, email, phone, registration number, admission year; student invitation/user creation. | Basic student record is present; requested compliance depth is not. |
| Academic placement | Program, semester, section; program- and section-filtered student list. | Useful foundation for qualification/class placement. |
| Parent/guardian | Parent/guardian name, email, phone, relationship; `parent_student_relations` lookup and creation/linking. | Guardian path exists; emergency contact is separate work. |
| Profile review | Student Drawer with Profile, Attendance, Subjects, Guardian, Documents, Portal, and Activity tabs. | Documents and portal actions are connected; compliance-field editing and live notes/communications/activity presentation remain incomplete. |

## 3. Application, offer and enrolment process

| ID | Required capability | Status | Evidence / gap |
| --- | --- | --- | --- |
| 3.1 | Create and process the student application | **Complete** | The institution admissions UI and authenticated API support student linking/creation, institution-scoped fee/template configuration, search, lifecycle transitions, offer/agreement generation, acceptance, and qualification enrolment; the student page reads and accepts through secured API routes. |
| 3.2 | Select and assign the GDM qualification | **Complete** | The qualification is represented by the institution-scoped `programs` record selected on the application and preserved by the enrolment RPC; the admissions UI requires an explicit qualification selection and server-side tenant validation. |
| 3.3 | Assign the student to an intake | **Complete** | Intake is required when creating an application, carried through the enrolment form/RPC, and persisted to both `students.intake_id` and `enrolments.intake_id` with institution checks. |
| 3.4 | Enter course commencement and completion dates | **Complete** | The application defaults dates from the selected intake, the enrolment dialog allows course start/end input, and the conversion RPC validates the dates against the intake and each other. |
| 3.5 | Generate a sample offer letter using a customised template | **Complete** | The admissions page exposes institution-scoped fee/template administration with allow-listed merge fields; the generation RPC creates versioned offer HTML and the student page renders it in a sandboxed document frame. |
| 3.6 | Generate or upload the student agreement | **Complete** | Offer generation creates a versioned agreement, the admin upload route remains available, and the student admissions page retrieves and displays the agreement alongside the acceptance confirmation. |
| 3.7 | Record the acceptance of the offer | **Complete** | The admissions UI exposes Accept/Decline actions, the acceptance API/RPC restricts the actor and valid transition, updates the offer signature metadata, and writes status/audit history. |
| 3.8 | Enrol the student into the qualification | **Complete** | The Confirm enrolment dialog calls a transactional RPC that creates/updates the student, creates an `enrolments` row, creates payment-plan/invoice records, and moves the application to `ENROLLED`. |
| 3.9 | Assign all units to the student | **Complete** | The enrolment dialog lists every program subject; the RPC rejects incomplete or duplicate unit payloads and creates `enrolment_units` for the complete catalog. |
| 3.10 | Set planned unit commencement and completion dates | **Complete** | Each unit has required planned start/end inputs and the RPC rejects invalid date ranges before creating the unit allocations. |
| 3.11 | Allocate the student to a class or group | **Complete** | The enrolment dialog requires a section/class, and the RPC validates program, institution, and semester before persisting `enrolments.section_id`. |
| 3.12 | Assign the trainer | **Complete** | The enrolment dialog selects an active institution-scoped faculty trainer; the RPC validates the trainer and stores it on the enrolment and unit allocations. |
| 3.13 | Assign the timetable | **Complete** | The dialog requires one timetable slot per unit filtered by section, subject, and trainer; the RPC validates and persists each assignment in `enrolment_timetable_slots`. |
| 3.14 | Activate the student portal login | **Complete** | Admins can invite/resend/deactivate from the Student Drawer; the callback marks successful invited sessions active, and the student dashboard layout rejects inactive/deactivated portal access. |
| 3.15 | Auto-populate generated documents from profile, course, intake, and fee setup without re-entry | **Complete** | Versioned offer/agreement generation reuses application, qualification, intake, course dates, fee, and approved non-binary profile compliance fields through an allow-listed merge pipeline; the student page presents the generated documents without re-entry. VET/AVETMISS fields remain blocked under 2.6. |

## Cross-workflow data reuse assessment

The requested experience depends on one connected record rather than repeated data entry. The current implementation has several links, but not a complete merge-field/document pipeline.

| Data relationship | Observed behavior | Status |
| --- | --- | --- |
| Profile → application | Existing students can be selected by institution admins and their identity/contact data is reused; generated documents additionally read the approved profile compliance fields through the allow-listed pipeline. | **Complete** |
| Program/qualification → offer | The application links to institution-scoped program/intake records and offer generation uses configured fee and offer/agreement templates with allow-listed merge fields. | **Complete** |
| Offer fee → finance | Qualification conversion reads the institution-scoped fee configuration and creates/updates a payment plan plus three invoices transactionally. | **Complete** |
| Application → student | Qualification conversion links or creates the student, writes program/section/intake placement, creates qualification enrolment, units, timetable assignments, and moves the application to `ENROLLED`. | **Complete** |
| Profile/course/intake/fees → generated documents | Versioned offer/agreement generation reuses approved profile, course, intake, and fee fields; the student-facing page retrieves and safely frames both generated documents. | **Complete** |

## Recommended implementation backlog

| Priority | Build area | Outcome required for the requested demonstration |
| ---: | --- | --- |
| 1 | VET/AVETMISS contract | Obtain the approved field inventory, allowed values, requiredness, and validation rules; then implement only that contract. |
| 2 | Malware scanning deployment gate | Configure and evidence a scanner adapter before treating uploaded student documents as production-cleared evidence. |
| 3 | Deployment proof | Run the full browser workflow and storage smoke test in a disposable environment, then retain the Supabase RLS/policy/advisor evidence. |

## Evidence reviewed

| Repository area | Why it matters |
| --- | --- |
| `src/app/dashboard/institution-admin/students/students-client.tsx` | Student CRUD, import, search/filtering, profile drawer, and create/edit dialog wiring. |
| `src/components/students/create-student-dialog.tsx` | Current identity, academic, and parent/guardian form fields. |
| `src/modules/students/components/StudentDrawer.tsx` | Profile tabs, guardian lookup, and activity/document gap indicators. |
| `src/app/api/students/route.ts` and `src/app/api/parents/relations/route.ts` | Student creation/invitation, parent creation/linking, and relation lookup. |
| `src/app/dashboard/institution-admin/admissions/page.tsx` | Application creation, document checklist review, offer record creation, status display, enrollment trigger, and payment-plan creation. |
| `src/app/api/admissions/**` | Institution-scoped application transitions, offer/agreement generation/upload, acceptance, and qualification-enrolment endpoints. |
| `migrations/008_task09_student_documents.sql` – `migrations/017_task_review_trigger_permissions.sql` | Structured student profile/document storage, lifecycle configuration, enrolment/portal tables and functions, focused RLS hardening, application linkage, offer currency, and profile merge-field controls. |
| `src/modules/students/components/StudentDrawer.tsx` | Profile editing shell, document upload/review/download, portal invitation/deactivation, and the remaining activity placeholder. |
| `src/lib/portal-access.ts` and `src/app/auth/callback/route.ts` | Portal invitation state machine and callback-driven activation gate. |
| `src/lib/student-access.ts` | Shared student/profile/document authorization matrix and response redaction. |
| `src/app/dashboard/institution-admin/intakes/page.tsx` | Intake cohort creation and enrollment counts. |
| `skillarc_schema_v1.sql` | Students, intakes, enrolments, admissions applications, admission documents, offer letters, payments, and parent relations data model. |

## Verification notes

- TypeScript compilation, targeted authorization/migration/portal tests, targeted ESLint, and diff checks pass for this branch.
- Supabase MCP was used with the user’s authorization against the connected development project. Migrations `task_review_security`, `student_document_linkage`, `task_review_admissions_hardening`, `task_review_profile_merge_fields`, and `task_review_trigger_permissions` were applied; RLS, policy definitions, the private bucket, offer currency/trigger, and admission status counts were rechecked. This is development evidence, not production deployment proof.
- A disposable/local storage smoke test and malware-scanner integration are not available in the workspace, so the documented production gate remains open.
- Existing repository-wide Supabase advisor findings for unrelated RLS-disabled tables remain outside this feature status update.
