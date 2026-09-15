import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import StudentPage from "./student-dashboard-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { measureServer } from "@/lib/perf"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentDashboardSession()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.STUDENT) redirect("/dashboard")

  const supabase = await createSupabaseServerClient()

  // Consolidated parallel batch: Fetch student, timetable_slots, timetable_weeks, attendance, and institution in ONE single Promise.all
  const tBatchStart = performance.now()
  const [studentRes, timetableRes, weeksRes, attendanceRes, institutionRes] = await measureServer(
    "dashboard.student.overview.data",
    () =>
      Promise.all([
        supabase
          .from("students")
          .select("id, section_id, semester, program_id, registration_number, admission_year, sections(id, name, semester, program_id), programs(name)")
          .eq("id", context.id)
          .maybeSingle(),
        supabase
          .from("timetable_slots")
          .select("day, period, week_id, subject_id, faculty_id, subjects(id, name, code), users!faculty_id(id, name)")
          .eq("institution_id", context.institution_id)
          .order("day")
          .order("period"),
        context.institution_id && context.features.includes("multi_week_timetable")
          ? supabase
              .from("timetable_weeks")
              .select("id, start_date, end_date")
              .eq("institution_id", context.institution_id)
          : Promise.resolve({ data: [] }),
        supabase
          .from("attendance_records")
          .select("status, attendance_sessions!inner(section_id, subject_id)")
          .eq("student_id", context.id),
        supabase
          .from("institutions")
          .select("id, name")
          .eq("id", context.institution_id)
          .maybeSingle(),
      ])
  )
  const batchMs = performance.now() - tBatchStart

  const studentData = studentRes.data
  const section = studentData?.sections as any
  const program = studentData?.programs as any
  const institution = institutionRes.data
  const allSlots = (timetableRes.data ?? []) as any[]
  const weeksData = (weeksRes.data ?? []) as any[]
  const attendanceRecords = (attendanceRes.data ?? []) as any[]

  // Determine active week in-memory without any sequential database round-trips
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

  const totalMs = performance.now() - tPageStart

  console.info(
    `[DashboardStudent] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)} studentId=${context.id}`
  )

  const sectionName = section?.name ?? "Not assigned"
  const programName = program?.name ?? "Not assigned"
  const sectionSemester = section?.semester ?? studentData?.semester ?? null

  // Extract distinct subjects and faculty from joined timetable slots
  const subjectMap = new Map<string, { id: string; name: string; code: string }>()
  const facultyMap = new Map<string, string>()

  timetableRows.forEach((slot: any) => {
    const sub = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects
    const fac = Array.isArray(slot.users) ? slot.users[0] : slot.users
    if (sub?.id) {
      subjectMap.set(sub.id, { id: sub.id, name: sub.name, code: sub.code })
    }
    if (slot.faculty_id && fac?.name) {
      facultyMap.set(slot.faculty_id, fac.name)
    }
  })

  // Per-subject attendance calculations
  const subjectAttendanceMap = new Map<string, { present: number; absent: number; late: number; total: number }>()
  attendanceRecords.forEach((record: any) => {
    const subId = record.attendance_sessions?.subject_id
    if (!subId) return
    const cur = subjectAttendanceMap.get(subId) || { present: 0, absent: 0, late: 0, total: 0 }
    if (record.status !== "NOT_MARKED") {
      cur.total += 1
      if (record.status === "PRESENT" || record.status === "APPROVED_ABSENCE" || record.status === "EXCUSED") {
        cur.present += 1
      } else if (record.status === "ABSENT") {
        cur.absent += 1
      } else if (record.status === "LATE") {
        cur.late += 1
      }
    }
    subjectAttendanceMap.set(subId, cur)
  })

  const formattedSubjects = Array.from(subjectMap.values()).map((subject) => {
    const subAtt = subjectAttendanceMap.get(subject.id) || { present: 0, absent: 0, late: 0, total: 0 }
    const effectivePresent = subAtt.present + subAtt.late
    const rate = subAtt.total > 0 ? Math.round((effectivePresent / subAtt.total) * 100) : 0
    const facultySlot = timetableRows.find((slot: any) => slot.subject_id === subject.id)
    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      facultyName: (facultySlot?.faculty_id && facultyMap.get(facultySlot.faculty_id)) || "Faculty pending",
      attendanceRate: rate,
      attendedClasses: effectivePresent,
      totalClasses: subAtt.total,
    }
  })

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" })

  const schedule = timetableRows.map((slot: any) => {
    const sub = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects
    const fac = Array.isArray(slot.users) ? slot.users[0] : slot.users
    return {
      day: slot.day,
      period: slot.period,
      subjectName: sub?.name ?? "Subject pending",
      subjectCode: sub?.code ?? "—",
      facultyName: fac?.name ?? "Faculty pending",
    }
  })

  const todaySchedule = schedule.filter((slot) => slot.day === todayName)
  const upcomingSchedule = schedule.filter((slot) => slot.day !== todayName).slice(0, 4)

  const totalAttendance = attendanceRecords?.filter((r: any) => r.status !== "NOT_MARKED").length ?? 0
  const presentCount = attendanceRecords?.filter((record: any) => record.status === "PRESENT" || record.status === "APPROVED_ABSENCE" || record.status === "EXCUSED").length ?? 0
  const absentCount = attendanceRecords?.filter((record: any) => record.status === "ABSENT").length ?? 0
  const lateCount = attendanceRecords?.filter((record: any) => record.status === "LATE").length ?? 0
  const effectivePresent = presentCount + lateCount
  const attendanceRate = totalAttendance > 0 ? Math.round((effectivePresent / totalAttendance) * 100) : 0

  // 75% Criteria calculations
  const safeBuffer = attendanceRate >= 75 && totalAttendance > 0
    ? Math.max(0, Math.floor((effectivePresent - 0.75 * totalAttendance) / 0.75))
    : 0
  const requiredClasses = attendanceRate < 75 && totalAttendance > 0
    ? Math.max(0, Math.ceil((0.75 * totalAttendance - effectivePresent) / 0.25))
    : 0

  return (
    <StudentPage
      student={{
        name: context.name ?? context.email ?? "Student",
        email: context.email ?? "",
        institution: institution?.name ?? "Institution",
        sectionName,
        programName,
        semester: sectionSemester,
        registrationNumber: studentData?.registration_number ?? "",
        phone: context.phone ?? "",
        admissionYear: studentData?.admission_year ?? null,
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
        safeBuffer,
        requiredClasses,
      }}
    />
  )
}
