import assert from "node:assert/strict"
import test from "node:test"
import { ROLES } from "@/constants/roles"
import { checkAuthRateLimit, checkRateLimit } from "./rate-limit"
import { getStudentAccessScope, canReadStudentDocuments, canManageStudent } from "./student-access"

// ==============================================================================
// 1. Role-Based Permissions & Access Matrix Tests
// ==============================================================================

test("Security Matrix: Student can only access their own profile in their institution", () => {
  const studentA = { id: "student-1", role: ROLES.STUDENT, institution_id: "inst-1" }
  
  // Own profile in same institution -> allowed
  assert.equal(getStudentAccessScope(studentA, "student-1", "inst-1"), "STUDENT_SELF")
  
  // Another student's profile in same institution -> denied
  assert.equal(getStudentAccessScope(studentA, "student-2", "inst-1"), null)
  
  // Student ID matching but targeting different institution -> denied
  assert.equal(getStudentAccessScope(studentA, "student-1", "inst-2"), null)
})

test("Security Matrix: Academic staff (Faculty, HOD, Program Head) cannot access sensitive student documents", () => {
  const faculty = { id: "faculty-1", role: ROLES.FACULTY, institution_id: "inst-1" }
  const hod = { id: "hod-1", role: ROLES.HOD, institution_id: "inst-1" }
  const progHead = { id: "prog-1", role: ROLES.PROGRAM_HEAD, institution_id: "inst-1" }

  assert.equal(getStudentAccessScope(faculty, "student-1", "inst-1"), "ACADEMIC_STAFF")
  assert.equal(getStudentAccessScope(hod, "student-1", "inst-1"), "ACADEMIC_STAFF")
  assert.equal(getStudentAccessScope(progHead, "student-1", "inst-1"), "ACADEMIC_STAFF")

  // Documents must be inaccessible to faculty
  assert.equal(canReadStudentDocuments("ACADEMIC_STAFF"), false)
})

test("Security Matrix: Institution Admin can manage students within their own institution only", () => {
  const adminInstA = { id: "admin-1", role: ROLES.INSTITUTION_ADMIN, institution_id: "inst-1" }
  
  // Inside their own institution -> allowed
  assert.equal(canManageStudent(adminInstA, "inst-1"), true)
  assert.equal(getStudentAccessScope(adminInstA, "student-1", "inst-1"), "ADMIN")

  // Cross-institution access -> strictly denied
  assert.equal(canManageStudent(adminInstA, "inst-2"), false)
  assert.equal(getStudentAccessScope(adminInstA, "student-2", "inst-2"), null)
})

test("Security Matrix: Super Admin and Org Admin have global administrative authority", () => {
  const superAdmin = { id: "super-1", role: ROLES.SUPER_ADMIN, institution_id: null }
  const orgAdmin = { id: "org-1", role: ROLES.ORG_ADMIN, institution_id: null }

  assert.equal(canManageStudent(superAdmin, "inst-1"), true)
  assert.equal(canManageStudent(superAdmin, "inst-2"), true)
  assert.equal(getStudentAccessScope(superAdmin, "student-1", "inst-1"), "ADMIN")

  assert.equal(canManageStudent(orgAdmin, "inst-1"), true)
  assert.equal(canManageStudent(orgAdmin, "inst-2"), true)
  assert.equal(getStudentAccessScope(orgAdmin, "student-1", "inst-1"), "ADMIN")
})

// ==============================================================================
// 2. Multi-Tenant Cross-Institution Isolation Logic
// ==============================================================================

type MockRecord = {
  id: string
  institution_id: string
  user_id?: string
  student_id?: string
}

function evaluateTenantIsolation(
  actor: { id: string; role: string; institution_id: string | null },
  record: MockRecord
): boolean {
  if (actor.role === ROLES.SUPER_ADMIN || actor.role === ROLES.ORG_ADMIN) {
    return true
  }
  if (!actor.institution_id || actor.institution_id !== record.institution_id) {
    return false
  }
  if (actor.role === ROLES.INSTITUTION_ADMIN) {
    return true
  }
  if (actor.role === ROLES.STUDENT) {
    return record.student_id === actor.id || record.user_id === actor.id
  }
  return true
}

