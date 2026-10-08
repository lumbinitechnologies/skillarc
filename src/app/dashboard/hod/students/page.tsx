import { getHodContext } from "@/lib/hod-context"
import HodStudentsClient from "./students-client"

export const dynamic = "force-dynamic"

export default async function HodStudentsPage() {
  const { admin, institutionId, profile } = await getHodContext()

  const [studentsRes, sectionsRes] = await Promise.all([
    admin
      .from("users")
      .select("id, name, email, phone, created_at")
      .eq("institution_id", institutionId)
      .eq("role", "STUDENT")
      .order("name"),
    admin
      .from("sections")
      .select("id, name, semester, programs:program_id(id, name)")
      .eq("institution_id", institutionId)
      .order("name"),
  ])

  const users = (studentsRes.data ?? []) as any[]
  const sections = (sectionsRes.data ?? []) as any[]

  // Fetch student records to get section mapping
  const studentIds = users.map((u) => u.id)
  const studentRecordsRes = studentIds.length
    ? await admin
        .from("students")
        .select("id, section_id, registration_number, semester, admission_year")
        .in("id", studentIds)
    : { data: [] }

  const studentRecords = (studentRecordsRes.data ?? []) as any[]

  const students = users.map((u) => {
    const rec = studentRecords.find((r) => r.id === u.id)
    const section = sections.find((s) => s.id === rec?.section_id)
    const program = Array.isArray(section?.programs) ? section.programs[0] : section?.programs
    return {
      id: u.id,
      name: u.name ?? "—",
      email: u.email ?? "—",
      phone: u.phone ?? "",
      registrationNumber: rec?.registration_number ?? "—",
      semester: section?.semester ?? rec?.semester ?? null,
      admissionYear: rec?.admission_year ?? null,
      sectionName: section?.name ?? "—",
      programName: program?.name ?? "—",
      joinedAt: u.created_at,
    }
  })

  const sectionSummaries = sections.map((s) => {
    const prog = Array.isArray(s.programs) ? s.programs[0] : s.programs
    const count = studentRecords.filter((r) => r.section_id === s.id).length
    return { id: s.id, name: s.name, semester: s.semester, programName: prog?.name ?? "—", count }
  })

  return (
    <HodStudentsClient
      hodName={profile.name ?? "HOD"}
      students={students}
      sectionSummaries={sectionSummaries}
      totalCount={students.length}
    />
  )
}
