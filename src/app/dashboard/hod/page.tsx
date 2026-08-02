import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import HodDashboardClient from "./hod-dashboard-client"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

export const dynamic = "force-dynamic"

export default async function HodDashboardPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.HOD) redirect("/auth/login")

  const profile = context
  const supabase = await createSupabaseServerClient()

  // Fetch institutions, faculty, and subjects in parallel
  const [institutionRes, facultyRes, subjectsRes] = await Promise.all([
    supabase
      .from("institutions")
      .select("id, name")
      .eq("id", profile.institution_id)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, name, email")
      .eq("institution_id", profile.institution_id)
      .in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD])
      .order("name"),
    supabase
      .from("subjects")
      .select("id, name, code, faculty_id, users(name)")
      .eq("institution_id", profile.institution_id)
      .order("name"),
  ])

  const institution = institutionRes.data
  const faculty = facultyRes.data ?? []
  const subjects = subjectsRes.data ?? []

  const formattedSubjects = (subjects ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    facultyId: s.faculty_id,
    facultyName: s.users?.name ?? "Unassigned",
  }))

  return (
    <HodDashboardClient
      hod={{ name: profile.name ?? profile.email ?? "HOD", email: profile.email ?? "", institution: institution?.name ?? "Institution" }}
      stats={{
        facultyCount: faculty?.length ?? 0,
        subjectsCount: formattedSubjects.length,
      }}
      faculty={faculty ?? []}
      subjects={formattedSubjects}
    />
  )
}
