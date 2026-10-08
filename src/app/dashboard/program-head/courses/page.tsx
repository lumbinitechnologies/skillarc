import { getProgramHeadContext } from "@/lib/program-head-context"
import PHCoursesClient from "./courses-client"

export const dynamic = "force-dynamic"

export default async function PHCoursesPage() {
  const { admin, institutionId, profile } = await getProgramHeadContext()

  const [subjectsRes, facultySubjectsRes] = await Promise.all([
    admin
      .from("subjects")
      .select("id, name, code, program_id, programs:program_id(id, name)")
      .eq("institution_id", institutionId)
      .order("name"),
    admin
      .from("faculty_subjects")
      .select("subject_id, faculty_id, section_id, users:faculty_id(id, name), sections:section_id(id, name)")
      .eq("institution_id", institutionId),
  ])

  const subjects = (subjectsRes.data ?? []) as any[]
  const fsRows = (facultySubjectsRes.data ?? []) as any[]

  const courses = subjects.map((s) => {
    const prog = Array.isArray(s.programs) ? s.programs[0] : s.programs
    const assignments = fsRows.filter((r) => r.subject_id === s.id).map((r) => {
      const fac = Array.isArray(r.users) ? r.users[0] : r.users
      const sec = Array.isArray(r.sections) ? r.sections[0] : r.sections
      return { facultyName: fac?.name ?? "Unassigned", sectionName: sec?.name ?? "—" }
    })
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      programName: prog?.name ?? "—",
      sectionCount: [...new Set(assignments.map((a) => a.sectionName))].length,
      assignments,
    }
  })

  return (
    <PHCoursesClient
      phName={profile.name ?? "Program Head"}
      courses={courses}
    />
  )
}
