import { getHodContext } from "@/lib/hod-context"
import HodFacultyClient from "./faculty-client"

export const dynamic = "force-dynamic"

export default async function HodFacultyPage() {
  const { admin, institutionId, profile } = await getHodContext()

  const facultyRes = await admin
    .from("users")
    .select("id, name, email, phone, created_at")
    .eq("institution_id", institutionId)
    .in("role", ["FACULTY", "HOD", "PROGRAM_HEAD"])
    .order("name")

  const faculty = (facultyRes.data ?? []) as any[]
  const facultyIds = faculty.map((f) => f.id)

  const [subjectsRes, usersRoleRes] = await Promise.all([
    facultyIds.length
      ? admin
          .from("faculty_subjects")
          .select("faculty_id, subject_id, subjects:subject_id(id, name, code), sections:section_id(id, name)")
          .in("faculty_id", facultyIds)
      : Promise.resolve({ data: [] }),
    facultyIds.length
      ? admin
          .from("users")
          .select("id, role")
          .in("id", facultyIds)
      : Promise.resolve({ data: [] }),
  ])

  const fsRows = (subjectsRes.data ?? []) as any[]
  const roleMap = Object.fromEntries(((usersRoleRes.data ?? []) as any[]).map((u) => [u.id, u.role]))

  const enriched = faculty.map((f) => {
    const assignments = fsRows.filter((r) => r.faculty_id === f.id).map((r) => {
      const sub = Array.isArray(r.subjects) ? r.subjects[0] : r.subjects
      const sec = Array.isArray(r.sections) ? r.sections[0] : r.sections
      return { subjectName: sub?.name ?? "—", subjectCode: sub?.code ?? "—", sectionName: sec?.name ?? "—" }
    })
    return {
      id: f.id,
      name: f.name ?? "—",
      email: f.email ?? "—",
      phone: f.phone ?? "",
      role: roleMap[f.id] ?? "FACULTY",
      joinedAt: f.created_at,
      subjectCount: assignments.length,
      assignments,
    }
  })

  return (
    <HodFacultyClient
      hodName={profile.name ?? "HOD"}
      faculty={enriched}
    />
  )
}
