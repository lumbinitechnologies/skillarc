import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import StudentTimetableClient from "./student-timetable-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { measureServer } from "@/lib/perf"

export const dynamic = "force-dynamic"

export default async function StudentTimetablePage() {
  const context = await getCurrentDashboardSession()
  if (!context) redirect("/auth/login")

  const supabase = await createSupabaseServerClient()
  if (context.role !== ROLES.STUDENT) redirect("/dashboard")

  const { data: studentData } = await supabase
    .from("students")
    .select("id, section_id, sections(name, program:program_id(name))")
    .eq("id", context.id)
    .single()

  const profile = { ...context, ...studentData }
  const sectionName = (studentData as any)?.sections?.name || "Your Section"
  const programName = (studentData as any)?.sections?.program?.name || "Enrolled Qualification"

  // Check organization features for multi_week_timetable
  const multiWeekEnabled = context.features.includes("multi_week_timetable")

  // Fetch weeks if multi-week is enabled
  const [weeksResult, eventsResult, timetableResult, settingsResult] = await measureServer("dashboard.student.timetable.data", () => Promise.all([
    multiWeekEnabled && profile.section_id
      ? supabase
          .from("timetable_weeks")
          .select("id, week_number, title, start_date, end_date")
          .eq("institution_id", profile.institution_id)
          .eq("section_id", profile.section_id)
          .order("week_number", { ascending: true })
      : Promise.resolve({ data: [] }),
    profile.institution_id
      ? supabase
          .from("academic_calendar_events")
          .select("id, institution_id, title, event_type, start_date, end_date, description, affects_classes")
          .eq("institution_id", profile.institution_id)
          .order("start_date", { ascending: true })
      : Promise.resolve({ data: [] }),
    profile.section_id
      ? supabase
          .from("timetable_slots")
          .select("id, day, period, subject_id, faculty_id, room, delivery_mode, meeting_link, notes, week_id")
          .eq("institution_id", profile.institution_id)
          .eq("section_id", profile.section_id)
          .order("day")
          .order("period")
      : Promise.resolve({ data: [] }),
    profile.institution_id
      ? supabase
          .from("institution_timetable_settings")
          .select("period_timings")
          .eq("institution_id", profile.institution_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]))

  const weeks = weeksResult.data ?? []
  const academicEvents = eventsResult.data ?? []
  const timetableRows = timetableResult.data ?? []

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

  const periodTimings = settingsResult.data?.period_timings as Array<{ id: string; label: string; time: string }> || [
    { id: "P1", label: "Period 1", time: "8:45 – 9:45" },
    { id: "P2", label: "Period 2", time: "9:45 – 10:45" },
    { id: "P3", label: "Period 3", time: "11:00 – 12:00" },
    { id: "P4", label: "Period 4", time: "12:00 – 1:00" },
    { id: "P5", label: "Period 5", time: "2:00 – 3:00" },
  ]

  return (
    <StudentTimetableClient
      studentName={profile.name || "Student"}
      sectionName={sectionName}
      programName={programName}
      timetableRows={timetableRows ?? []}
      subjectMap={subjectObj}
      facultyMap={facultyObj}
      periodTimings={periodTimings}
      weeks={weeks}
      academicEvents={academicEvents}
      multiWeekEnabled={multiWeekEnabled}
    />
  )
}
