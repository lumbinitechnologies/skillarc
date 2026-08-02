import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import { FacultySubjectsClientPage } from "./faculty-subjects-client"

export default async function FacultySubjectsPage() {
  const supabase = await createSupabaseServerClient()

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

  const [facultyRes, subjectsRes, assignmentsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id,name")
      .eq("institution_id", institutionId)
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
      .order("name"),
    supabase
      .from("subjects")
      .select("id,name,code,semester")
      .eq("institution_id", institutionId)
      .order("name"),
    supabase
      .from("faculty_subjects")
      .select(`
        id,
        faculty_id,
        subject_id
      `)
      .eq("institution_id", institutionId),
  ])

  const faculty = facultyRes.data ?? []
  const subjects = subjectsRes.data ?? []
  const assignments = assignmentsRes.data ?? []

  return (
    <FacultySubjectsClientPage
      faculty={faculty}
      subjects={subjects}
      assignments={assignments}
    />
  )
}