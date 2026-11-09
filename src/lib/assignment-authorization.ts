import { createSupabaseAdminClient } from "@/lib/supabase-admin"

type ManagedAssignment = {
  id: string
  subject_id: string | null
  faculty_id: string | null
  section_ids: string[] | null
  type: string | null
  max_score: number | null
  questions: unknown
  due_date: string | null
  title: string
}

type Profile = {
  id: string
  role: string
  institution_id: string | null
  organization_id: string | null
  is_active: boolean
}

export async function canManageAcademicSubject(actorId: string, subjectId: string, sectionIds: string[] = []) {
  const admin = createSupabaseAdminClient()
  const [{ data: actor }, { data: subject }] = await Promise.all([
    admin.from("users").select("id, role, institution_id, organization_id, is_active").eq("id", actorId).maybeSingle(),
    admin.from("subjects").select("id, institution_id").eq("id", subjectId).maybeSingle(),
  ])

  if (!actor || !subject || actor.is_active !== true) return false

  if (actor.role === "SUPER_ADMIN") return true

  if (actor.role === "ORG_ADMIN") {
    if (!actor.organization_id || !subject.institution_id) return false
    const { data: institution } = await admin
      .from("institutions")
      .select("id")
      .eq("id", subject.institution_id)
      .eq("organization_id", actor.organization_id)
      .maybeSingle()
    return Boolean(institution)
  }

  if (["INSTITUTION_ADMIN", "HOD", "PROGRAM_HEAD", "TEACHER"].includes(actor.role)) {
    return Boolean(actor.institution_id && actor.institution_id === subject.institution_id)
  }

  if (actor.role !== "FACULTY" || !subject.institution_id) return false

  const { data: assignments, error } = await admin
    .from("faculty_subjects")
    .select("section_id")
    .eq("faculty_id", actorId)
    .eq("subject_id", subjectId)
    .eq("institution_id", subject.institution_id)

  if (error || !assignments?.length) return false
  if (!sectionIds.length) return true
  return sectionIds.every((sectionId) => assignments.some((assignment) => !assignment.section_id || assignment.section_id === sectionId))
}

export async function getManagedAssignment(
  assignmentId: string,
  actorId: string,
  expectedSubjectId?: string,
  requireAssignmentOwner = false,
) {
  const admin = createSupabaseAdminClient()
  const { data: assignment, error } = await admin
    .from("assignments")
    .select("id, subject_id, faculty_id, section_ids, type, max_score, questions, due_date, title")
    .eq("id", assignmentId)
    .maybeSingle()

  if (error || !assignment?.subject_id || (expectedSubjectId && assignment.subject_id !== expectedSubjectId)) return null
  if (requireAssignmentOwner && assignment.faculty_id !== actorId) {
    const actor = await getActiveActorProfile(actorId)
    if (actor?.role === "FACULTY") return null
  }
  if (!await canManageAcademicSubject(actorId, assignment.subject_id, assignment.section_ids ?? [])) return null
  return assignment as ManagedAssignment
}

export async function getActiveActorProfile(actorId: string): Promise<Profile | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("users")
    .select("id, role, institution_id, organization_id, is_active")
    .eq("id", actorId)
    .maybeSingle()

  if (error || !data || data.is_active !== true) return null
  return data as Profile
}
