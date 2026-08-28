import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import StudentPage from "./student-dashboard-client"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: context },
  } = await supabase.auth.getUser()

  if (!context) redirect("/auth/login")

  const { data: userProfile } = await supabase
    .from("users")
    .select("id, role, institution_id, organization_id, name, email, phone")
    .eq("id", context.id)
    .single()

  if (!userProfile || userProfile.role !== ROLES.STUDENT) redirect("/dashboard")

  const { data: studentData } = await supabase
    .from("students")
    .select("id, section_id, semester, program_id, registration_number, admission_year")
    .eq("id", context.id)
    .single()

  const profile = { ...userProfile, ...studentData }

  // 1. Check if organization has multi_week_timetable enabled and find active week for today
  let activeWeekId: string | null = null
  if (profile.organization_id && profile.section_id) {
    const [{ data: orgData }, { data: weeksData }] = await Promise.all([
      supabase.from("organizations").select("features").eq("id", profile.organization_id).single(),
      supabase.from("timetable_weeks").select("id, start_date, end_date").eq("section_id", profile.section_id),
    ])

    if (orgData?.features?.includes("multi_week_timetable") && weeksData && weeksData.length > 0) {
      const today = new Date().toISOString().split("T")[0]
      const currentWeek = weeksData.find((w: any) => w.start_date <= today && today <= w.end_date)
      if (currentWeek) {
        activeWeekId = currentWeek.id
      }
    }
  }

  // 2. Fetch institution, section, timetable slots, and attendance records in parallel
  let timetableQuery = profile.section_id
    ? supabase
        .from("timetable_slots")
        .select("day, period, subject_id, faculty_id, week_id")
        .eq("institution_id", profile.institution_id)
        .eq("section_id", profile.section_id)
        .order("day")
        .order("period")
    : null

  if (timetableQuery) {
    if (activeWeekId) {
      timetableQuery = timetableQuery.eq("week_id", activeWeekId)
    } else {
      timetableQuery = timetableQuery.is("week_id", null)
    }
  }

  const [institutionRes, sectionRes, timetableRes, attendanceRes] = await Promise.all([
    supabase
      .from("institutions")
      .select("id, name")
      .eq("id", profile.institution_id)
      .maybeSingle(),
    profile.section_id
      ? supabase
          .from("sections")
          .select("id, name, semester, program_id")
          .eq("id", profile.section_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    timetableQuery ? timetableQuery : Promise.resolve({ data: [] }),
    profile.section_id
      ? supabase
          .from("attendance_records")
          .select("status, attendance_sessions!inner(section_id)")
          .eq("student_id", context.id)
          .eq("attendance_sessions.section_id", profile.section_id)
      : Promise.resolve({ data: [] }),
  ])

  const institution = institutionRes.data
  const section = sectionRes.data
  let timetableRows = timetableRes.data ?? []
  const attendanceRecords = attendanceRes.data ?? []

  // If active week has no slots assigned yet, fallback to default template slots
  if (timetableRows.length === 0 && activeWeekId && profile.section_id) {
    const { data: fallbackRows } = await supabase
      .from("timetable_slots")
      .select("day, period, subject_id, faculty_id, week_id")
      .eq("institution_id", profile.institution_id)
      .eq("section_id", profile.section_id)
      .is("week_id", null)
      .order("day")
      .order("period")
    if (fallbackRows && fallbackRows.length > 0) {
      timetableRows = fallbackRows
    }
  }

  let sectionName = "Not assigned"
  let programName = "Not assigned"
  let sectionSemester: number | null = null

  if (section) {
    sectionName = section.name ?? "Not assigned"
    sectionSemester = section.semester ?? profile.semester ?? null
  }

  const programIdToFetch = section?.program_id || profile.program_id
  let subjectIds = Array.from(
    new Set((timetableRows ?? []).map((slot: any) => slot.subject_id).filter(Boolean))
  ) as string[]

  if (subjectIds.length === 0 && (programIdToFetch || profile.institution_id)) {
    let subQuery = supabase
      .from("subjects")
      .select("id")
    if (programIdToFetch) {
      subQuery = subQuery.eq("program_id", programIdToFetch)
    } else if (profile.institution_id) {
      subQuery = subQuery.eq("institution_id", profile.institution_id)
    }
    const currentSem = sectionSemester ?? profile.semester
    if (currentSem) {
      subQuery = subQuery.eq("semester", currentSem)
    }
    const { data: subData } = await subQuery.limit(8)
    subjectIds = (subData ?? []).map((s: any) => s.id)
  }

  let subjectRows: any[] = []
  if (subjectIds.length > 0) {
    const { data } = await supabase
      .from("subjects")
      .select("id, name, code")
      .in("id", subjectIds)
    subjectRows = data ?? []
  }

  let facultyIds = Array.from(
    new Set((timetableRows ?? []).map((slot: any) => slot.faculty_id).filter(Boolean))
  ) as string[]

  if (facultyIds.length === 0 && subjectIds.length > 0) {
    const { data: fsData } = await supabase
      .from("faculty_subjects")
      .select("faculty_id")
      .in("subject_id", subjectIds)
    facultyIds = Array.from(new Set((fsData ?? []).map((fs: any) => fs.faculty_id).filter(Boolean))) as string[]
  }

  let facultyRows: any[] = []
  if (facultyIds.length > 0) {
    const { data } = await supabase
      .from("users")
      .select("id, name")
      .in("id", facultyIds)
    facultyRows = data ?? []
  }

  if (programIdToFetch) {
    const { data: prog } = await supabase
      .from("programs")
      .select("name")
      .eq("id", programIdToFetch)
      .maybeSingle()
    if (prog?.name) programName = prog.name
  }

  const facultyMap = new Map()
  ;(facultyRows ?? []).forEach((faculty: any) => {
    facultyMap.set(faculty.id, faculty.name)
  })

  const formattedSubjects = (subjectRows ?? []).map((subject: any) => ({
    id: subject.id,
    name: subject.name,
    code: subject.code,
    facultyName: facultyMap.get((timetableRows ?? []).find((slot: any) => slot.subject_id === subject.id)?.faculty_id) ?? "Faculty pending",
  }))

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" })
  const subjectMap = new Map((subjectRows ?? []).map((subject: any) => [subject.id, subject]))

  const schedule = (timetableRows ?? []).map((slot: any) => ({
    day: slot.day,
    period: slot.period,
    subjectName: subjectMap.get(slot.subject_id)?.name ?? "Subject pending",
    subjectCode: subjectMap.get(slot.subject_id)?.code ?? "—",
    facultyName: facultyMap.get(slot.faculty_id) ?? "Faculty pending",
  }))

  const todaySchedule = schedule.filter((slot) => slot.day === todayName)
  const upcomingSchedule = schedule.filter((slot) => slot.day !== todayName).slice(0, 4)

  const totalAttendance = attendanceRecords?.length ?? 0
  const presentCount = (attendanceRecords ?? []).filter((record: any) => record.status === "PRESENT").length
  const absentCount = (attendanceRecords ?? []).filter((record: any) => record.status === "ABSENT").length
  const lateCount = (attendanceRecords ?? []).filter((record: any) => record.status === "LATE").length
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0

  return (
    <StudentPage
      student={{
        name: profile.name ?? profile.email ?? "Student",
        email: profile.email ?? "",
        institution: institution?.name ?? "Institution",
        sectionName,
        programName,
        semester: sectionSemester ?? profile.semester ?? null,
        registrationNumber: profile.registration_number ?? "",
        phone: profile.phone ?? "",
        admissionYear: profile.admission_year ?? null,
      }}
      subjects={formattedSubjects}
      schedule={todaySchedule}
      upcomingSchedule={upcomingSchedule}
      attendance={{
        rate: attendanceRate,
        total: totalAttendance,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
      }}
    />
  )
}