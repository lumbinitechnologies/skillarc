import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import ProgramHeadDashboardClient from "./program-head-dashboard-client"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

export const dynamic = "force-dynamic"

export default async function ProgramHeadDashboardPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.PROGRAM_HEAD) redirect("/auth/login")

  const profile = context
  const supabase = await createSupabaseServerClient()

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
      programHead={{ name: profile.name ?? profile.email ?? "Program Head", email: profile.email ?? "", institution: institution?.name ?? "Institution" }}
      stats={{
        studentsCount: studentCount ?? 0,
        coursesCount: courses?.length ?? 0,
      }}
      courses={courses ?? []}
    />
  )
}
