import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { measureServer } from "@/lib/perf"
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
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentDashboardSession()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.STUDENT) redirect("/dashboard")

  const supabase = await createSupabaseServerClient()

  const tBatchStart = performance.now()
  const [studentRes, institutionRes, recordsRes, leaveRes] = await measureServer(
    "dashboard.student.attendance.data",
    () =>
      Promise.all([
        supabase
          .from("students")
          .select(`
            id,
            institution_id,
            program_id,
            section_id,
            semester,
            registration_number,
            admission_year,
            dob,
            gender,
            sections:sections!section_id(
              id,
              name,
              semester,
              program_id,
              advisor:users!faculty_advisor_id(id, name)
            ),
            programs:programs!program_id(id, name)
          `)
          .eq("id", context.id)
          .maybeSingle(),
        context.institution_id
          ? supabase.from("institutions").select("id, name").eq("id", context.institution_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("attendance_records")
          .select(`
            status,
            session_id,
            attendance_sessions!inner(
              id,
              attendance_date,
              period,
              subject_id,
              faculty_id,
              subjects(id, name, code),
              users!faculty_id(id, name)
            )
          `)
          .eq("student_id", context.id),
        supabase
          .from("leave_applications")
          .select("id, from_date, to_date, reason, notes, status, created_at, approved_at, approved_by")
          .eq("student_id", context.id)
          .order("created_at", { ascending: false }),
      ])
  )
  const batchMs = performance.now() - tBatchStart

  const studentProfile = studentRes.data
  const institution = institutionRes.data
  const rawRecords = (recordsRes.data ?? []) as any[]
  const leaveApplications = (leaveRes.data ?? []) as any[]

  const section = Array.isArray(studentProfile?.sections) ? studentProfile.sections[0] : studentProfile?.sections
  const program = Array.isArray(studentProfile?.programs) ? studentProfile.programs[0] : studentProfile?.programs
  const advisor = Array.isArray(section?.advisor) ? section.advisor[0] : section?.advisor

  const sectionName = section?.name ?? "Not assigned"
  const programName = program?.name ?? "Not assigned"
  const sectionSemester = section?.semester ?? studentProfile?.semester ?? null
  const advisorName = advisor?.name ?? "Faculty advisor pending"
  const advisorId = advisor?.id ?? null
  const sectionId = section?.id ?? null

  const attendanceEntries: AttendanceEntry[] = rawRecords.map((r) => {
    const ses = Array.isArray(r.attendance_sessions) ? r.attendance_sessions[0] : r.attendance_sessions
    const sub = Array.isArray(ses?.subjects) ? ses.subjects[0] : ses?.subjects
    const fac = Array.isArray(ses?.users) ? ses.users[0] : ses?.users

    return {
      id: ses?.id ?? r.session_id,
      date: ses?.attendance_date ?? "",
      period: ses?.period ?? 1,
      subjectName: sub?.name ?? "Subject pending",
      subjectCode: sub?.code ?? "—",
      facultyName: fac?.name ?? "Faculty pending",
      status: r.status ?? "NOT_MARKED",
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
      if (entry.status === "APPROVED_ABSENCE" || entry.status === "EXCUSED") existing.present += 1
    }

    const effectivePresent = existing.present + existing.late
    existing.rate = existing.total > 0 ? Math.round((effectivePresent / existing.total) * 100) : 0
    summaryBySubject.set(entry.subjectName, existing)
  })

  const subjectSummaries = Array.from(summaryBySubject.values()).sort((a, b) => a.name.localeCompare(b.name))

  const totalRecords = attendanceEntries.filter((entry) => entry.status !== "NOT_MARKED").length
  const presentCount = attendanceEntries.filter((entry) => entry.status === "PRESENT").length
  const absentCount = attendanceEntries.filter((entry) => entry.status === "ABSENT").length
  const lateCount = attendanceEntries.filter((entry) => entry.status === "LATE").length
  const approvedCount = attendanceEntries.filter((entry) => entry.status === "APPROVED_ABSENCE" || entry.status === "EXCUSED").length
  const effectivePresent = presentCount + lateCount + approvedCount

  const overallSummary = {
    total: totalRecords,
    present: presentCount + approvedCount,
    absent: absentCount,
    late: lateCount,
    rate: totalRecords > 0 ? Math.round((effectivePresent / totalRecords) * 100) : 0,
  }

  const totalMs = performance.now() - tPageStart
  console.info(
    `[DashboardStudentAttendance] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)} studentId=${context.id}`
  )

  return (
    <AttendanceClient
      student={{
        name: context.name ?? context.email ?? "Student",
        email: context.email ?? "",
        institution: institution?.name ?? "Institution",
        sectionName,
        programName,
        semester: sectionSemester,
        registrationNumber: studentProfile?.registration_number ?? "",
        phone: context.phone ?? "",
        admissionYear: studentProfile?.admission_year ?? null,
      }}
      studentId={context.id}
      sectionId={sectionId}
      advisorId={advisorId}
      institutionId={context.institution_id}
      advisorName={advisorName}
      attendanceEntries={attendanceEntries}
      subjectSummaries={subjectSummaries}
      overallSummary={overallSummary}
      initialLeaveApplications={leaveApplications}
    />
  )
}
