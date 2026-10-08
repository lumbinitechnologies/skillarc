import { getParentContext } from "@/lib/parent-context"
import ParentGradesClient from "./grades-client"

export const dynamic = "force-dynamic"

export default async function ParentGradesPage() {
  const { profile, children, admin } = await getParentContext()

  const studentIds = children.map((c) => c.id)

  const submissionsRes = studentIds.length
    ? await admin
        .from("submissions")
        .select(`
          student_id, grade, status, feedback, submitted_at,
          assignments:assignment_id(
            id, title, max_marks, due_date, subject_id,
            subjects:subject_id(id, name, code)
          )
        `)
        .in("student_id", studentIds)
        .not("grade", "is", null)
    : { data: [] }

  const raw = (submissionsRes.data ?? []) as any[]

  const childGrades = children.map((child) => {
    const records = raw
      .filter((s) => s.student_id === child.id)
      .map((s) => {
        const assignment = Array.isArray(s.assignments) ? s.assignments[0] : s.assignments
        const subject = Array.isArray(assignment?.subjects) ? assignment.subjects[0] : assignment?.subjects
        return {
          assignmentTitle: assignment?.title ?? "—",
          subjectName: subject?.name ?? "—",
          subjectCode: subject?.code ?? "—",
          maxMarks: assignment?.max_marks ?? null,
          grade: s.grade,
          feedback: s.feedback ?? null,
          submittedAt: s.submitted_at,
          percentage: assignment?.max_marks && s.grade !== null
            ? Math.round((Number(s.grade) / Number(assignment.max_marks)) * 100)
            : null,
        }
      })

    // Group by subject
    const bySubject: Record<string, { name: string; code: string; grades: typeof records }> = {}
    for (const r of records) {
      if (!bySubject[r.subjectName]) bySubject[r.subjectName] = { name: r.subjectName, code: r.subjectCode, grades: [] }
      bySubject[r.subjectName].grades.push(r)
    }

    const subjectSummaries = Object.values(bySubject).map((s) => {
      const withPct = s.grades.filter((g) => g.percentage !== null)
      const avg = withPct.length > 0 ? Math.round(withPct.reduce((acc, g) => acc + (g.percentage ?? 0), 0) / withPct.length) : null
      return { ...s, avg }
    })

    const allPcts = records.filter((r) => r.percentage !== null).map((r) => r.percentage ?? 0)
    const cgpa = allPcts.length > 0 ? (allPcts.reduce((a, b) => a + b, 0) / allPcts.length).toFixed(1) : null

    return { ...child, records, subjectSummaries, cgpa }
  })

  return (
    <ParentGradesClient
      parentName={profile.name ?? "Parent"}
      children={childGrades}
    />
  )
}
