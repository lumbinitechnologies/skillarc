import assert from "node:assert/strict"
import test from "node:test"
import {
  canManageStudent,
  canReadStudentDocuments,
  getStudentAccessScope,
  minimalAcademicProfile,
  redactStudentProfile,
} from "./student-access"

const institutionId = "institution-a"
const otherInstitutionId = "institution-b"
const studentId = "student-a"

function actor(overrides: Partial<Parameters<typeof getStudentAccessScope>[0]> = {}) {
  return {
    id: "staff-a",
    role: "FACULTY",
    institution_id: institutionId,
    ...overrides,
  }
}

test("student access is limited to the student's own profile", () => {
  assert.equal(getStudentAccessScope(actor({ id: studentId, role: "STUDENT" }), studentId, institutionId), "STUDENT_SELF")
  assert.equal(getStudentAccessScope(actor({ id: "student-b", role: "STUDENT" }), studentId, institutionId), null)
  assert.equal(getStudentAccessScope(actor({ id: studentId, role: "STUDENT", institution_id: otherInstitutionId }), studentId, institutionId), null)
})

test("administrators are institution-scoped except org and super administrators", () => {
  assert.equal(getStudentAccessScope(actor({ role: "INSTITUTION_ADMIN" }), studentId, institutionId), "ADMIN")
  assert.equal(getStudentAccessScope(actor({ role: "INSTITUTION_ADMIN", institution_id: otherInstitutionId }), studentId, institutionId), null)
  assert.equal(getStudentAccessScope(actor({ role: "ORG_ADMIN", institution_id: null }), studentId, institutionId), "ADMIN")
  assert.equal(getStudentAccessScope(actor({ role: "SUPER_ADMIN", institution_id: null }), studentId, institutionId), "ADMIN")
})

test("academic staff have minimal profile access and no document access", () => {
  assert.equal(getStudentAccessScope(actor({ role: "HOD" }), studentId, institutionId), "ACADEMIC_STAFF")
  assert.equal(getStudentAccessScope(actor({ role: "PROGRAM_HEAD" }), studentId, institutionId), "ACADEMIC_STAFF")
  assert.equal(getStudentAccessScope(actor({ role: "FACULTY" }), studentId, institutionId), "ACADEMIC_STAFF")
  assert.equal(canReadStudentDocuments("ACADEMIC_STAFF"), false)
  assert.equal(canReadStudentDocuments("STUDENT_SELF"), true)
  assert.equal(canReadStudentDocuments("ADMIN"), true)
})

test("only administrative scopes can manage student records", () => {
  assert.equal(canManageStudent(actor({ role: "INSTITUTION_ADMIN" }), institutionId), true)
  assert.equal(canManageStudent(actor({ role: "FACULTY" }), institutionId), false)
  assert.equal(canManageStudent(actor({ id: studentId, role: "STUDENT" }), institutionId), false)
})

test("profile redaction omits internal data for students and staff", () => {
  const profile = {
    institution_id: institutionId,
    identity: { name: "Student" },
    academic: { semester: 1 },
    details: { passport_number: "redacted-in-test" },
    addresses: [],
    emergency_contacts: [],
    notes: [],
    communications: [],
    activity: [],
  }

  assert.deepEqual(Object.keys(redactStudentProfile("ACADEMIC_STAFF", profile)).sort(), ["academic", "access_scope", "identity", "institution_id"].sort())
  assert.deepEqual(Object.keys(redactStudentProfile("STUDENT_SELF", profile)).sort(), ["academic", "access_scope", "addresses", "details", "emergency_contacts", "identity", "institution_id"].sort())
  assert.deepEqual(Object.keys(redactStudentProfile("ADMIN", profile)).sort(), Object.keys(profile).sort())
})

test("academic staff receive only non-sensitive academic fields", () => {
  assert.deepEqual(Object.keys(minimalAcademicProfile({
    registration_number: "REG-1",
    admission_year: 2026,
    dob: "2000-01-01",
    gender: "X",
    program_id: "program-a",
    section_id: "section-a",
    intake_id: "intake-a",
    semester: 1,
  })).sort(), ["intake_id", "program_id", "section_id", "semester"])
})
