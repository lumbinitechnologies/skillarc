/**
 * Shared server-side helper for parent dashboard pages.
 * Resolves the parent → student chain and returns the child list.
 */
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"

export interface ParentChild {
  id: string
  relationship: string
  name: string
  email: string
  phone: string
  registration_number: string
  semester: number | null
  admission_year: number | null
  sectionName: string
  sectionId: string | null
  programName: string
  programId: string | null
  institutionId: string | null
  advisorName: string
  advisorEmail: string
  advisorPhone: string
}

export async function getParentContext() {
  const context = await getCurrentDashboardSession()
  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.PARENT) redirect("/auth/login")

  const admin = createSupabaseAdminClient()

  const { data: relations } = await admin
    .from("parent_student_relations")
    .select("student_id, relationship")
    .eq("parent_id", context.id)

  const studentIds = (relations ?? []).map((r) => r.student_id)

  if (studentIds.length === 0) {
    return {
      profile: context,
      children: [] as ParentChild[],
      admin,
    }
  }

  const [usersRes, studentsRes] = await Promise.all([
    admin.from("users").select("id, name, email, phone").in("id", studentIds),
    admin
      .from("students")
      .select(`
        id, semester, registration_number, admission_year, section_id, program_id, institution_id,
        sections:section_id(id, name, semester, advisor:faculty_advisor_id(id, name, email, phone)),
        programs:program_id(id, name)
      `)
      .in("id", studentIds),
  ])

  const users = (usersRes.data ?? []) as any[]
  const students = (studentsRes.data ?? []) as any[]

  const children: ParentChild[] = (relations ?? []).map((rel) => {
    const user = users.find((u) => u.id === rel.student_id)
    const student = students.find((s) => s.id === rel.student_id)
    if (!user || !student) return null

    const section = Array.isArray(student.sections) ? student.sections[0] : student.sections
    const program = Array.isArray(student.programs) ? student.programs[0] : student.programs
    const advisor = section
      ? Array.isArray(section.advisor) ? section.advisor[0] : section.advisor
      : null

    return {
      id: rel.student_id,
      relationship: rel.relationship ?? "Guardian",
      name: user.name ?? "Student",
      email: user.email ?? "",
      phone: user.phone ?? "",
      registration_number: student.registration_number ?? "—",
      semester: section?.semester ?? student.semester ?? null,
      admission_year: student.admission_year ?? null,
      sectionName: section?.name ?? "—",
      sectionId: section?.id ?? null,
      programName: program?.name ?? "—",
      programId: student.program_id ?? null,
      institutionId: student.institution_id ?? null,
      advisorName: advisor?.name ?? "",
      advisorEmail: advisor?.email ?? "",
      advisorPhone: advisor?.phone ?? "",
    }
  }).filter(Boolean) as ParentChild[]

  return { profile: context, children, admin }
}
