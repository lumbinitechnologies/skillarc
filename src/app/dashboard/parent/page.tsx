import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import ParentDashboardClient from "./parent-dashboard-client"
import { ROLES } from "@/constants/roles"

import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { measureServer } from "@/lib/perf"

export const dynamic = "force-dynamic"

export default async function ParentDashboardPage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentDashboardSession()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.PARENT) redirect("/auth/login")

  const profile = context
  const supabase = await createSupabaseServerClient()

  // Consolidated parallel batch: Fetch parent relations (with joined students, sections, programs, advisors), timetable slots, attendance, and institution in ONE single Promise.all
  const tBatchStart = performance.now()
  const [relationsRes, timetableRes, attendanceRes, institutionRes] = await measureServer(
    "dashboard.parent.overview.data",
    () =>
      Promise.all([
        supabase
          .from("parent_student_relations")
          .select(`
            student_id,
            relationship,
            users:users!student_id(
              id,
              name,
              email,
              phone,
              students:students!id(
                id,
                section_id,
                semester,
                registration_number,
                admission_year,
                sections:sections!section_id(
                  id,
                  name,
                  semester,
                  users:users!faculty_advisor_id(id, name, email, phone)
                ),
                programs:programs!program_id(id, name)
              )
            )
          `)
          .eq("parent_id", profile.id),
        profile.institution_id
          ? supabase
              .from("timetable_slots")
              .select("day, period, section_id, subject_id, faculty_id, subjects(id, name, code), users!faculty_id(id, name)")
              .eq("institution_id", profile.institution_id)
              .order("day")
              .order("period")
          : Promise.resolve({ data: [] }),
        supabase
          .from("attendance_records")
          .select("student_id, status, attendance_sessions!inner(section_id, subject_id)"),
        profile.institution_id
          ? supabase
              .from("institutions")
              .select("id, name")
              .eq("id", profile.institution_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
  )
  const batchMs = performance.now() - tBatchStart

  const rawRelations = (relationsRes.data ?? []) as any[]
  const allSlots = (timetableRes.data ?? []) as any[]
  const allAttendance = (attendanceRes.data ?? []) as any[]
  const institution = institutionRes.data

  const childrenData = rawRelations.map((rel) => {
    const studentUser = Array.isArray(rel.users) ? rel.users[0] : rel.users
    const studentData = Array.isArray(studentUser?.students) ? studentUser.students[0] : studentUser?.students
    if (!studentUser || !studentData) return null

    const section = Array.isArray(studentData.sections) ? studentData.sections[0] : studentData.sections
    const program = Array.isArray(studentData.programs) ? studentData.programs[0] : studentData.programs
    const advisor = Array.isArray(section?.users) ? section.users[0] : section?.users

    // Filter timetable slots for this child section
    const childSlots = section?.id ? allSlots.filter((s: any) => s.section_id === section.id) : []

    // Build subject and faculty maps from joined slots
    const subjectMap = new Map<string, { id: string; name: string; code: string }>()
    const facultyMap = new Map<string, string>()

    childSlots.forEach((slot: any) => {
      const sub = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects
      const fac = Array.isArray(slot.users) ? slot.users[0] : slot.users
      if (sub?.id) {
        subjectMap.set(sub.id, { id: sub.id, name: sub.name, code: sub.code })
      }
      if (slot.faculty_id && fac?.name) {
        facultyMap.set(slot.faculty_id, fac.name)
      }
    })

    const formattedSubjects = Array.from(subjectMap.values()).map((sub) => {
      const slotForSub = childSlots.find((s: any) => s.subject_id === sub.id)
      return {
        id: sub.id,
        name: sub.name,
        code: sub.code,
        facultyName: (slotForSub?.faculty_id && facultyMap.get(slotForSub.faculty_id)) || "Faculty pending",
      }
    })

    const schedule = childSlots.map((slot: any) => {
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

    // Filter attendance records for this child
    const childAttendance = allAttendance.filter((a: any) => a.student_id === rel.student_id)
    const totalAttendance = childAttendance.length
    const presentCount = childAttendance.filter((r: any) => r.status === "PRESENT").length
    const absentCount = childAttendance.filter((r: any) => r.status === "ABSENT").length
    const lateCount = childAttendance.filter((r: any) => r.status === "LATE").length
    const attendanceRate = totalAttendance > 0 ? Math.round(((presentCount + lateCount) / totalAttendance) * 100) : 0

    return {
      id: rel.student_id,
      relationship: rel.relationship,
      name: studentUser.name || "Student",
      email: studentUser.email || "",
      phone: studentUser.phone || "—",
      registration_number: studentData.registration_number || "—",
      semester: section?.semester || studentData.semester || null,
      sectionName: section?.name || "—",
      programName: program?.name || "—",
      advisorName: advisor?.name || "No Advisor",
      advisorEmail: advisor?.email || "",
      advisorPhone: advisor?.phone || "",
      subjects: formattedSubjects,
      schedule,
      attendance: {
        rate: attendanceRate,
        total: totalAttendance,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
      },
    }
  })

  const validChildren = childrenData.filter(Boolean) as any[]
  const totalMs = performance.now() - tPageStart

  console.info(
    `[DashboardParent] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)} childrenCount=${validChildren.length} parentId=${profile.id}`
  )

  return (
    <ParentDashboardClient
      parent={{
        name: profile.name ?? profile.email ?? "Parent",
        email: profile.email ?? "",
        institution: institution?.name ?? "Institution",
      }}
      childrenList={validChildren}
    />
  )
}
