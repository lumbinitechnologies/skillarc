import { redirect } from "next/navigation"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { ROLES } from "@/constants/roles"
import { StudentReportCardClient } from "./student-report-card-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { measureServer } from "@/lib/perf"

export const dynamic = "force-dynamic"

export default async function StudentReportCardPage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentDashboardSession()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.STUDENT) redirect("/dashboard")

  const adminClient = createSupabaseAdminClient()

  // 1. Fetch student academic info, timetable slots, and student submissions concurrently in Batch 1
  const tBatch1Start = performance.now()
  const [studentRes, timetableRes, submissionsRes] = await Promise.all([
    adminClient
      .from("students")
      .select("id, section_id, program_id, semester")
      .eq("id", context.id)
      .maybeSingle(),
    context.institution_id
      ? adminClient
          .from("timetable_slots")
          .select("subject_id")
          .eq("institution_id", context.institution_id)
      : Promise.resolve({ data: [] }),
    adminClient
      .from("submissions")
      .select("assignment_id, status, grade, feedback, submitted_at")
      .eq("student_id", context.id),
  ])
  const batch1Ms = performance.now() - tBatch1Start

  const studentData = studentRes.data
  const profile = {
    id: context.id,
    name: context.name || "Student",
    institution_id: context.institution_id,
    ...studentData,
  }

  const timetableRows = timetableRes.data ?? []
  let subjectIds = Array.from(
    new Set((timetableRows as Array<any>).map((slot) => slot.subject_id).filter(Boolean))
  ) as string[]

  if (subjectIds.length === 0 && (profile.program_id || profile.institution_id)) {
    let subQuery = adminClient.from("subjects").select("id")
    if (profile.program_id) {
      subQuery = subQuery.eq("program_id", profile.program_id)
    } else if (profile.institution_id) {
      subQuery = subQuery.eq("institution_id", profile.institution_id)
    }
    if (profile.semester) {
      subQuery = subQuery.eq("semester", profile.semester)
    }
    const { data: programSubjects } = await subQuery
    if (programSubjects?.length) {
      subjectIds = programSubjects.map((s: any) => s.id)
    }
  }

  if (!subjectIds.length) {
    const totalMs = performance.now() - tPageStart
    console.info(
      `[DashboardReportCard] contextMs=${contextMs.toFixed(1)} batch1Ms=${batch1Ms.toFixed(1)} batch2Ms=0.0 totalMs=${totalMs.toFixed(1)} studentId=${context.id}`
    )
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-white border border-slate-100 rounded-3xl shadow-sm my-8">
        <h3 className="text-xl font-semibold text-gray-700">No Academic Records</h3>
        <p className="text-gray-400 mt-2 text-sm">No subjects are assigned to your section.</p>
      </div>
    )
  }

  // 2. Fetch subjects, assignments, grade columns, and student grade entries concurrently in Batch 2
  const tBatch2Start = performance.now()
  const [subjectsResult, assignmentsResult, gradeColumnsResult, gradeEntriesResult] = await measureServer(
    "dashboard.student.report-card.data",
    () =>
      Promise.all([
        adminClient.from("subjects").select("id, name, code").in("id", subjectIds),
        adminClient
          .from("assignments")
          .select("id, subject_id, title, description, type, max_score, due_date, section_ids, created_at")
          .in("subject_id", subjectIds),
        adminClient
          .from("grade_columns")
          .select("id, subject_id, title, type, max_score, display_order")
          .in("subject_id", subjectIds)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        adminClient
          .from("grade_entries")
          .select("column_id, score, feedback, graded_at")
          .eq("student_id", context.id),
      ])
  )
  const batch2Ms = performance.now() - tBatch2Start
  const totalMs = performance.now() - tPageStart

  console.info(
    `[DashboardReportCard] contextMs=${contextMs.toFixed(1)} batch1Ms=${batch1Ms.toFixed(1)} batch2Ms=${batch2Ms.toFixed(1)} totalMs=${totalMs.toFixed(1)} studentId=${context.id}`
  )

  const subjects = subjectsResult.data ?? []
  const allAssignments = assignmentsResult.data ?? []

  // Filter assignments targeted at the student's section (excluding Materials and Syllabus)
  const sectionId = profile.section_id
  const sectionAssignments = (allAssignments ?? []).filter((a: any) => {
    if (a.type === "Material" || a.type === "Syllabus") return false
    if (!a.section_ids || a.section_ids.length === 0) return true
    return a.section_ids.includes(sectionId)
  })

  return (
    <StudentReportCardClient
      studentName={profile.name}
      subjects={subjects ?? []}
      assignments={sectionAssignments}
      submissions={submissionsRes.data ?? []}
      gradeColumns={gradeColumnsResult.data ?? []}
      gradeEntries={gradeEntriesResult.data ?? []}
    />
  )
}
