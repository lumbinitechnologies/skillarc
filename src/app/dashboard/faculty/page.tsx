import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import FacultyDashboardClient from "./faculty-dashboard-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"

export const dynamic = "force-dynamic"

export default async function FacultyDashboardPage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentDashboardSession()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")

  const supabase = await createSupabaseServerClient()
  const profile = context

  if (!profile || ![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(profile.role as any)) {
    redirect("/auth/login")
  }

  // Consolidated parallel batch: Fetch institutions, faculty_subjects, timetable_slots, timetable_weeks, and student count in ONE single Promise.all
  const tBatchStart = performance.now()
  const [
    institutionRes,
    assignedFacultySubjectsRes,
    timetableSlotsRes,
    weeksRes,
    studentCountRes,
  ] = await Promise.all([
    supabase.from("institutions").select("id, name").eq("id", profile.institution_id).maybeSingle(),
    supabase.from("faculty_subjects").select("subject_id, subjects!inner(id, name, code)").eq("faculty_id", profile.id).limit(6),
    supabase
      .from("timetable_slots")
      .select("day, period, section_id, week_id, subjects!inner(id, name, code), sections!inner(name)")
      .eq("faculty_id", profile.id)
      .order("day")
      .order("period"),
    profile.institution_id && profile.features.includes("multi_week_timetable")
      ? supabase
          .from("timetable_weeks")
          .select("id, start_date, end_date")
          .eq("institution_id", profile.institution_id)
      : Promise.resolve({ data: [] }),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("institution_id", profile.institution_id).eq("role", ROLES.STUDENT),
  ])
  const batchMs = performance.now() - tBatchStart

  const institution = institutionRes.data
  const assignedFacultySubjects = assignedFacultySubjectsRes.data ?? []
  const allSlots = (timetableSlotsRes.data ?? []) as any[]
  const weeksData = (weeksRes.data ?? []) as any[]
  const studentCount = studentCountRes.count ?? 0

  // Resolve active week in-memory
  let activeWeekId: string | null = null
  if (weeksData.length > 0) {
    const today = new Date().toISOString().split("T")[0]
    const currentWeek = weeksData.find((w: any) => w.start_date <= today && today <= w.end_date)
    if (currentWeek) {
      activeWeekId = currentWeek.id
    }
  }

  // Filter slots for active week, falling back to default template slots (week_id === null)
  let timetableRows = activeWeekId ? allSlots.filter((s: any) => s.week_id === activeWeekId) : []
  if (timetableRows.length === 0) {
    timetableRows = allSlots.filter((s: any) => !s.week_id)
  }
  timetableRows = timetableRows.slice(0, 8)

  const subjects = (assignedFacultySubjects ?? []).map((r: any) => 
    Array.isArray(r.subjects) ? r.subjects[0] : r.subjects
  ).filter(Boolean)

  const timetableSlots = timetableRows.map((slot: any) => ({
    day: slot.day,
    period: slot.period,
    section_id: slot.section_id,
    subjects: Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects,
    sections: Array.isArray(slot.sections) ? slot.sections[0] : slot.sections,
  }))

  const totalMs = performance.now() - tPageStart
  console.info(
    `[DashboardFaculty] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)} facultyId=${profile.id}`
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <FacultyDashboardClient
        faculty={{
          name: profile?.name ?? "",
          email: profile.email,
          institution: institution?.name ?? "",
        }}
        subjects={subjects ?? []}
        studentCount={studentCount ?? 0}
        timetableSlots={timetableSlots ?? []}
      />
    </div>
  )
}
