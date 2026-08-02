import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import AttendanceClient from "./attendance-client"

export const dynamic = "force-dynamic"

interface AttendanceEntry {
  id: string
  date: string
  period: number
  subjectName: string
  subjectCode: string
  facultyName: string
  status: string
}

interface SubjectSummary {
  id: string
  name: string
  code: string
  present: number
  absent: number
  late: number
  total: number
  rate: number
}

export default async function StudentAttendancePage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  // Get user profile first (common fields)
  const { data: userProfile } = await supabase
    .from("users")
    .select("id, role, institution_id, name, email, phone")
    .eq("id", user.id)
    .single()

  if (!userProfile || userProfile.role !== ROLES.STUDENT) redirect("/dashboard")

  // Get student-specific fields from students table
  const { data: studentProfile } = await supabase
    .from("students")
    .select("id, institution_id, program_id, section_id, semester, registration_number, admission_year, dob, gender")
    .eq("id", user.id)
    .single()

  const profile = { ...userProfile, ...studentProfile }

  const { data: institution } = await supabase
    .from("institutions")
    .select("id, name")
    .eq("id", profile.institution_id)
    .single()

  let sectionName = "Not assigned"
  let programName = "Not assigned"
  let sectionSemester: number | null = null
  let advisorName = "Faculty advisor pending"
  let advisorId: string | null = null
  let sectionId: string | null = null

  if (profile.section_id) {
    const { data: section } = await supabase
      .from("sections")
      .select("id, name, semester, program_id, faculty_advisor_id")
      .eq("id", profile.section_id)
      .single()

    if (section) {
      sectionId = section.id
      sectionName = section.name ?? "Not assigned"
      sectionSemester = section.semester ?? profile.semester ?? null
      if (section.program_id) {
        const { data: program } = await supabase
          .from("programs")
          .select("id, name")
          .eq("id", section.program_id)
          .single()

        if (program) {
          programName = program.name ?? "Not assigned"
        }
      }

      if (section.faculty_advisor_id) {
        advisorId = section.faculty_advisor_id
        const { data: advisor } = await supabase
          .from("users")
          .select("id, name")
          .eq("id", section.faculty_advisor_id)
          .single()

        advisorName = advisor?.name ?? advisorName
      }
    }
  } else if (profile.program_id) {
    const { data: program } = await supabase
      .from("programs")
      .select("id, name")
      .eq("id", profile.program_id)
      .single()

    if (program) {
      programName = program.name ?? "Not assigned"
    }
  }

  let attendanceEntries: AttendanceEntry[] = []
  let subjectSummaries: SubjectSummary[] = []
  let overallSummary = {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    rate: 0,
  }

  if (profile.section_id) {
    const { data: sessions = [] } = await supabase
      .from("attendance_sessions")
      .select("id, attendance_date, period, subject_id, faculty_id")
      .eq("section_id", profile.section_id)
      .order("attendance_date", { ascending: false })
      .order("period")

    const sessionIds = (sessions as Array<{ id: string }>).map((session) => session.id)

    const { data: records = [] } = sessionIds.length
      ? await supabase
          .from("attendance_records")
          .select("session_id, status")
          .eq("student_id", user.id)
          .in("session_id", sessionIds)
      : { data: [] }

    const recordMap = new Map((records as Array<{ session_id: string; status: string }>).map((record) => [record.session_id, record]))

    const subjectIds = Array.from(new Set((sessions as Array<{ subject_id: string | null }>).map((session) => session.subject_id).filter(Boolean))) as string[]
    const facultyIds = Array.from(new Set((sessions as Array<{ faculty_id: string | null }>).map((session) => session.faculty_id).filter(Boolean))) as string[]

    let subjectMap = new Map<string, { id: string; name: string; code: string }>()
    if (subjectIds.length) {
      const { data: subjects = [] } = await supabase
        .from("subjects")
        .select("id, name, code")
        .in("id", subjectIds)

      ;(subjects as Array<{ id: string; name: string; code: string }>).forEach((subject) => {
        subjectMap.set(subject.id, subject)
      })
    }

    let facultyMap = new Map<string, { id: string; name: string }>()
    if (facultyIds.length) {
      const { data: faculties = [] } = await supabase
        .from("users")
        .select("id, name")
        .in("id", facultyIds)

      ;(faculties as Array<{ id: string; name: string }>).forEach((faculty) => {
        facultyMap.set(faculty.id, faculty)
      })
    }

    attendanceEntries = (sessions as Array<{ id: string; attendance_date: string; period: number; subject_id: string | null; faculty_id: string | null }>).map((session) => {
      const record = recordMap.get(session.id)
      const subject = session.subject_id ? subjectMap.get(session.subject_id) : undefined
      const faculty = session.faculty_id ? facultyMap.get(session.faculty_id) : undefined

      return {
        id: session.id,
        date: session.attendance_date,
        period: session.period,
        subjectName: subject?.name ?? "Subject pending",
        subjectCode: subject?.code ?? "—",
        facultyName: faculty?.name ?? "Faculty pending",
        status: record?.status ?? "NOT_MARKED",
      }
    })

    const summaryBySubject = new Map<string, SubjectSummary>()
    attendanceEntries.forEach((entry) => {
      const existing = summaryBySubject.get(entry.subjectName) ?? {
        id: entry.id,
        name: entry.subjectName,
        code: entry.subjectCode,
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        rate: 0,
      }

      if (entry.status !== "NOT_MARKED") {
        existing.total += 1
        if (entry.status === "PRESENT") existing.present += 1
        if (entry.status === "ABSENT") existing.absent += 1
        if (entry.status === "LATE") existing.late += 1
      }

      const effectivePresent = existing.present + existing.late
      existing.rate = existing.total > 0 ? Math.round((effectivePresent / existing.total) * 100) : 0
      summaryBySubject.set(entry.subjectName, existing)
    })

    subjectSummaries = Array.from(summaryBySubject.values()).sort((a, b) => a.name.localeCompare(b.name))

    const totalRecords = attendanceEntries.filter((entry) => entry.status !== "NOT_MARKED").length
    const presentCount = attendanceEntries.filter((entry) => entry.status === "PRESENT").length
    const absentCount = attendanceEntries.filter((entry) => entry.status === "ABSENT").length
    const lateCount = attendanceEntries.filter((entry) => entry.status === "LATE").length
    const effectivePresent = presentCount + lateCount

    overallSummary = {
      total: totalRecords,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      rate: totalRecords > 0 ? Math.round((effectivePresent / totalRecords) * 100) : 0,
    }
  }

  return (
    <AttendanceClient
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
      studentId={profile.id}
      sectionId={sectionId}
      advisorId={advisorId}
      institutionId={profile.institution_id}
      advisorName={advisorName}
      attendanceEntries={attendanceEntries}
      subjectSummaries={subjectSummaries}
      overallSummary={overallSummary}
    />
  )
}
