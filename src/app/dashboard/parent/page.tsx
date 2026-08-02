import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import ParentDashboardClient from "./parent-dashboard-client"
import { ROLES } from "@/constants/roles"

import { getCurrentUserContext } from "@/lib/user-context"

export const dynamic = "force-dynamic"

export default async function ParentDashboardPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.PARENT) redirect("/auth/login")

  const profile = context
  const supabase = await createSupabaseServerClient()

  const { data: institution } = await supabase
    .from("institutions")
    .select("id, name")
    .eq("id", profile.institution_id)
    .single()

  // Fetch parent-student relations
  const { data: relations = [] } = await supabase
    .from("parent_student_relations")
    .select("student_id, relationship")
    .eq("parent_id", profile.id)

  const childrenData = await Promise.all(
    (relations || []).map(async (rel) => {
      const studentId = rel.student_id

      // Fetch user profile + student record in parallel
      const [userProfileRes, studentDataRes] = await Promise.all([
        supabase.from("users").select("id, name, email, phone").eq("id", studentId).single(),
        supabase.from("students").select("id, section_id, program_id, semester, registration_number, admission_year").eq("id", studentId).single()
      ])

      const userProfile = userProfileRes.data
      const studentData = studentDataRes.data

      if (!userProfile || !studentData) return null

      // Fetch section and program
      const [sectionRes, programRes] = await Promise.all([
        studentData.section_id
          ? supabase.from("sections").select("id, name, semester, program_id, faculty_advisor_id").eq("id", studentData.section_id).maybeSingle()
          : Promise.resolve({ data: null }),
        studentData.program_id
          ? supabase.from("programs").select("id, name").eq("id", studentData.program_id).maybeSingle()
          : Promise.resolve({ data: null })
      ])

      const section = sectionRes.data
      const program = programRes.data

      // Fetch advisor details
      let advisor = null
      if (section?.faculty_advisor_id) {
        const { data: adv } = await supabase
          .from("users")
          .select("id, name, email, phone")
          .eq("id", section.faculty_advisor_id)
          .maybeSingle()
        advisor = adv
      }

      // Fetch timetable
      const { data: timetableSlots } = studentData.section_id
        ? await supabase
            .from("timetable_slots")
            .select("day, period, subject_id, faculty_id")
            .eq("institution_id", profile.institution_id)
            .eq("section_id", studentData.section_id)
            .order("day")
            .order("period")
        : { data: [] }

      // Fetch attendance
      const { data: attendanceRecords } = studentData.section_id
        ? await supabase
            .from("attendance_records")
            .select("status, attendance_sessions!inner(section_id)")
            .eq("student_id", studentId)
            .eq("attendance_sessions.section_id", studentData.section_id)
        : { data: [] }

      // Identify subjects in timetable
      let subjectIds = Array.from(new Set((timetableSlots ?? []).map((s: any) => s.subject_id).filter(Boolean))) as string[]

      if (subjectIds.length === 0 && (studentData.program_id || profile.institution_id)) {
        let subQuery = supabase.from("subjects").select("id")
        if (studentData.program_id) {
          subQuery = subQuery.eq("program_id", studentData.program_id)
        } else {
          subQuery = subQuery.eq("institution_id", profile.institution_id)
        }
        const currentSem = section?.semester || studentData.semester
        if (currentSem) {
          subQuery = subQuery.eq("semester", currentSem)
        }
        const { data: progSubs } = await subQuery
        if (progSubs?.length) {
          subjectIds = progSubs.map((s: any) => s.id)
        }
      }

      // Fetch subject & faculty names
      const facultyIds = Array.from(new Set((timetableSlots ?? []).map((s: any) => s.faculty_id).filter(Boolean))) as string[]
      const [subjectsRes, facultyRes] = await Promise.all([
        subjectIds.length ? supabase.from("subjects").select("id, name, code").in("id", subjectIds) : Promise.resolve({ data: [] }),
        facultyIds.length ? supabase.from("users").select("id, name").in("id", facultyIds) : Promise.resolve({ data: [] })
      ])

      const subjects = subjectsRes.data || []
      const faculties = facultyRes.data || []

      const facultyMap = new Map((faculties ?? []).map((f: any) => [f.id, f.name]))
      const subjectMap = new Map((subjects ?? []).map((s: any) => [s.id, s]))

      const formattedSubjects = subjects.map((sub: any) => {
        const slotsForSub = (timetableSlots ?? []).filter((s: any) => s.subject_id === sub.id)
        const facId = slotsForSub.find((s: any) => s.faculty_id)?.faculty_id
        return {
          id: sub.id,
          name: sub.name,
          code: sub.code,
          facultyName: facId ? (facultyMap.get(facId) ?? "Faculty pending") : "Faculty pending"
        }
      })

      const schedule = (timetableSlots ?? []).map((slot: any) => ({
        day: slot.day,
        period: slot.period,
        subjectName: subjectMap.get(slot.subject_id)?.name ?? "Subject pending",
        subjectCode: subjectMap.get(slot.subject_id)?.code ?? "—",
        facultyName: facultyMap.get(slot.faculty_id) ?? "Faculty pending",
      }))

      // Attendance calculations
      const totalAttendance = attendanceRecords?.length ?? 0
      const presentCount = (attendanceRecords ?? []).filter((r: any) => r.status === "PRESENT").length
      const absentCount = (attendanceRecords ?? []).filter((r: any) => r.status === "ABSENT").length
      const lateCount = (attendanceRecords ?? []).filter((r: any) => r.status === "LATE").length
      const attendanceRate = totalAttendance > 0 ? Math.round(((presentCount + lateCount) / totalAttendance) * 100) : 0

      return {
        id: studentId,
        relationship: rel.relationship,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone || "—",
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
          late: lateCount
        }
      }
    })
  )

  const validChildren = childrenData.filter(Boolean) as any[]

  return (
    <ParentDashboardClient
      parent={{
        name: profile.name ?? profile.email ?? "Parent",
        email: profile.email ?? "",
        institution: institution?.name ?? "Institution"
      }}
      childrenList={validChildren}
    />
  )
}
