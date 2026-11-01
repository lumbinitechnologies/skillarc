import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import { FacultySubjectsClientPage } from "./faculty-subjects-client"

export default async function FacultySubjectsPage() {
  const supabase = await createSupabaseServerClient()
  const adminSupabase = createSupabaseAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, institution_id")
    .eq("id", user.id)
    .single()

  if (profile?.role !== ROLES.INSTITUTION_ADMIN) {
    redirect("/dashboard")
  }

  const institutionId = profile.institution_id

  const [facultyRes, subjectsRes, assignmentsRes, departmentsRes, programsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id,name,department_id,department:department_id(id,name)")
      .eq("institution_id", institutionId)
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
      .order("name"),
    supabase
      .from("subjects")
      .select("id,name,code,semester,program_id,credits,subject_type")
      .eq("institution_id", institutionId)
      .order("name"),
    supabase
      .from("faculty_subjects")
      .select("id,faculty_id,subject_id")
      .eq("institution_id", institutionId),
    supabase
      .from("departments")
      .select("id,name")
      .eq("institution_id", institutionId)
      .order("name"),
    adminSupabase
      .from("programs")
      .select("id,name,department_id")
      .eq("institution_id", institutionId),
  ])

  const faculty = (facultyRes.data ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    department_id: f.department_id ?? null,
    department: (f.department as any)?.name ?? null,
  }))

  const departments = departmentsRes.data ?? []
  const programs = programsRes.data ?? []

  // Build a map: program_id → department_id
  const programDeptMap = new Map(programs.map((p: any) => [p.id, p.department_id]))

  const subjects = (subjectsRes.data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    semester: s.semester,
    credits: s.credits,
    subject_type: s.subject_type,
    program_id: s.program_id ?? null,
    department_id: s.program_id ? (programDeptMap.get(s.program_id) ?? null) : null,
  }))

  const assignments = assignmentsRes.data ?? []

  return (
    <FacultySubjectsClientPage
      faculty={faculty}
      subjects={subjects}
      assignments={assignments}
      departments={departments}
      institutionId={institutionId ?? ""}
    />
  )
}