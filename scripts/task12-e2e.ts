import assert from "node:assert/strict"

type Fixture = {
  institutionId: string
  otherInstitutionId: string
  studentId: string
  profile: { name: string; email: string; compliance: { residency: string; language: string } }
  documents: Array<{ category: string; version: number; reviewed: boolean }>
  admission: { status: string; qualification: string; intake: string; fee: number; offer: string; agreement: string }
  enrolment: { units: string[]; plannedDates: string[]; className: string; trainer: string; timetable: string[]; invoices: number[] }
  portal: "NOT_INVITED" | "INVITED" | "ACTIVE" | "DEACTIVATED"
  audit: string[]
}

const requiredDocumentCategories = ["IDENTITY", "RESIDENCY", "QUALIFICATION", "ENGLISH", "OTHER"]

export function createTask12Fixture(): Fixture {
  return {
    institutionId: "11111111-1111-4111-8111-111111111111",
    otherInstitutionId: "22222222-2222-4222-8222-222222222222",
    studentId: "33333333-3333-4333-8333-333333333333",
    profile: { name: "Task 12 Student", email: "task12.student@example.test", compliance: { residency: "AU", language: "EN" } },
    documents: requiredDocumentCategories.map((category, index) => ({ category, version: index + 1, reviewed: true })),
    admission: { status: "ENROLLED", qualification: "Certificate III", intake: "2026-01", fee: 4200, offer: "OFFER_ACCEPTED", agreement: "SIGNED" },
    enrolment: { units: ["UNIT-1", "UNIT-2", "UNIT-3"], plannedDates: ["2026-02-01/2026-03-01", "2026-03-02/2026-04-01", "2026-04-02/2026-05-01"], className: "Class A", trainer: "Trainer A", timetable: ["MON-1", "TUE-2", "WED-3"], invoices: [1400, 1400, 1400] },
    portal: "NOT_INVITED",
    audit: ["PROFILE_CREATED", "DOCUMENTS_REVIEWED", "OFFER_ACCEPTED", "QUALIFICATION_ENROLLED"],
  }
}

export function activateFixture(fixture: Fixture, institutionId: string) {
  if (institutionId !== fixture.institutionId) throw new Error("tenant boundary")
  fixture.portal = "INVITED"
  fixture.audit.push("STUDENT_PORTAL_INVITED")
  fixture.portal = "ACTIVE"
  fixture.audit.push("STUDENT_PORTAL_ACTIVATED")
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fixture = createTask12Fixture()
  assert.deepEqual(fixture.documents.map((document) => document.category), requiredDocumentCategories)
  assert.equal(fixture.admission.status, "ENROLLED")
  assert.equal(fixture.enrolment.units.length, fixture.enrolment.timetable.length)
  activateFixture(fixture, fixture.institutionId)
  assert.equal(fixture.portal, "ACTIVE")
  assert.throws(() => activateFixture(fixture, fixture.otherInstitutionId), /tenant boundary/)
  const before = fixture.profile.name
  fixture.profile.name = "Task 12 Student Updated"
  const generatedDocument = `Offer for ${fixture.profile.name}`
  assert.notEqual(generatedDocument, `Offer for ${before}`)
  assert.ok(fixture.audit.includes("STUDENT_PORTAL_ACTIVATED"))
  console.log("Task 12 disposable fixture passed")
}
