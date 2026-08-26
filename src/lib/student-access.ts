import { ROLES } from "@/constants/roles"

export type StudentAccessActor = {
  id: string
  role: string
  institution_id: string | null
  isSuperAdmin?: boolean
}

export type StudentAccessScope = "ADMIN" | "STUDENT_SELF" | "ACADEMIC_STAFF"

const academicStaffRoles = new Set<string>([
  ROLES.HOD,
  ROLES.PROGRAM_HEAD,
  ROLES.FACULTY,
])

export function getStudentAccessScope(
  actor: StudentAccessActor,
  studentId: string,
  studentInstitutionId: string,
): StudentAccessScope | null {
  if (actor.isSuperAdmin || actor.role === ROLES.SUPER_ADMIN || actor.role === ROLES.ORG_ADMIN) return "ADMIN"
  if (!actor.institution_id || actor.institution_id !== studentInstitutionId) return null
  if (actor.role === ROLES.INSTITUTION_ADMIN) return "ADMIN"
  if (actor.role === ROLES.STUDENT && actor.id === studentId) return "STUDENT_SELF"
  if (academicStaffRoles.has(actor.role)) return "ACADEMIC_STAFF"
  return null
}

export function canManageStudent(actor: StudentAccessActor, studentInstitutionId: string) {
  return getStudentAccessScope(actor, actor.id, studentInstitutionId) === "ADMIN"
}

export function canReadStudentDocuments(scope: StudentAccessScope) {
  return scope === "ADMIN" || scope === "STUDENT_SELF"
}

export function minimalAcademicProfile(academic: Record<string, unknown>) {
  return {
    program_id: academic.program_id,
    section_id: academic.section_id,
    intake_id: academic.intake_id,
    semester: academic.semester,
  }
}

export function redactStudentProfile(
  scope: StudentAccessScope,
  profile: Record<string, unknown>,
) {
  if (scope === "ADMIN") return profile

  const base = {
    institution_id: profile.institution_id,
    access_scope: scope,
    identity: profile.identity,
    academic: profile.academic,
  }

  if (scope === "ACADEMIC_STAFF") return base

  return {
    ...base,
    details: profile.details,
    addresses: profile.addresses,
    emergency_contacts: profile.emergency_contacts,
  }
}
