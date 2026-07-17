import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import ProgramHeadDashboardClient from "./program-head-dashboard-client"
import { ROLES } from "@/constants/roles"

export const dynamic = "force-dynamic"

export default async function ProgramHeadDashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, institution_id, name")
    .eq("id", user.id)
    .single()

  if (profile?.role !== ROLES.PROGRAM_HEAD) redirect("/auth/login")

  // Fetch institutions, student counts, and courses in parallel
  const [institutionRes, studentCountRes, coursesRes] = await Promise.all([
    supabase
      .from("institutions")
      .select("id, name")
      .eq("id", profile.institution_id)
      .maybeSingle(),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", profile.institution_id)
      .eq("role", ROLES.STUDENT),
    supabase
      .from("courses")
      .select("id, name, code")
      .eq("institution_id", profile.institution_id)
      .order("name"),
  ])

  const institution = institutionRes.data
  const studentCount = studentCountRes.count ?? 0
  const courses = coursesRes.data ?? []

  return (
    <ProgramHeadDashboardClient
      programHead={{ name: profile.name ?? user.email ?? "Program Head", email: user.email ?? "", institution: institution?.name ?? "Institution" }}
      stats={{
        studentsCount: studentCount ?? 0,
        coursesCount: courses?.length ?? 0,
      }}
      courses={courses ?? []}
    />
  )
}
