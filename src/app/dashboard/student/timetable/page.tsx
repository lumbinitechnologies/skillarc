import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import StudentTimetableClient from "./student-timetable-client"

export const dynamic = "force-dynamic"

export default async function StudentTimetablePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: userProfile } = await supabase
    .from("users")
    .select("id, role, institution_id, organization_id")
    .eq("id", user.id)
    .single()

  if (!userProfile || userProfile.role !== ROLES.STUDENT) redirect("/dashboard")

  const { data: studentData } = await supabase
    .from("students")
    .select("id, section_id")
    .eq("id", user.id)
    .single()

  const profile = { ...userProfile, ...studentData }

  // Check organization features for multi_week_timetable
  let multiWeekEnabled = false
  if (profile.organization_id) {
    const { data: orgData } = await supabase
      .from("organizations")
      .select("features")
      .eq("id", profile.organization_id)
      .single()
    multiWeekEnabled = Boolean(orgData?.features?.includes("multi_week_timetable"))
  }

  // Fetch weeks if multi-week is enabled
  let weeks: any[] = []
  if (multiWeekEnabled && profile.section_id) {
    const { data: weeksData } = await supabase
      .from("timetable_weeks")
      .select("*")
      .eq("institution_id", profile.institution_id)
      .eq("section_id", profile.section_id)
      .order("week_number", { ascending: true })
    weeks = weeksData ?? []
  }

  const { data: timetableRows = [] } = profile.section_id
    ? await supabase
        .from("timetable_slots")
        .select("id, day, period, subject_id, faculty_id, week_id")
        .eq("institution_id", profile.institution_id)
        .eq("section_id", profile.section_id)
        .order("day")
        .order("period")
    : { data: [] }

  const subjectIds = Array.from(new Set((timetableRows ?? []).map((slot: any) => slot.subject_id).filter(Boolean))) as string[]
  const subjectObj: Record<string, { name: string; code: string }> = {}
  if (subjectIds.length) {
    const { data: subjectRows = [] } = await supabase.from("subjects").select("id, name, code").in("id", subjectIds)
    ;(subjectRows ?? []).forEach((subject: any) => {
      subjectObj[subject.id] = { name: subject.name, code: subject.code }
    })
  }

  const facultyIds = Array.from(new Set((timetableRows ?? []).map((slot: any) => slot.faculty_id).filter(Boolean))) as string[]
  const facultyObj: Record<string, string> = {}
  if (facultyIds.length) {
    const { data: facultyRows = [] } = await supabase.from("users").select("id, name").in("id", facultyIds)
    ;(facultyRows ?? []).forEach((faculty: any) => {
      facultyObj[faculty.id] = faculty.name
    })
  }

  // Fetch timetable settings
  const { data: settings } = await supabase
    .from("institution_timetable_settings")
    .select("period_timings")
    .eq("institution_id", profile.institution_id)
    .maybeSingle()

  const periodTimings = settings?.period_timings as Array<{ id: string; label: string; time: string }> || []

  return (
    <StudentTimetableClient
      timetableRows={timetableRows ?? []}
      subjectMap={subjectObj}
      facultyMap={facultyObj}
      periodTimings={periodTimings}
      weeks={weeks}
      multiWeekEnabled={multiWeekEnabled}
    />
  )
}
