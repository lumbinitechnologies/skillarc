import assert from "node:assert/strict"
import test from "node:test"
import { canReadAssignmentFile, facultyHasAssignmentSectionAccess, studentHasAssignmentAccess } from "./private-storage-access"

const today = "2026-11-02"

test("formal enrollment and an active unit authorize an assignment file", () => {
  const input = {
    studentInstitutionId: "institution-a",
    assignmentInstitutionId: "institution-a",
    studentSectionId: "section-a",
    hasSectionCourseRelationship: false,
    assignmentSectionIds: ["section-a"],
    subjectId: "subject-a",
    today,
    enrolments: [{ id: "enrolment-a", status: "ACTIVE", started_at: "2026-01-01", ended_at: null, section_id: "section-a" }],
    units: [{ enrolment_id: "enrolment-a", subject_id: "subject-a", status: "ACTIVE", planned_start: "2026-09-01", planned_end: "2027-01-01" }],
  }
  assert.equal(studentHasAssignmentAccess(input), true)
  assert.equal(studentHasAssignmentAccess({ ...input, assignmentSectionIds: ["section-b"] }), false)
})

test("formal enrollment section governs access when the profile section differs", () => {
  const input = {
    studentInstitutionId: "institution-a",
    assignmentInstitutionId: "institution-a",
    studentSectionId: "stale-profile-section",
    hasSectionCourseRelationship: false,
    assignmentSectionIds: ["enrolled-section"],
    subjectId: "subject-a",
    today,
    enrolments: [{ id: "enrolment-a", status: "ENROLLED", started_at: "2026-01-01", ended_at: null, section_id: "enrolled-section" }],
    units: [{ enrolment_id: "enrolment-a", subject_id: "subject-a", status: "ACTIVE", planned_start: "2026-09-01", planned_end: "2027-01-01" }],
  }
  assert.equal(studentHasAssignmentAccess(input), true)
})

test("section fallback is allowed only when no formal enrollment exists", () => {
  const input = {
    studentInstitutionId: "institution-a",
    assignmentInstitutionId: "institution-a",
    studentSectionId: "section-a",
    hasSectionCourseRelationship: true,
    assignmentSectionIds: ["section-a"],
    subjectId: "subject-a",
    today,
    enrolments: [] as Array<{ id: string; status: string; started_at: string; ended_at: string | null; section_id: string | null }>,
    units: [],
  }
  assert.equal(studentHasAssignmentAccess(input), true)
  assert.equal(studentHasAssignmentAccess({ ...input, studentSectionId: "section-b" }), false)
  assert.equal(studentHasAssignmentAccess({ ...input, hasSectionCourseRelationship: false }), false)
  assert.equal(studentHasAssignmentAccess({ ...input, assignmentSectionIds: null }), true)
})

test("ineligible formal enrollment blocks section fallback", () => {
  assert.equal(studentHasAssignmentAccess({
    studentInstitutionId: "institution-a",
    assignmentInstitutionId: "institution-a",
    studentSectionId: "section-a",
    hasSectionCourseRelationship: true,
    assignmentSectionIds: ["section-a"],
    subjectId: "subject-a",
    today,
    enrolments: [{ id: "enrolment-a", status: "WITHDRAWN", started_at: "2026-01-01", ended_at: null, section_id: "section-a" }],
    units: [],
  }), false)
})

test("wrong, inactive, and out-of-date units do not grant course access", () => {
  const input = {
    studentInstitutionId: "institution-a",
    assignmentInstitutionId: "institution-a",
    studentSectionId: "section-a",
    hasSectionCourseRelationship: true,
    assignmentSectionIds: ["section-a"],
    subjectId: "subject-a",
    today,
    enrolments: [{ id: "enrolment-a", status: "ENROLLED", started_at: "2026-01-01", ended_at: null, section_id: "section-a" }],
    units: [
      { enrolment_id: "enrolment-a", subject_id: "subject-a", status: "COMPLETED", planned_start: "2026-09-01", planned_end: "2027-01-01" },
      { enrolment_id: "enrolment-a", subject_id: "subject-a", status: "ACTIVE", planned_start: "2026-12-01", planned_end: "2027-01-01" },
      { enrolment_id: "enrolment-a", subject_id: "subject-b", status: "ACTIVE", planned_start: "2026-09-01", planned_end: "2027-01-01" },
    ],
  }
  assert.equal(studentHasAssignmentAccess(input), false)
})

