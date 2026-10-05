import { getHodContext } from "@/lib/hod-context"
import HodAttendanceClient from "./attendance-client"

export const dynamic = "force-dynamic"

export default async function HodAttendancePage() {
  const { admin, institutionId, profile } = await getHodContext()

  // Sections in this institution
  const sectionsRes = await admin
    .from("sections")
    .select("id, name, semester, programs:program_id(id, name)")
    .eq("institution_id", institutionId)
    .order("name")

  const rawSections = (sectionsRes.data ?? []) as any[]
  const sectionIds = rawSections.map((s) => s.id)

  // All students in these sections
  const studentsRes = sectionIds.length
    ? await admin
        .from("students")
        .select("id, section_id")
        .in("section_id", sectionIds)
    : { data: [] }

  const students = (studentsRes.data ?? []) as any[]
  const studentIds = students.map((s) => s.id)

  // Attendance records
  const recordsRes = studentIds.length
    ? await admin
        .from("attendance_records")
        .select("student_id, status, attendance_sessions!inner(section_id, attendance_date)")
        .in("student_id", studentIds)
        .not("status", "eq", "NOT_MARKED")
    : { data: [] }

  const records = (recordsRes.data ?? []) as any[]

  // Build per-section attendance summary
  const sectionStats = rawSections.map((sec) => {
    const prog = Array.isArray(sec.programs) ? sec.programs[0] : sec.programs
    const sectionStudentIds = students.filter((s) => s.section_id === sec.id).map((s) => s.id)
    const secRecords = records.filter((r) => sectionStudentIds.includes(r.student_id))

    const total = secRecords.length
    const present = secRecords.filter((r) =>
      ["PRESENT", "APPROVED_ABSENCE", "EXCUSED", "LATE"].includes(r.status)
    ).length
    const absent = secRecords.filter((r) => r.status === "ABSENT").length
    const rate = total > 0 ? Math.round((present / total) * 100) : null

    return {
      id: sec.id,
      name: sec.name,
      semester: sec.semester,
      programName: prog?.name ?? "—",
      studentCount: sectionStudentIds.length,
      totalClasses: total,
      present,
      absent,
      rate,
    }
  })

  return (
    <HodAttendanceClient
      hodName={profile.name ?? "HOD"}
      sectionStats={sectionStats}
    />
  )
}