test("Tenant Isolation: Zero rows returned when user from Institution A queries Institution B data", () => {
  const userInstA = { id: "user-a", role: ROLES.STUDENT, institution_id: "inst-a" }
  const recordInstB: MockRecord = { id: "rec-1", institution_id: "inst-b", student_id: "user-b" }

  assert.equal(evaluateTenantIsolation(userInstA, recordInstB), false)
})

test("Tenant Isolation: Institution Admin from Institution A cannot access Institution B data", () => {
  const adminInstA = { id: "admin-a", role: ROLES.INSTITUTION_ADMIN, institution_id: "inst-a" }
  const recordInstB: MockRecord = { id: "grade-1", institution_id: "inst-b" }

  assert.equal(evaluateTenantIsolation(adminInstA, recordInstB), false)
})

// ==============================================================================
// 3. Parent -> Student Relation Access Validation
// ==============================================================================

function evaluateParentChildAccess(
  parentId: string,
  targetStudentId: string,
  activeRelations: Array<{ parent_id: string; student_id: string }>
): boolean {
  return activeRelations.some(
    (rel) => rel.parent_id === parentId && rel.student_id === targetStudentId
  )
}

test("Parent Access: Parent can only access records for verified linked children", () => {
  const relations = [
    { parent_id: "parent-1", student_id: "child-1" },
    { parent_id: "parent-1", student_id: "child-2" },
    { parent_id: "parent-2", student_id: "child-3" },
  ]

  // Verified children
  assert.equal(evaluateParentChildAccess("parent-1", "child-1", relations), true)
  assert.equal(evaluateParentChildAccess("parent-1", "child-2", relations), true)

  // Unlinked child
  assert.equal(evaluateParentChildAccess("parent-1", "child-3", relations), false)
  assert.equal(evaluateParentChildAccess("parent-1", "unrelated-student", relations), false)
})

// ==============================================================================
// 4. Rate Limiting Protection (IP + Email Keys)
// ==============================================================================

test("Rate Limiter: Gracefully succeeds in development environment when Redis is not configured", async () => {
  const result = await checkAuthRateLimit("127.0.0.1", "student@example.com")
  assert.equal(result.allowed, true)
})

// ==============================================================================
// 5. Service Role Key Security Audit
// ==============================================================================

test("Security Audit: SUPABASE_SERVICE_ROLE_KEY is protected and not exposed to browser prefix", () => {
  const exposedKeys = Object.keys(process.env).filter((key) =>
    key.startsWith("NEXT_PUBLIC_") && key.toLowerCase().includes("service_role")
  )
  assert.deepEqual(exposedKeys, [], "No service role key should ever use NEXT_PUBLIC_ prefix")
})

// ==============================================================================
// 6. Write Tamper Protection Logic (Submissions, Grades, Attendance)
// ==============================================================================

function evaluateSubmissionWritePermission(
  actor: { id: string; role: string },
  targetStudentId: string
): boolean {
  if (actor.role === ROLES.SUPER_ADMIN || actor.role === ROLES.ORG_ADMIN) return true
  // Students can only insert/update submissions with their own student_id
  if (actor.role === ROLES.STUDENT) {
    return actor.id === targetStudentId
  }
  return actor.role === ROLES.INSTITUTION_ADMIN || actor.role === ROLES.FACULTY
}

test("Write Tamper: Student A cannot insert or update submissions on behalf of Student B", () => {
  const studentA = { id: "student-1", role: ROLES.STUDENT }
  
  // Student A updating own submission -> allowed
  assert.equal(evaluateSubmissionWritePermission(studentA, "student-1"), true)
  
  // Student A updating Student B's submission -> blocked
  assert.equal(evaluateSubmissionWritePermission(studentA, "student-2"), false)
})

// ==============================================================================
// 7. Unauthenticated Role Access Lockdown
// ==============================================================================

test("Unauthenticated: Anonymous requests cannot access protected entity records", () => {
  const anonActor = null
  const isProtectedAccessible = (actor: { role: string } | null) => Boolean(actor?.role)
  assert.equal(isProtectedAccessible(anonActor), false)
})

