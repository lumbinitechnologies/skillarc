import { getParentContext } from "@/lib/parent-context"
import ParentAssignmentsClient from "./assignments-client"

export const dynamic = "force-dynamic"

export default async function ParentAssignmentsPage() {
  const { profile, children, admin } = await getParentContext()

  const studentIds = children.map((c) => c.id)
  const sectionIds = [...new Set(children.map((c) => c.sectionId).filter(Boolean))] as string[]

  const [assignmentsRes, submissionsRes] = await Promise.all([
    sectionIds.length
      ? admin
          .from("assignments")
          .select(`
            id, title, description, due_date, max_score, subject_id, section_ids,
            subjects:subject_id(id, name, code)
          `)
          .overlaps("section_ids", sectionIds)
          .order("due_date", { ascending: false })
      : Promise.resolve({ data: [] }),

    studentIds.length
      ? admin
          .from("submissions")
          .select("assignment_id, student_id, status, grade, feedback, submitted_at")
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] }),
  ])

  const assignments = (assignmentsRes.data ?? []) as any[]
  const submissions = (submissionsRes.data ?? []) as any[]

  // Build per-child assignment views
  const childAssignments = children.map((child) => {
    const childSectionAssignments = assignments.filter((a) =>
      Array.isArray(a.section_ids)
        ? child.sectionId && a.section_ids.includes(child.sectionId)
        : false
    )
    const childSubmissions = submissions.filter((s) => s.student_id === child.id)

    const enriched = childSectionAssignments.map((a) => {
      const sub = Array.isArray(a.subjects) ? a.subjects[0] : a.subjects
      const submission = childSubmissions.find((s) => s.assignment_id === a.id)
      return {
        id: a.id,
        title: a.title,
        description: a.description ?? "",
        dueDate: a.due_date,
        maxMarks: a.max_score ?? null,
        subjectName: sub?.name ?? "—",
        subjectCode: sub?.code ?? "—",
        submitted: !!submission,
        submittedAt: submission?.submitted_at ?? null,
        status: submission?.status ?? "NOT_SUBMITTED",
        grade: submission?.grade ?? null,
        feedback: submission?.feedback ?? null,
        overdue: !submission && a.due_date && new Date(a.due_date) < new Date(),
      }
    })

    const submitted = enriched.filter((a) => a.submitted).length
    const missing = enriched.filter((a) => !a.submitted && a.overdue).length
    const pending = enriched.filter((a) => !a.submitted && !a.overdue).length

    return { ...child, assignments: enriched, stats: { total: enriched.length, submitted, missing, pending } }
  })

  return (
    <ParentAssignmentsClient
      parentName={profile.name ?? "Parent"}
      children={childAssignments}
    />
  )
}
