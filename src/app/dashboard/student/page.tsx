import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import StudentPage from "./student-dashboard-client"
import { ROLES } from "@/constants/roles"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get user profile (common fields)
  const { data: userProfile } = await supabase
    .from("users")
    .select("id, role, institution_id, name, email, phone")
    .eq("id", user.id)
    .single()

  if (!userProfile || userProfile.role !== ROLES.STUDENT) redirect("/dashboard")

  // Get student-specific fields from students table
  const { data: studentData } = await supabase
    .from("students")
    .select("id, section_id, program_id, semester, registration_number, admission_year")
    .eq("id", user.id)
    .single()

  const profile = { ...userProfile, ...studentData }

  // 1. Fetch institution, section, timetable slots, and attendance records in parallel
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
    profile.section_id
      ? supabase
          .from("timetable_slots")
          .select("day, period, subject_id, faculty_id")
          .eq("institution_id", profile.institution_id)
          .eq("section_id", profile.section_id)
          .order("day")
          .order("period")
      : Promise.resolve({ data: [] }),
    profile.section_id
      ? supabase
          .from("attendance_records")
          .select("status, attendance_sessions!inner(section_id)")
          .eq("student_id", user.id)
          .eq("attendance_sessions.section_id", profile.section_id)
      : Promise.resolve({ data: [] }),
  ])

  const institution = institutionRes.data
  const section = sectionRes.data
  const timetableRows = timetableRes.data ?? []
  const attendanceRecords = attendanceRes.data ?? []

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
    const { data: programSubjects } = await subQuery
    if (programSubjects?.length) {
      subjectIds = programSubjects.map((s: any) => s.id)
    }
  }

  const facultyIds = Array.from(
    new Set((timetableRows ?? []).map((slot: any) => slot.faculty_id).filter(Boolean))
  ) as string[]

  // 2. Fetch program, subjects, and faculty details in parallel
  const [programRes, subjectsRes, facultyRes] = await Promise.all([
    programIdToFetch
      ? supabase
          .from("programs")
          .select("id, name")
          .eq("id", programIdToFetch)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    subjectIds.length
      ? supabase
          .from("subjects")
          .select("id, name, code")
          .in("id", subjectIds)
          .order("name")
      : Promise.resolve({ data: [] }),
    facultyIds.length
      ? supabase
          .from("users")
          .select("id, name")
          .in("id", facultyIds)
      : Promise.resolve({ data: [] }),
  ])

  const program = programRes.data
  const subjectRows = subjectsRes.data ?? []
  const facultyRows = facultyRes.data ?? []

  if (program) {
    programName = program.name ?? "Not assigned"
  }

  const facultyMap = new Map<string, string>()
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
        name: profile.name ?? user.email ?? "Student",
        email: profile.email ?? user.email ?? "",
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