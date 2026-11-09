import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentUserContext, type UserContext } from "@/lib/user-context"
import { normalizePrivateStoragePath, type PrivateStorageBucket } from "@/lib/private-storage"
import {
  canReadAssignmentFile as canReadAssignmentFileForActor,
  facultyHasAssignmentSectionAccess,
  studentHasAssignmentAccess,
} from "@/lib/private-storage-access"

const PRIVATE_BUCKETS = new Set<PrivateStorageBucket>(["assignments", "resumes"])

type AssignmentFileRow = {
  id: string
  subject_id: string | null
  faculty_id: string | null
  section_ids: string[] | null
}

function privateNotFound() {
  return NextResponse.json({ error: "File not found" }, {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  })
}

function assignmentReferences(path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const encodedPath = path.split("/").map(encodeURIComponent).join("/")
  const values = new Set([`storage://assignments/${path}`])
  if (supabaseUrl) {
    const base = supabaseUrl.replace(/\/$/, "")
    values.add(`${base}/storage/v1/object/public/assignments/${encodedPath}`)
    values.add(`${base}/storage/v1/object/public/assignments/${path}`)
  }
  return [...values]
}

async function resolveStudentAssignmentSections(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  studentId: string,
  institutionId: string,
  assignment: AssignmentFileRow,
): Promise<string[] | null> {
  if (!assignment.subject_id) return null
  const [{ data: student, error: studentError }, { data: studentUser, error: userError }] = await Promise.all([
    admin.from("students")
      .select("institution_id,program_id,section_id")
      .eq("id", studentId)
      .maybeSingle(),
    admin.from("users")
      .select("role,is_active")
      .eq("id", studentId)
      .maybeSingle(),
  ])
  if (studentError) throw studentError
  if (userError) throw userError
  if (!student || student.institution_id !== institutionId || studentUser?.role !== "STUDENT" || studentUser.is_active !== true) return null

  const today = new Date().toISOString().slice(0, 10)
  const { data: enrolments, error: enrolmentError } = await admin
    .from("enrolments")
    .select("id,status,started_at,ended_at,section_id")
    .eq("student_id", studentId)
    .eq("institution_id", institutionId)
  if (enrolmentError) throw enrolmentError

  if ((enrolments?.length ?? 0) > 0) {
    const enrolmentIds = (enrolments ?? []).map((enrolment) => enrolment.id)
    const { data: units, error: unitError } = enrolmentIds.length > 0 ? await admin
      .from("enrolment_units")
      .select("enrolment_id,subject_id,status,planned_start,planned_end")
      .in("enrolment_id", enrolmentIds)
      .eq("subject_id", assignment.subject_id)
      : { data: [], error: null }
    if (unitError) throw unitError
    const unitRows = units ?? []
    const allowed = studentHasAssignmentAccess({
      studentInstitutionId: student.institution_id,
      assignmentInstitutionId: institutionId,
      studentSectionId: student.section_id,
      hasSectionCourseRelationship: false,
      assignmentSectionIds: assignment.section_ids,
      subjectId: assignment.subject_id,
      today,
      enrolments: enrolments ?? [],
      units: unitRows,
    })
    if (!allowed) return null

    const activeEnrolments = (enrolments ?? []).filter((enrolment) =>
      ["ENROLLED", "ACTIVE"].includes(enrolment.status) &&
      enrolment.started_at <= today && (!enrolment.ended_at || enrolment.ended_at >= today) &&
      (!assignment.section_ids?.length || Boolean(enrolment.section_id && assignment.section_ids.includes(enrolment.section_id))) &&
      unitRows.some((unit) => unit.enrolment_id === enrolment.id && unit.subject_id === assignment.subject_id &&
        unit.status === "ACTIVE" && unit.planned_start <= today && unit.planned_end >= today)
    )
    const sectionIds = [...new Set(activeEnrolments.map((enrolment) => enrolment.section_id).filter((id): id is string => Boolean(id)))]
    if (sectionIds.length === 0) return []
    const { data: validSections, error: sectionError } = await admin
      .from("sections")
      .select("id")
      .in("id", sectionIds)
      .eq("institution_id", institutionId)
    if (sectionError) throw sectionError
    return (validSections ?? []).map((section) => section.id)
  }

  if (!student.section_id) return null
  const { data: section, error: sectionError } = await admin
    .from("sections")
    .select("institution_id,program_id")
    .eq("id", student.section_id)
    .maybeSingle()
  if (sectionError) throw sectionError
  if (!section || section.institution_id !== student.institution_id ||
    (student.program_id && section.program_id !== student.program_id)) return null

  const [facultyRelationship, timetableRelationship, assignmentRelationship] = await Promise.all([
    admin.from("faculty_subjects")
      .select("id")
      .eq("subject_id", assignment.subject_id)
      .eq("institution_id", institutionId)
      .eq("section_id", student.section_id)
      .limit(1),
    admin.from("timetable_slots")
      .select("id")
      .eq("subject_id", assignment.subject_id)
      .eq("institution_id", institutionId)
      .eq("section_id", student.section_id)
      .limit(1),
    admin.from("assignments")
      .select("id")
      .eq("subject_id", assignment.subject_id)
      .contains("section_ids", [student.section_id])
      .limit(1),
  ])
  for (const result of [facultyRelationship, timetableRelationship, assignmentRelationship]) {
    if (result.error) throw result.error
  }
  const hasSectionCourseRelationship = Boolean(
    facultyRelationship.data?.length || timetableRelationship.data?.length || assignmentRelationship.data?.length,
  )
  const allowed = studentHasAssignmentAccess({
    studentInstitutionId: student.institution_id,
    assignmentInstitutionId: institutionId,
    studentSectionId: student.section_id,
    hasSectionCourseRelationship,
    assignmentSectionIds: assignment.section_ids,
    subjectId: assignment.subject_id,
    today,
    enrolments: [],
    units: [],
  })
  return allowed ? [student.section_id] : null
}

