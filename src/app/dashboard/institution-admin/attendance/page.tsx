import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import AttendanceClient from "./attendance-client"

export default async function AttendancePage() {
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

  const [programsRes, sectionsRes, subjectsRes, studentRecordsRes] = await Promise.all([
    supabase
      .from("programs")
      .select("id,name")
      .eq("institution_id", institutionId)
      .order("name"),
    supabase
      .from("sections")
      .select("id,name,semester,program_id")
      .eq("institution_id", institutionId)
      .order("semester"),
    supabase
      .from("subjects")
      .select("id,name,code,semester")
      .eq("institution_id", institutionId)
      .order("semester"),
    supabase
      .from("students")
      .select("*")
      .eq("institution_id", institutionId),
  ])

  const programs = programsRes.data ?? []
  const sections = sectionsRes.data ?? []
  const subjects = subjectsRes.data ?? []
  const studentRecords = studentRecordsRes.data ?? []

  const studentIds = studentRecords.map((s: any) => s.id)
  const { data: userRecords = [] } = studentIds.length
    ? await supabase
        .from("users")
        .select("id, name, email, role")
        .in("id", studentIds)
    : { data: [] }

  const students = studentRecords.map((s: any) => {
    const user = (userRecords ?? []).find((u: any) => u.id === s.id)
    return {
      ...s,
      name: user?.name || "Unknown Student",
      email: user?.email || "",
      role: user?.role || "STUDENT",
    }
  })

  return (
    <AttendanceClient
      institutionId={institutionId}
      programs={programs ?? []}
      sections={sections ?? []}
      subjects={subjects ?? []}
      students={students ?? []}
    />
  )
}