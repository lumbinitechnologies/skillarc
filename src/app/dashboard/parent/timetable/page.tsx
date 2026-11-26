import { getParentContext } from "@/lib/parent-context"
import ParentTimetableClient from "./timetable-client"

export const dynamic = "force-dynamic"

export default async function ParentTimetablePage() {
  const { profile, children: students, admin } = await getParentContext()

  const sectionIds = [...new Set(students.map((c) => c.sectionId).filter(Boolean))] as string[]
  const institutionIds = [...new Set(students.map((c) => c.institutionId).filter(Boolean))] as string[]

  const slotsData = sectionIds.length && institutionIds.length
    ? await admin
        .from("timetable_slots")
        .select(`
          section_id, day, period,
          subjects:subject_id(id, name, code),
          faculty:faculty_id(id, name)
        `)
        .in("section_id", sectionIds)
        .in("institution_id", institutionIds)
    : { data: [] }

  const rawSlots = (slotsData.data ?? [])

  const childTimetables = students.map((child) => {
    const slots = rawSlots
      .filter((s) => s.section_id === child.sectionId)
      .map((s) => {
        const sub = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects
        const fac = Array.isArray(s.faculty) ? s.faculty[0] : s.faculty
        return {
          day: s.day as string,
          period: s.period as number,
          subjectName: sub?.name ?? "—",
          subjectCode: sub?.code ?? "—",
          facultyName: fac?.name ?? "—",
        }
      })

    return { ...child, slots }
  })

  return (
    <ParentTimetableClient
      parentName={profile.name ?? "Parent"}
      students={childTimetables}
    />
  )
}
