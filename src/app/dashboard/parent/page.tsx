import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { redirect } from "next/navigation"
import ParentDashboardClient from "./parent-dashboard-client"
import { ROLES } from "@/constants/roles"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"

export const dynamic = "force-dynamic"

export default async function ParentDashboardPage() {
  const context = await getCurrentDashboardSession()

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.PARENT) redirect("/auth/login")

  const profile = context
  // Use admin client so RLS doesn't block reading other users' data
  const admin = createSupabaseAdminClient()

  // 1. Get all student relations for this parent
  const { data: relations } = await admin
    .from("parent_student_relations")
    .select("student_id, relationship")
    .eq("parent_id", profile.id)

  const studentIds = (relations ?? []).map((r) => r.student_id)

  // 2. Fetch all student data in parallel
  const [
    usersRes,
    studentsRes,
    institutionRes,
    attendanceRes,
    timetableRes,
  ] = await Promise.all([
    // student user profiles
    studentIds.length
      ? admin.from("users").select("id, name, email, phone").in("id", studentIds)
      : Promise.resolve({ data: [] }),

    // student academic records with section + program
    studentIds.length
      ? admin
          .from("students")
          .select(`
            id, semester, registration_number, admission_year, section_id, program_id,
            sections:section_id(
              id, name, semester,
              advisor:faculty_advisor_id(id, name, email, phone)
            ),
            programs:program_id(id, name)
          `)
          .in("id", studentIds)
      : Promise.resolve({ data: [] }),

    // institution name
    profile.institution_id
      ? admin.from("institutions").select("id, name").eq("id", profile.institution_id).maybeSingle()
      : Promise.resolve({ data: null }),

    // attendance — only for these students
    studentIds.length
      ? admin
          .from("attendance_records")
          .select("student_id, status, subject_id")
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] }),

    // timetable — only for this institution
    profile.institution_id
      ? admin
          .from("timetable_slots")
          .select(`
            section_id, day, period,
            subjects:subject_id(id, name, code),
            faculty:faculty_id(id, name)
          `)
          .eq("institution_id", profile.institution_id)
      : Promise.resolve({ data: [] }),
  ])

  const users = (usersRes.data ?? []) as any[]
  const students = (studentsRes.data ?? []) as any[]
  const institution = institutionRes.data as any
  const attendance = (attendanceRes.data ?? []) as any[]
  const timetableSlots = (timetableRes.data ?? []) as any[]

  const childrenList = (relations ?? []).map((rel) => {
    const user = users.find((u) => u.id === rel.student_id)
    const student = students.find((s) => s.id === rel.student_id)
    if (!user || !student) return null

    const section = Array.isArray(student.sections) ? student.sections[0] : student.sections
    const program = Array.isArray(student.programs) ? student.programs[0] : student.programs
    const advisor = section
      ? Array.isArray(section.advisor) ? section.advisor[0] : section.advisor
      : null

    // Timetable for this section
    const sectionSlots = section?.id
      ? timetableSlots.filter((s: any) => s.section_id === section.id)
      : []

    // Unique subjects
    const subjectMap = new Map<string, { id: string; name: string; code: string; facultyName: string }>()
    sectionSlots.forEach((slot: any) => {
      const sub = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects
      const fac = Array.isArray(slot.faculty) ? slot.faculty[0] : slot.faculty
      if (sub?.id && !subjectMap.has(sub.id)) {
        subjectMap.set(sub.id, {
          id: sub.id,
          name: sub.name,
          code: sub.code,
          facultyName: fac?.name ?? "Pending",
        })
      }
    })

    // Schedule
    const schedule = sectionSlots.map((slot: any) => {
      const sub = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects
      const fac = Array.isArray(slot.faculty) ? slot.faculty[0] : slot.faculty
      return {
        day: slot.day,
        period: slot.period,
        subjectName: sub?.name ?? "—",
        subjectCode: sub?.code ?? "—",
        facultyName: fac?.name ?? "Pending",
      }
    })

    // Attendance stats for this student
    const studentAttendance = attendance.filter((a: any) => a.student_id === rel.student_id)
    const total = studentAttendance.length
    const present = studentAttendance.filter((a: any) => a.status === "PRESENT").length
    const absent = studentAttendance.filter((a: any) => a.status === "ABSENT").length
    const late = studentAttendance.filter((a: any) => a.status === "LATE").length
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0

    // Per-subject attendance
    const subjectAttendance: Record<string, { total: number; present: number; absent: number }> = {}
    studentAttendance.forEach((a: any) => {
      if (!a.subject_id) return
      if (!subjectAttendance[a.subject_id]) {
        subjectAttendance[a.subject_id] = { total: 0, present: 0, absent: 0 }
      }
      subjectAttendance[a.subject_id].total++
      if (a.status === "PRESENT" || a.status === "LATE") subjectAttendance[a.subject_id].present++
      if (a.status === "ABSENT") subjectAttendance[a.subject_id].absent++
    })

    const subjects = Array.from(subjectMap.values()).map((sub) => ({
      ...sub,
      attendance: subjectAttendance[sub.id] ?? { total: 0, present: 0, absent: 0 },
    }))

    return {
      id: rel.student_id,
      relationship: rel.relationship ?? "Guardian",
      name: user.name ?? "Student",
      email: user.email ?? "",
      phone: user.phone ?? "",
      registration_number: student.registration_number ?? "—",
      semester: section?.semester ?? student.semester ?? null,
      admission_year: student.admission_year ?? null,
      sectionName: section?.name ?? "—",
      programName: program?.name ?? "—",
      advisorName: advisor?.name ?? "",
      advisorEmail: advisor?.email ?? "",
      advisorPhone: advisor?.phone ?? "",
      subjects,
      schedule,
      attendance: { rate: attendanceRate, total, present, absent, late },
    }
  }).filter(Boolean) as any[]

  return (
    <ParentDashboardClient
      parent={{
        name: profile.name ?? profile.email ?? "Parent",
        email: profile.email ?? "",
        institution: institution?.name ?? "Institution",
      }}
      childrenList={childrenList}
    />
  )
}
