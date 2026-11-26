export type PrivateFileActor = {
  id: string
  role: string
  institution_id: string | null
  organization_id: string | null
}

export type AssignmentFileAccessContext = {
  institutionId: string
  organizationId: string | null
  facultyHasSubject: boolean
  studentHasCourse: boolean
  parentHasLinkedCourse: boolean
  studentOwnerId: string | null
}

export type StudentEnrollmentAccessInput = {
  studentInstitutionId: string
  assignmentInstitutionId: string
  studentSectionId: string | null
  hasSectionCourseRelationship: boolean
  assignmentSectionIds: string[] | null
  subjectId: string
  today: string
  enrolments: Array<{
    id: string
    status: string
    started_at: string
    ended_at: string | null
    section_id: string | null
  }>
  units: Array<{
    enrolment_id: string
    subject_id: string
    status: string
    planned_start: string
    planned_end: string
  }>
}

const eligibleEnrolmentStatuses = new Set(["ENROLLED", "ACTIVE"])

export function studentHasAssignmentAccess(input: StudentEnrollmentAccessInput): boolean {
  if (input.studentInstitutionId !== input.assignmentInstitutionId) return false

  if (input.enrolments.length === 0) {
    if (!input.studentSectionId || !input.hasSectionCourseRelationship) return false
    return !input.assignmentSectionIds?.length || input.assignmentSectionIds.includes(input.studentSectionId)
  }

  const eligibleEnrolments = input.enrolments
    .filter((enrolment) =>
      eligibleEnrolmentStatuses.has(enrolment.status) &&
      enrolment.started_at <= input.today &&
      (!enrolment.ended_at || enrolment.ended_at >= input.today) &&
      (!input.assignmentSectionIds?.length || Boolean(enrolment.section_id && input.assignmentSectionIds.includes(enrolment.section_id)))
    )
  const eligibleEnrolmentIds = new Set(eligibleEnrolments.map((enrolment) => enrolment.id))

  if (eligibleEnrolmentIds.size === 0) return false

  return input.units.some((unit) =>
    eligibleEnrolmentIds.has(unit.enrolment_id) &&
    unit.subject_id === input.subjectId &&
    unit.status === "ACTIVE" &&
    unit.planned_start <= input.today &&
    unit.planned_end >= input.today
  )
}

export function canReadAssignmentFile(
  actor: PrivateFileActor,
  context: AssignmentFileAccessContext,
): boolean {
  if (actor.role === "SUPER_ADMIN") return true

  if (actor.role === "ORG_ADMIN") {
    return Boolean(actor.organization_id && actor.organization_id === context.organizationId)
  }

  if (actor.institution_id !== context.institutionId) return false

  if (["INSTITUTION_ADMIN", "HOD", "PROGRAM_HEAD"].includes(actor.role)) return true
  if (actor.role === "FACULTY") return context.facultyHasSubject
  if (actor.role === "STUDENT") {
    return context.studentHasCourse && (!context.studentOwnerId || context.studentOwnerId === actor.id)
  }
  if (actor.role === "PARENT") {
    return context.parentHasLinkedCourse
  }
  return false
}

export function facultyHasAssignmentSectionAccess(
  facultySectionIds: Array<string | null>,
  assignmentSectionIds: string[] | null,
  studentSectionIds?: string[] | null,
): boolean {
  if (studentSectionIds !== undefined) {
    if (studentSectionIds === null) return false
    return facultySectionIds.some((sectionId) => sectionId === null || studentSectionIds.includes(sectionId))
  }
  return facultySectionIds.some((sectionId) =>
    sectionId === null || !assignmentSectionIds?.length || assignmentSectionIds.includes(sectionId)
  )
}
