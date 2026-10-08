import { getProgramHeadContext } from "@/lib/program-head-context"
import PHSectionsClient from "./sections-client"

export const dynamic = "force-dynamic"

export default async function PHSectionsPage() {
  const { admin, institutionId, profile } = await getProgramHeadContext()

  const sectionsRes = await admin
    .from("sections")
    .select(`
      id, name, semester,
      programs:program_id(id, name),
      advisor:faculty_advisor_id(id, name, email)
    `)
    .eq("institution_id", institutionId)
    .order("name")

  const rawSections = (sectionsRes.data ?? []) as any[]
  const sectionIds = rawSections.map((s) => s.id)

  const studentCountRes = sectionIds.length
    ? await admin.from("students").select("section_id").in("section_id", sectionIds)
    : { data: [] }

  const studentRows = (studentCountRes.data ?? []) as any[]
  const countMap: Record<string, number> = {}
  for (const r of studentRows) countMap[r.section_id] = (countMap[r.section_id] ?? 0) + 1

  const sections = rawSections.map((s) => {
    const prog = Array.isArray(s.programs) ? s.programs[0] : s.programs
    const advisor = Array.isArray(s.advisor) ? s.advisor[0] : s.advisor
    return {
      id: s.id,
      name: s.name,
      semester: s.semester,
      programName: prog?.name ?? "—",
      advisorName: advisor?.name ?? "Not assigned",
      advisorEmail: advisor?.email ?? "",
      studentCount: countMap[s.id] ?? 0,
    }
  })

  return (
    <PHSectionsClient
      phName={profile.name ?? "Program Head"}
      sections={sections}
    />
  )
}
