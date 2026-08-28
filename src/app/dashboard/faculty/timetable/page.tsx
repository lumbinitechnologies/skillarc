import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import FacultyTimetableClient from "./faculty-timetable-client"

export const dynamic = "force-dynamic"

export default async function FacultyTimetablePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, institution_id, organization_id")
    .eq("id", user.id)
    .single()

  if (!profile || ![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(profile.role)) redirect("/dashboard")

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
  if (multiWeekEnabled && profile.institution_id) {
    const { data: weeksData } = await supabase
      .from("timetable_weeks")
      .select("*")
      .eq("institution_id", profile.institution_id)
      .order("week_number", { ascending: true })

    // Deduplicate weeks by week_number + date range across sections if any
    const seen = new Set<string>()
    weeks = (weeksData ?? []).filter((w: any) => {
      const key = `${w.week_number}-${w.start_date}-${w.end_date}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // Fetch timetable settings
  const { data: settings } = await supabase
    .from("institution_timetable_settings")
    .select("period_timings")
    .eq("institution_id", profile.institution_id)
    .maybeSingle()

  const periodTimings = settings?.period_timings as Array<{ id: string; label: string; time: string }> || []
  const periodLabelsMap: Record<number, string> = {}
  periodTimings.forEach((p) => {
    const num = Number(p.id.replace("P", ""))
    if (!isNaN(num)) {
      periodLabelsMap[num] = p.time
    }
  })

  const finalPeriodLabels = Object.keys(periodLabelsMap).length > 0 ? periodLabelsMap : {
    1: "8:45 – 9:45",
    2: "9:45 – 10:45",
    3: "11:00 – 12:00",
    4: "12:00 – 1:00",
    5: "2:00 – 3:00",
  }

  const { data: timetableRows = [] } = await supabase
    .from("timetable_slots")
    .select(`
      id,
      day,
      period,
      section_id,
      subject_id,
      week_id,
      subjects!inner(id, name, code),
      sections!inner(name)
    `)
    .eq("institution_id", profile.institution_id)
    .eq("faculty_id", user.id)
    .order("day")
    .order("period")

  const slots = (timetableRows as Array<any>).map((slot) => ({
    id: slot.id,
    day: slot.day,
    period: slot.period,
    subject: slot.subjects?.code ?? slot.subjects?.name ?? "Class",
    section: slot.sections?.name ?? "Section",
    room: slot.sections?.name ? `Room ${slot.sections.name}` : "Main Hall",
    time: `Period ${slot.period} · ${finalPeriodLabels[slot.period] ?? "TBD"}`,
    week_id: slot.week_id ?? null,
  }))

  return (
    <FacultyTimetableClient
      slots={slots}
      weeks={weeks}
      multiWeekEnabled={multiWeekEnabled}
    />
  )
}
