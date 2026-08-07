import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import { DepartmentDetailClient } from "./department-detail-client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DepartmentDetailPage({ params }: PageProps) {
  const { id: departmentId } = await params
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const adminClient = createSupabaseAdminClient()

  const { data: userProfile } = await adminClient
    .from("users")
    .select("role, institution_id, organization_id")
    .eq("id", user.id)
    .single()

  if (userProfile?.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")

  const institutionId = userProfile.institution_id

  // 1. Fetch current department details
  const { data: department } = await adminClient
    .from("departments")
    .select("*")
    .eq("id", departmentId)
    .eq("institution_id", institutionId)
    .single()

  if (!department) redirect("/dashboard/institution-admin/departments")

  // 2. Fetch programs in this department
  const { data: programs = [] } = await adminClient
    .from("programs")
    .select(`
      *,
      department:department_id(
        id,
        name
      )
    `)
    .eq("department_id", departmentId)
    .order("name")

  const programIds = (programs || []).map((p) => p.id)

  // 3. Fetch sections for these programs
  const { data: sections = [] } = programIds.length > 0
    ? await adminClient
        .from("sections")
        .select(`
          *,
          faculty_advisor:faculty_advisor_id(
            id,
            name,
            email
          ),
          program:program_id(
            id,
            name
          )
        `)
        .in("program_id", programIds)
        .order("semester", { ascending: true })
        .order("name", { ascending: true })
    : { data: [] }

  // 4. Fetch faculty belonging to this department
  const { data: faculty = [] } = await adminClient
    .from("users")
    .select(`
      *,
      department:department_id(
        id,
        name
      )
    `)
    .eq("institution_id", institutionId)
    .eq("department_id", departmentId)
    .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
    .order("name")

  // Load timetable builder permissions for faculty
  let { data: perm } = await adminClient
    .from("permissions")
    .select("id")
    .eq("name", "timetable_builder")
    .maybeSingle()

  const { data: userPerms = [] } = perm
    ? await adminClient
        .from("user_permissions")
        .select("user_id")
        .eq("permission_id", perm.id)
    : { data: [] }

  const builderUserIds = new Set((userPerms || []).map((up) => up.user_id))

  const facultySubjectsRes = await adminClient
    .from("faculty_subjects")
    .select("faculty_id, subject_id")

  const facultySubjects = facultySubjectsRes.data ?? []

  const sectionsAdvisorRes = await adminClient
    .from("sections")
    .select("id, faculty_advisor_id")
    .eq("institution_id", institutionId)

  const allSectionsForStats = sectionsAdvisorRes.data ?? []

  const facultyWithStats = (faculty || []).map((f) => ({
    ...f,
    is_timetable_builder: builderUserIds.has(f.id),
    assignedSubjects: facultySubjects.filter((fs) => fs.faculty_id === f.id).length,
    assignedSections: allSectionsForStats.filter((s) => s.faculty_advisor_id === f.id).length,
  }))

  // 5. Fetch students of these programs
  const { data: studentRecords = [], count } = programIds.length > 0
    ? await adminClient
        .from("students")
        .select("id, institution_id, program_id, section_id, semester, registration_number, admission_year, dob, gender", { count: "exact" })
        .in("program_id", programIds)
        .order("id")
        .range(0, 24)
    : { data: [], count: 0 }

  const studentIds = (studentRecords || []).map((s) => s.id)
  const { data: userRecords = [] } = studentIds.length > 0
    ? await adminClient
        .from("users")
        .select("id, name, email, role, organization_id, created_at, is_active")
        .in("id", studentIds)
    : { data: [] }

  const students = (studentRecords || []).map((student) => {
    const userRec = (userRecords || []).find((u) => u.id === student.id)
    const sec = (sections || []).find((s) => s.id === student.section_id)
    return {
      ...student,
      ...userRec,
      department_id: departmentId,
      phone: null,
      section: sec || null,
    } as any
  })

  // 6. Fetch all faculty in the institution (for section advisor selection)
  const { data: allInstitutionFaculty = [] } = await adminClient
    .from("users")
    .select("id, name, email")
    .eq("institution_id", institutionId)
    .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
    .order("name")

  // 7. Fetch subjects/courses for these programs
  const { data: subjects = [] } = programIds.length > 0
    ? await adminClient
        .from("subjects")
        .select(`
          *,
          program:program_id(
            id, name,
            department:department_id(id, name)
          )
        `)
        .in("program_id", programIds)
        .order("semester")
        .order("name")
    : { data: [] }

  // 8. Fetch faculty subjects assignments
  const subjectIds = (subjects || []).map((s) => s.id)
  const { data: assignments = [] } = subjectIds.length > 0
    ? await adminClient
        .from("faculty_subjects")
        .select("id, faculty_id, subject_id")
        .in("subject_id", subjectIds)
    : { data: [] }

  // 9. Fetch all departments of the institution
  const { data: departments = [] } = await adminClient
    .from("departments")
    .select("id, name")
    .eq("institution_id", institutionId)
    .order("name")

  return (
    <DepartmentDetailClient
      department={department}
      initialPrograms={programs as any}
      initialSections={sections as any}
      initialFaculty={facultyWithStats as any}
      initialStudents={students as any}
      initialTotalStudents={count ?? 0}
      allFacultyAdvisors={(allInstitutionFaculty || []) as any}
      initialSubjects={subjects as any}
      initialAssignments={assignments as any}
      departments={departments as any}
      institutionId={institutionId}
      organizationId={userProfile.organization_id || ""}
    />
  )
}
