import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { redirect } from "next/navigation"
import { StudentsClientPage } from "./students-client"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"
import type { StudentWithSection } from "@/modules/students"

export const dynamic = "force-dynamic"

export default async function StudentsPage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentUserContext()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")
  if (!context.institution_id) redirect("/dashboard")

  const institutionId = context.institution_id
  const adminClient = createSupabaseAdminClient()

  // Consolidated parallel batch: Fetch joined students, sections, and programs in ONE single Promise.all
  const tBatchStart = performance.now()
  const [studentsRes, sectionsRes, programsRes] = await Promise.all([
    adminClient
      .from("students")
      .select(`
        id,
        institution_id,
        program_id,
        section_id,
        semester,
        registration_number,
        admission_year,
        dob,
        gender,
        users:users!id(
          id,
          name,
          email,
          role,
          organization_id,
          created_at,
          is_active,
          profile_image_url
        )
      `, { count: "exact" })
      .eq("institution_id", institutionId)
      .order("id")
      .range(0, 24),
    adminClient
      .from("sections")
      .select(`
        id,
        name,
        semester,
        program_id,
        program:program_id(
          id,
          name
        )
      `)
      .eq("institution_id", institutionId)
      .order("name"),
    adminClient
      .from("programs")
      .select("id, name")
      .eq("institution_id", institutionId)
      .order("name"),
  ])
  const batchMs = performance.now() - tBatchStart

  const studentRecords = (studentsRes.data ?? []) as any[]
  const count = studentsRes.count ?? 0
  const sections = (sectionsRes.data ?? []) as any[]
  const programs = (programsRes.data ?? []) as any[]

  // Merge student + user + section data in-memory
  const students = studentRecords.map((student) => {
    const user = Array.isArray(student.users) ? student.users[0] : student.users
    const sec = sections.find((s) => s.id === student.section_id)
    return {
      ...student,
      ...user,
      department_id: null,
      phone: null,
      section: sec || null,
    } as any as StudentWithSection
  })

  const totalMs = performance.now() - tPageStart
  console.info(
    `[DashboardInstitutionAdminStudents] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)} count=${count}`
  )

  return (
    <StudentsClientPage
      initialStudents={students}
      initialTotalCount={count}
      sections={sections}
      programs={programs}
      institutionId={institutionId}
    />
  )
}