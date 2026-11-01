import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ParentsClientPage } from "./parents-client"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function ParentsPage() {
  const context = await getCurrentUserContext()

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.INSTITUTION_ADMIN) redirect("/dashboard")

  const institutionId = context.institution_id
  const supabase = await createSupabaseServerClient()

  const [parentsRes, relationsRes, studentsRes, sectionsRes, programsRes, departmentsRes] = await Promise.all([
    supabase.from("users").select("*").eq("institution_id", institutionId).eq("role", ROLES.PARENT).order("name"),
    supabase.from("parent_student_relations").select("parent_id, student_id"),
    supabase.from("users").select("id, name, section_id, department_id").eq("institution_id", institutionId).eq("role", ROLES.STUDENT),
    supabase.from("sections").select("id, name, program_id").eq("institution_id", institutionId).order("name"),
    supabase.from("programs").select("id, name, department_id").eq("institution_id", institutionId).order("name"),
    supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name"),
  ])

  const parents = parentsRes.data ?? []
  const relations = relationsRes.data ?? []
  const students = studentsRes.data ?? []
  const sections = sectionsRes.data ?? []

  // Enrich parents with linked student info (section, department)
  const studentMap = new Map(students.map(s => [s.id, s]))
  const enrichedParents = parents.map(p => {
    const linkedStudentIds = relations.filter(r => r.parent_id === p.id).map(r => r.student_id)
    const linkedStudents = linkedStudentIds.map(sid => studentMap.get(sid)).filter(Boolean) as any[]
    const sectionIds = [...new Set(linkedStudents.map(s => s.section_id).filter(Boolean))]
    const deptIds = [...new Set(linkedStudents.map(s => s.department_id).filter(Boolean))]
    const programIds = [...new Set(
      sectionIds.map(sid => sections.find(sec => sec.id === sid)?.program_id).filter(Boolean)
    )]
    return {
      ...p,
      _sectionIds: sectionIds,
      _departmentIds: deptIds,
      _programIds: programIds,
      _childCount: linkedStudents.length,
    }
  })

  return (
    <ParentsClientPage
      initialParents={enrichedParents}
      institutionId={institutionId!}
      departments={departmentsRes.data ?? []}
      programs={programsRes.data ?? []}
      sections={sections}
    />
  )
}
