import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import TeacherDashboardClient from "./teacher-dashboard-client"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function TeacherDashboardPage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentUserContext()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.FACULTY) redirect("/auth/login")

  const profile = context
  const supabase = await createSupabaseServerClient()

  const tBatchStart = performance.now()
  const [institutionRes, subjectsRes, studentCountRes] = await Promise.all([
    supabase
      .from("institutions")
      .select("id, name")
      .eq("id", profile.institution_id)
      .maybeSingle(),
    supabase
      .from("subjects")
      .select("id, name, code")
      .eq("teacher_id", profile.id),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", profile.institution_id)
      .eq("role", ROLES.STUDENT),
  ])
  const batchMs = performance.now() - tBatchStart
  const totalMs = performance.now() - tPageStart

  const institution = institutionRes.data
  const subjects = subjectsRes.data ?? []
  const studentCount = studentCountRes.count ?? 0

  console.info(
    `[DashboardTeacher] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)} teacherId=${profile.id}`
  )

  return (
    <TeacherDashboardClient
      teacher={{ email: profile.email ?? "", institution: institution?.name ?? "" }}
      subjects={subjects}
      studentCount={studentCount}
    />
  )
}