test("assignment access rejects cross-institution course data", () => {
  assert.equal(studentHasAssignmentAccess({
    studentInstitutionId: "institution-b",
    assignmentInstitutionId: "institution-a",
    studentSectionId: "section-a",
    hasSectionCourseRelationship: false,
    assignmentSectionIds: ["section-a"],
    subjectId: "subject-a",
    today,
    enrolments: [],
    units: [],
  }), false)
})

test("a student can read only their own submission file after course access", () => {
  const context = {
    institutionId: "institution-a",
    organizationId: "org-a",
    facultyHasSubject: false,
    studentHasCourse: true,
    parentHasLinkedCourse: false,
    studentOwnerId: "student-a",
  }
  assert.equal(canReadAssignmentFile({ id: "student-a", role: "STUDENT", institution_id: "institution-a", organization_id: "org-a" }, context), true)
  assert.equal(canReadAssignmentFile({ id: "student-b", role: "STUDENT", institution_id: "institution-a", organization_id: "org-a" }, context), false)
  assert.equal(canReadAssignmentFile({ id: "student-a", role: "STUDENT", institution_id: "institution-a", organization_id: "org-a" }, { ...context, studentHasCourse: false }), false)
})

test("faculty access requires a current course relationship", () => {
  const faculty = { id: "faculty-a", role: "FACULTY", institution_id: "institution-a", organization_id: "org-a" }
  const context = {
    institutionId: "institution-a",
    organizationId: "org-a",
    facultyHasSubject: true,
    studentHasCourse: false,
    parentHasLinkedCourse: false,
    studentOwnerId: null,
  }
  assert.equal(canReadAssignmentFile(faculty, context), true)
  assert.equal(canReadAssignmentFile(faculty, { ...context, facultyHasSubject: false }), false)
  assert.equal(canReadAssignmentFile(faculty, { ...context, institutionId: "institution-b" }), false)
})

test("faculty file access is limited to the assignment and student sections they teach", () => {
  assert.equal(facultyHasAssignmentSectionAccess(["section-a"], ["section-a"], undefined), true)
  assert.equal(facultyHasAssignmentSectionAccess(["section-a"], ["section-b"], undefined), false)
  assert.equal(facultyHasAssignmentSectionAccess(["section-a"], ["section-a", "section-b"], ["section-a"]), true)
  assert.equal(facultyHasAssignmentSectionAccess(["section-a"], ["section-a", "section-b"], ["section-b"]), false)
  assert.equal(facultyHasAssignmentSectionAccess([null], ["section-b"], ["section-b"]), true)
  assert.equal(facultyHasAssignmentSectionAccess(["section-a"], ["section-a"], null), false)
})

test("parent and administrator access remain linked and tenant scoped", () => {
  const context = {
    institutionId: "institution-a",
    organizationId: "org-a",
    facultyHasSubject: false,
    studentHasCourse: false,
    parentHasLinkedCourse: true,
    studentOwnerId: "student-a",
  }
  const parent = { id: "parent-a", role: "PARENT", institution_id: "institution-a", organization_id: "org-a" }
  assert.equal(canReadAssignmentFile(parent, context), true)
  assert.equal(canReadAssignmentFile(parent, { ...context, parentHasLinkedCourse: false }), false)
  assert.equal(canReadAssignmentFile({ ...parent, institution_id: "institution-b" }, context), false)
  assert.equal(canReadAssignmentFile({ ...parent, role: "ORG_ADMIN" }, context), true)
  assert.equal(canReadAssignmentFile({ ...parent, role: "ORG_ADMIN", organization_id: "org-b" }, context), false)
  assert.equal(canReadAssignmentFile({ ...parent, role: "INSTITUTION_ADMIN" }, context), true)
  assert.equal(canReadAssignmentFile({ ...parent, role: "SUPER_ADMIN", institution_id: null, organization_id: null }, context), true)
})
