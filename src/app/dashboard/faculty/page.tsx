import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import FacultyDashboardClient from "./faculty-dashboard-client"

export const dynamic = "force-dynamic"

export default async function FacultyDashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("name, role, institution_id, organization_id")
    .eq("id", user.id)
    .single()

  if (!profile || ![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(profile.role as any)) {
    redirect("/auth/login")
  }

  // 1. Check if organization has multi_week_timetable enabled and find active week for today
  let activeWeekId: string | null = null
  if (profile.organization_id && profile.institution_id) {
    const [{ data: orgData }, { data: weeksData }] = await Promise.all([
      supabase.from("organizations").select("features").eq("id", profile.organization_id).single(),
      supabase.from("timetable_weeks").select("id, start_date, end_date").eq("institution_id", profile.institution_id),
    ])

    if (orgData?.features?.includes("multi_week_timetable") && weeksData && weeksData.length > 0) {
      const today = new Date().toISOString().split("T")[0]
      const currentWeek = weeksData.find((w: any) => w.start_date <= today && today <= w.end_date)
      if (currentWeek) {
        activeWeekId = currentWeek.id
      }
    }
  }

  let timetableQuery = supabase
    .from("timetable_slots")
    .select("day, period, section_id, week_id, subjects!inner(id, name, code), sections!inner(name)")
    .eq("faculty_id", user.id)

  if (activeWeekId) {
    timetableQuery = timetableQuery.eq("week_id", activeWeekId)
  } else {
    timetableQuery = timetableQuery.is("week_id", null)
  }

  const [{ data: institution }, { data: assignedSubjects }, { data: timetableRowsRes }, { count: studentCount }] = await Promise.all([
    supabase.from("institutions").select("id, name").eq("id", profile?.institution_id).maybeSingle(),
    supabase.from("faculty_subjects").select("subject_id").eq("faculty_id", user.id).limit(6),
    timetableQuery.limit(8),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("institution_id", profile?.institution_id).eq("role", ROLES.STUDENT),
  ])

  let timetableRows = timetableRowsRes ?? []
  // If active week has no slots yet, fallback to default template slots
  if (timetableRows.length === 0 && activeWeekId) {
    const { data: fallbackRows } = await supabase
      .from("timetable_slots")
      .select("day, period, section_id, week_id, subjects!inner(id, name, code), sections!inner(name)")
      .eq("faculty_id", user.id)
      .is("week_id", null)
      .limit(8)
    if (fallbackRows && fallbackRows.length > 0) {
      timetableRows = fallbackRows
    }
  }

  const subjectIds = (assignedSubjects ?? []).map((r: any) => r.subject_id)
  const { data: subjects } = subjectIds.length ? await supabase.from("subjects").select("id, name, code").in("id", subjectIds).limit(6) : { data: [] }

  const timetableSlots = (timetableRows ?? []).map((slot: any) => ({
    day: slot.day,
    period: slot.period,
    section_id: slot.section_id,
    subjects: Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects,
    sections: Array.isArray(slot.sections) ? slot.sections[0] : slot.sections,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <FacultyDashboardClient
        faculty={{
          name: profile?.name ?? "",
          email: user.email ?? "",
          institution: institution?.name ?? "",
        }}
        subjects={subjects ?? []}
        studentCount={studentCount ?? 0}
        timetableSlots={timetableSlots ?? []}
      />
    </div>
  )
}