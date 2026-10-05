import { getHodContext } from "@/lib/hod-context"
import { getCachedSections } from "@/lib/institution-cache"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import HodSectionsClient from "./sections-client"

export const dynamic = "force-dynamic"

export default async function HodSectionsPage() {
  const { admin, institutionId, profile } = await getHodContext()

  // Use cached sections (60s TTL) — they rarely change
  const rawSections = await getCachedSections(institutionId)

  // Student counts are real-time (change constantly) — not cached
  const sectionIds = rawSections.map((s: any) => s.id)
  const studentCountRes = sectionIds.length
    ? await admin.from("students").select("section_id").in("section_id", sectionIds)
    : { data: [] }

  const studentRows = (studentCountRes.data ?? []) as any[]
  const countMap: Record<string, number> = {}
  for (const r of studentRows) {
    countMap[r.section_id] = (countMap[r.section_id] ?? 0) + 1
  }

  const sections = rawSections.map((s: any) => {
    const program = Array.isArray(s.programs) ? s.programs[0] : s.programs
    const advisor = Array.isArray(s.advisor) ? s.advisor[0] : s.advisor
    return {
      id: s.id,
      name: s.name,
      semester: s.semester,
      programName: program?.name ?? "—",
      advisorName: advisor?.name ?? "Not assigned",
      advisorEmail: advisor?.email ?? "",
      studentCount: countMap[s.id] ?? 0,
    }
  })

  return (
    <HodSectionsClient
      hodName={profile.name ?? "HOD"}
      sections={sections}
    />
  )
}

