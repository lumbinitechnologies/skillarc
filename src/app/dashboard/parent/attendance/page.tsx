import { getParentContext } from "@/lib/parent-context"
import ParentAttendanceClient from "./attendance-client"

export const dynamic = "force-dynamic"

export default async function ParentAttendancePage() {
  const { profile, children: students, admin } = await getParentContext()

  const studentIds = students.map((c) => c.id)

  // Fetch attendance records with session details for all children
  const recordsData = studentIds.length
    ? await admin
        .from("attendance_records")
        .select(`
          student_id, status,
          attendance_sessions!inner(
            id, attendance_date, period, subject_id, faculty_id,
            subjects(id, name, code),
            users!faculty_id(id, name)
          )
        `)
        .in("student_id", studentIds)
    : { data: [] }

  const raw = (recordsData.data ?? [])

  // Group records per child
  const byStudent = new Map<string, typeof raw[number][]>()
  for (const r of raw) {
    const sid = r.student_id
    const list = byStudent.get(sid) ?? []
    list.push(r)
    byStudent.set(sid, list)
  }

  const childAttendance = students.map((child) => {
    const records = (byStudent.get(child.id) ?? []).map((r) => {
      const ses = Array.isArray(r.attendance_sessions) ? r.attendance_sessions[0] : r.attendance_sessions
      const sub = Array.isArray(ses?.subjects) ? ses.subjects[0] : ses?.subjects
      const fac = Array.isArray(ses?.users) ? ses.users[0] : ses?.users
      return {
        date: ses?.attendance_date ?? "",
        period: ses?.period ?? 1,
        status: r.status ?? "NOT_MARKED",
        subjectName: sub?.name ?? "—",
        subjectCode: sub?.code ?? "—",
        facultyName: fac?.name ?? "—",
        subjectId: sub?.id ?? null,
      }
    })

    // Subject summaries
    const subjectMap: Record<string, { name: string; code: string; total: number; present: number; absent: number; late: number }> = {}
    for (const r of records) {
      if (r.status === "NOT_MARKED") continue
      const key = r.subjectName
      if (!subjectMap[key]) subjectMap[key] = { name: r.subjectName, code: r.subjectCode, total: 0, present: 0, absent: 0, late: 0 }
      subjectMap[key].total++
      if (r.status === "PRESENT" || r.status === "APPROVED_ABSENCE" || r.status === "EXCUSED") subjectMap[key].present++
      if (r.status === "ABSENT") subjectMap[key].absent++
      if (r.status === "LATE") { subjectMap[key].present++; subjectMap[key].late++ }
    }

    const marked = records.filter((r) => r.status !== "NOT_MARKED")
    const present = marked.filter((r) => r.status === "PRESENT" || r.status === "APPROVED_ABSENCE" || r.status === "EXCUSED" || r.status === "LATE").length
    const overall = { total: marked.length, present, absent: marked.filter((r) => r.status === "ABSENT").length, rate: marked.length > 0 ? Math.round((present / marked.length) * 100) : 0 }

    return {
      ...child,
      records,
      subjectSummaries: Object.values(subjectMap).map((s) => ({
        ...s,
        rate: s.total > 0 ? Math.round(((s.present) / s.total) * 100) : 0,
      })),
      overall,
    }
  })

  return (
    <ParentAttendanceClient
      parentName={profile.name ?? "Parent"}
      students={childAttendance}
    />
  )
}
