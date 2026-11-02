import { redirect } from "next/navigation"
import { ROLES } from "@/constants/roles"
import { StudentReportCardClient } from "./student-report-card-client"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { measureServer } from "@/lib/perf"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export default async function StudentReportCardPage() {


  const context = await measureServer("app.dashboard.student.report-card.context", () => getCurrentDashboardSession())


  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.STUDENT) redirect("/dashboard")

  const supabase = await createSupabaseServerClient()

  // 1. Read the student's own profile, authorized courses, and submissions.
  const tBatch1Start = performance.now()
  const [studentRes, subjectsRes, submissionsRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, section_id, program_id, semester")
      .eq("id", context.id)
      .maybeSingle(),
    supabase.from("subjects").select("id, name, code"),
    supabase
      .from("submissions")
      .select("assignment_id, status, grade, feedback, submitted_at")
      .eq("student_id", context.id),
  ]))


  const studentData = studentRes.data
  const profile = {
    id: context.id,
    name: context.name || "Student",
    institution_id: context.institution_id,
    ...studentData,
  }

  const subjectsRows = subjectsRes.data ?? []
  const subjectIds = subjectsRows.map((subject) => subject.id)

  if (!subjectIds.length) {


    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-white border border-slate-100 rounded-3xl shadow-sm my-8">
        <h3 className="text-xl font-semibold text-gray-700">No Academic Records</h3>
        <p className="text-gray-400 mt-2 text-sm">No subjects are assigned to your section.</p>
      </div>
    )
  }

  // 2. Fetch subjects, assignments, grade columns, and student grade entries concurrently in Batch 2

  const [subjectsResult, assignmentsResult, gradeColumnsResult, gradeEntriesResult] = await measureServer(
    "dashboard.student.report-card.data",
    () =>
      Promise.all([
        supabase.from("subjects").select("id, name, code").in("id", subjectIds),
        supabase
          .from("assignments")
          .select("id, subject_id, title, description, type, max_score, due_date, section_ids, created_at")
          .in("subject_id", subjectIds),
        supabase
          .from("grade_columns")
          .select("id, subject_id, title, type, max_score, display_order")
          .in("subject_id", subjectIds)
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("grade_entries")
          .select("column_id, score, feedback, graded_at")
          .eq("student_id", context.id),
      ])
  )





  const subjects = subjectsResult.data ?? []
  const allAssignments = assignmentsResult.data ?? []

  // The student session's row policies already enforce course/enrollment access.
  const sectionAssignments = (allAssignments ?? []).filter((assignment: any) =>
    assignment.type !== "Material" && assignment.type !== "Syllabus"
  )

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
