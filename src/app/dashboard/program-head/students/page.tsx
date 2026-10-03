import { getProgramHeadContext } from "@/lib/program-head-context"
import PHStudentsClient from "./students-client"

export const dynamic = "force-dynamic"

export default async function PHStudentsPage() {
  const { admin, institutionId, profile } = await getProgramHeadContext()

  const [usersRes, studentRecordsRes, sectionsRes] = await Promise.all([
    admin
      .from("users")
      .select("id, name, email, phone, created_at")
      .eq("institution_id", institutionId)
      .eq("role", "STUDENT")
      .order("name"),
    admin
      .from("students")
      .select("id, section_id, registration_number, semester, admission_year, program_id")
      .eq("institution_id", institutionId),
    admin
      .from("sections")
      .select("id, name, semester, programs:program_id(id, name)")
      .eq("institution_id", institutionId),
  ])

  const users = (usersRes.data ?? []) as any[]
  const studentRecords = (studentRecordsRes.data ?? []) as any[]
  const sections = (sectionsRes.data ?? []) as any[]

  const students = users.map((u) => {
    const rec = studentRecords.find((r) => r.id === u.id)
    const sec = sections.find((s) => s.id === rec?.section_id)
    const prog = Array.isArray(sec?.programs) ? sec.programs[0] : sec?.programs
    return {
      id: u.id,
      name: u.name ?? "—",
      email: u.email ?? "—",
      phone: u.phone ?? "",
      registrationNumber: rec?.registration_number ?? "—",
      semester: sec?.semester ?? rec?.semester ?? null,
      admissionYear: rec?.admission_year ?? null,
      sectionName: sec?.name ?? "—",
      programName: prog?.name ?? "—",
      joinedAt: u.created_at,
    }
  })

  return (
    <PHStudentsClient
      phName={profile.name ?? "Program Head"}
      students={students}
      totalCount={students.length}
    />
  )
}
