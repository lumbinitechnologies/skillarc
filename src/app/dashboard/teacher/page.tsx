import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import TeacherDashboardClient from "./teacher-dashboard-client"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function TeacherDashboardPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.FACULTY) redirect("/auth/login")

  const profile = context
  const supabase = await createSupabaseServerClient()

  const { data: institution } = await supabase
    .from("institutions")
    .select("id, name")
    .eq("id", profile.institution_id)
    .single()

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, code")
    .eq("teacher_id", profile.id)

  const { count: studentCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("institution_id", profile.institution_id)
    .eq("role", ROLES.STUDENT)

  return (
    <TeacherDashboardClient
      teacher={{ email: profile.email ?? "", institution: institution?.name ?? "" }}
      subjects={subjects ?? []}
      studentCount={studentCount ?? 0}
    />
  )
}