async function canReadAssignmentFile(
  actor: UserContext,
  path: string,
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<boolean> {
  const references = assignmentReferences(path)
  const assignmentQueries = references.map((reference) =>
    admin.from("assignments").select("id,subject_id,faculty_id,section_ids").contains("files", [reference])
  )
  const submissionQueries = references.map((reference) =>
    admin.from("submissions").select("assignment_id,student_id").eq("file_url", reference)
  )
  const [assignmentResults, submissionResults] = await Promise.all([
    Promise.all(assignmentQueries),
    Promise.all(submissionQueries),
  ])
  for (const result of [...assignmentResults, ...submissionResults]) if (result.error) throw result.error

  const assignments = new Map<string, AssignmentFileRow>()
  for (const result of assignmentResults) {
    for (const assignment of result.data ?? []) assignments.set(assignment.id, assignment)
  }
  const submissionRows = submissionResults.flatMap((result) => result.data ?? [])
  const firstPathSegment = path.split("/")[0]
  const studentOwnerId = firstPathSegment.startsWith("faculty-") ? null : firstPathSegment
  if (studentOwnerId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentOwnerId)) {
    return false
  }
  if (studentOwnerId && !submissionRows.some((submission) => submission.student_id === studentOwnerId)) {
    return false
  }
  if (actor.role === "STUDENT" && studentOwnerId && actor.id !== studentOwnerId) return false
  const assignmentIds = [...new Set(submissionRows.map((submission) => submission.assignment_id).filter(Boolean))]
  if (assignmentIds.length > 0) {
    const { data, error } = await admin
      .from("assignments")
      .select("id,subject_id,faculty_id,section_ids")
      .in("id", assignmentIds)
    if (error) throw error
    for (const assignment of data ?? []) assignments.set(assignment.id, assignment)
  }
  if (assignments.size === 0) return false

  for (const assignment of assignments.values()) {
    if (!assignment.subject_id) continue
    const { data: subject, error: subjectError } = await admin
      .from("subjects")
      .select("institution_id")
      .eq("id", assignment.subject_id)
      .maybeSingle()
    if (subjectError) throw subjectError
    const institutionId = subject?.institution_id
    if (!institutionId) continue

    const { data: institution, error: institutionError } = await admin
      .from("institutions")
      .select("organization_id")
      .eq("id", institutionId)
      .maybeSingle()
    if (institutionError) throw institutionError

    let facultyHasSubject = false
    if (actor.role === "FACULTY" && actor.institution_id === institutionId) {
      const { data: relationships, error } = await admin
        .from("faculty_subjects")
        .select("section_id")
        .eq("faculty_id", actor.id)
        .eq("subject_id", assignment.subject_id)
        .eq("institution_id", institutionId)
      if (error) throw error
      const facultySectionIds = (relationships ?? []).map((relationship) => relationship.section_id)
      if (studentOwnerId) {
        const studentSections = await resolveStudentAssignmentSections(admin, studentOwnerId, institutionId, assignment)
        facultyHasSubject = facultyHasAssignmentSectionAccess(facultySectionIds, assignment.section_ids, studentSections)
      } else {
        const requestedFacultyId = firstPathSegment.startsWith("faculty-")
          ? firstPathSegment.slice("faculty-".length)
          : null
        facultyHasSubject = requestedFacultyId === assignment.faculty_id &&
          facultyHasAssignmentSectionAccess(facultySectionIds, assignment.section_ids)
      }
    }

    let studentHasCourse = false
    if (actor.role === "STUDENT" && actor.institution_id === institutionId) {
      studentHasCourse = (await resolveStudentAssignmentSections(admin, actor.id, institutionId, assignment)) !== null
    }
    let parentHasLinkedCourse = false
    if (actor.role === "PARENT" && actor.institution_id === institutionId) {
      let relationQuery = admin
        .from("parent_student_relations")
        .select("student_id")
        .eq("parent_id", actor.id)
      if (studentOwnerId) relationQuery = relationQuery.eq("student_id", studentOwnerId)
      const { data: relations, error } = await relationQuery
      if (error) throw error
      for (const relation of relations ?? []) {
        if (await resolveStudentAssignmentSections(admin, relation.student_id, institutionId, assignment) !== null) {
          parentHasLinkedCourse = true
          break
        }
      }
    }

    if (canReadAssignmentFileForActor(actor, {
      institutionId,
      organizationId: institution?.organization_id ?? null,
      facultyHasSubject,
      studentHasCourse,
      parentHasLinkedCourse,
      studentOwnerId,
    })) return true
  }
  return false
}

export async function GET(request: NextRequest, context: { params: Promise<{ bucket: string }> }) {
  try {
    const { bucket: rawBucket } = await context.params
    if (!PRIVATE_BUCKETS.has(rawBucket as PrivateStorageBucket)) return privateNotFound()
    const bucket = rawBucket as PrivateStorageBucket
    const actor = await getCurrentUserContext()
    if (!actor || !actor.is_active) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "private, no-store" } })
    }
    const path = normalizePrivateStoragePath(request.nextUrl.searchParams.get("path") ?? "")
    if (!path) return privateNotFound()

    const admin = createSupabaseAdminClient()
    if (bucket === "resumes") {
      const [folder, ownerId] = path.split("/")
      if (actor.role !== "STUDENT" || folder !== "resumes" || ownerId !== actor.id) return privateNotFound()
    } else if (!await canReadAssignmentFile(actor, path, admin)) {
      return privateNotFound()
    }

    const expiresIn = 5 * 60
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn)
    if (error || !data?.signedUrl) return privateNotFound()
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: data.signedUrl,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    })
  } catch (error) {
    console.error("Private file access failed:", error)
    return privateNotFound()
  }
}
