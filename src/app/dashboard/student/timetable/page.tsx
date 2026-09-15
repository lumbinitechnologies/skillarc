import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import StudentTimetableClient from "./student-timetable-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { measureServer } from "@/lib/perf"

export const dynamic = "force-dynamic"

export default async function StudentTimetablePage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentDashboardSession()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.STUDENT) redirect("/dashboard")

  const supabase = await createSupabaseServerClient()
  const multiWeekEnabled = context.features.includes("multi_week_timetable")

  // Consolidated parallel batch: Fetch student profile, timetable slots (with joined subjects & faculty), weeks, events, and settings in ONE single Promise.all
  const tBatchStart = performance.now()
  const [studentRes, timetableRes, weeksRes, eventsRes, settingsRes] = await measureServer(
    "dashboard.student.timetable.data",
    () =>
      Promise.all([
        supabase
          .from("students")
          .select("id, section_id, sections(name, program:program_id(name))")
          .eq("id", context.id)
          .maybeSingle(),
        context.institution_id
          ? supabase
              .from("timetable_slots")
              .select("id, day, period, section_id, subject_id, faculty_id, room, delivery_mode, meeting_link, notes, week_id, subjects(id, name, code), users!faculty_id(id, name)")
              .eq("institution_id", context.institution_id)
              .order("day")
              .order("period")
          : Promise.resolve({ data: [] }),
        multiWeekEnabled && context.institution_id
          ? supabase
              .from("timetable_weeks")
              .select("id, week_number, title, start_date, end_date, section_id")
              .eq("institution_id", context.institution_id)
              .order("week_number", { ascending: true })
          : Promise.resolve({ data: [] }),
        context.institution_id
          ? supabase
              .from("academic_calendar_events")
              .select("id, institution_id, title, event_type, start_date, end_date, description, affects_classes")
              .eq("institution_id", context.institution_id)
              .order("start_date", { ascending: true })
          : Promise.resolve({ data: [] }),
        context.institution_id
          ? supabase
              .from("institution_timetable_settings")
              .select("period_timings")
              .eq("institution_id", context.institution_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
  )
  const batchMs = performance.now() - tBatchStart

  const studentData = studentRes.data
  const sectionName = (studentData as any)?.sections?.name || "Your Section"
  const programName = (studentData as any)?.sections?.program?.name || "Enrolled Qualification"

  const allSlots = (timetableRes.data ?? []) as any[]
  const allWeeks = (weeksRes.data ?? []) as any[]
  const academicEvents = eventsRes.data ?? []

  // Filter slots & weeks for student's section
  const timetableRows = studentData?.section_id
    ? allSlots.filter((slot: any) => !slot.section_id || slot.section_id === studentData.section_id)
    : allSlots

  const weeks = studentData?.section_id
    ? allWeeks.filter((w: any) => !w.section_id || w.section_id === studentData.section_id)
    : allWeeks

  const subjectObj: Record<string, { name: string; code: string }> = {}
  const facultyObj: Record<string, string> = {}

  timetableRows.forEach((slot: any) => {
    const sub = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects
    const fac = Array.isArray(slot.users) ? slot.users[0] : slot.users
    if (slot.subject_id && sub?.name) {
      subjectObj[slot.subject_id] = { name: sub.name, code: sub.code ?? "—" }
    }
    if (slot.faculty_id && fac?.name) {
      facultyObj[slot.faculty_id] = fac.name
    }
  })

  const periodTimings = settingsRes.data?.period_timings as Array<{ id: string; label: string; time: string }> || [
    { id: "P1", label: "Period 1", time: "8:45 – 9:45" },
    { id: "P2", label: "Period 2", time: "9:45 – 10:45" },
    { id: "P3", label: "Period 3", time: "11:00 – 12:00" },
    { id: "P4", label: "Period 4", time: "12:00 – 1:00" },
    { id: "P5", label: "Period 5", time: "2:00 – 3:00" },
  ]

  const totalMs = performance.now() - tPageStart
  console.info(
    `[DashboardStudentTimetable] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)} studentId=${context.id}`
  )

  return (
    <StudentTimetableClient
      studentName={context.name || "Student"}
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
