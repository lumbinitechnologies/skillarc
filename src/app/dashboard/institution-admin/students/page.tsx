import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { redirect } from "next/navigation"
import { StudentsClientPage } from "./students-client"
import { ROLES } from "@/constants/roles"
import type { StudentWithSection } from "@/modules/students"

export const dynamic = "force-dynamic"

export default async function StudentsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const adminClient = createSupabaseAdminClient()

  const { data: userProfile } = await adminClient
    .from("users")
    .select("role, institution_id")
    .eq("id", user.id)
    .single()

  if (userProfile?.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")

  const institutionId = userProfile.institution_id

  // Fetch students from students table
  const { data: studentRecords = [], count } = await adminClient
    .from("students")
    .select("id, institution_id, program_id, section_id, semester, registration_number, admission_year, dob, gender", { count: "exact" })
    .eq("institution_id", institutionId)
    .order("id")
    .range(0, 24) // first 25 rows

  // Fetch user data for these students
  const studentIds = (studentRecords || []).map(s => s.id)
  const { data: userRecords = [] } = studentIds.length > 0
    ? await adminClient
        .from("users")
        .select("id, name, email, role, organization_id, created_at, is_active")
        .in("id", studentIds)
    : { data: [] }

  const [sectionsRes, programsRes] = await Promise.all([
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
      .select("id,name")
      .eq("institution_id", institutionId)
      .order("name"),
  ])

  const sections = sectionsRes.data ?? []
  const programs = programsRes.data ?? []

  // Merge student + user + section data
  const students = (studentRecords || []).map(student => {
    const user = (userRecords || []).find(u => u.id === student.id)
    const sec = (sections || []).find(s => s.id === student.section_id)
    return {
      ...student,
      ...user,
      department_id: null,
      phone: null,
      section: sec || null,
    } as any as StudentWithSection
  })

  return (
    <StudentsClientPage
      initialStudents={students || []}
      initialTotalCount={count ?? 0}
      sections={sections || []}
      programs={programs || []}
      institutionId={institutionId}
    />
  )
}