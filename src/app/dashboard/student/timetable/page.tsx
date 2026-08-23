import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"
import StudentTimetableClient from "./student-timetable-client"

export const dynamic = "force-dynamic"

export default async function StudentTimetablePage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.STUDENT) redirect("/dashboard")

  const supabase = await createSupabaseServerClient()
  const { data: studentData } = await supabase
    .from("students")
    .select("id, section_id")
    .eq("id", context.id)
    .single()

  const profile = {
    ...context,
    ...studentData,
  }

  const { data: timetableRows = [] } = profile.section_id
    ? await supabase
        .from("timetable_slots")
        .select("day, period, subject_id, faculty_id")
        .eq("institution_id", profile.institution_id)
        .eq("section_id", profile.section_id)
        .order("day")
        .order("period")
    : { data: [] }

  const subjectIds = Array.from(new Set((timetableRows ?? []).map((slot: any) => slot.subject_id).filter(Boolean))) as string[]
  const facultyIds = Array.from(new Set((timetableRows ?? []).map((slot: any) => slot.faculty_id).filter(Boolean))) as string[]
  const [subjectResult, facultyResult, settingsResult] = await Promise.all([
    subjectIds.length
      ? supabase.from("subjects").select("id, name, code").in("id", subjectIds)
      : Promise.resolve({ data: [] }),
    facultyIds.length
      ? supabase.from("users").select("id, name").in("id", facultyIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("institution_timetable_settings")
      .select("period_timings")
      .eq("institution_id", profile.institution_id)
      .maybeSingle(),
  ])

  const subjectObj: Record<string, { name: string; code: string }> = {}
  ;(subjectResult.data ?? []).forEach((subject: any) => {
    subjectObj[subject.id] = { name: subject.name, code: subject.code }
  })

  const facultyObj: Record<string, string> = {}
  ;(facultyResult.data ?? []).forEach((faculty: any) => {
    facultyObj[faculty.id] = faculty.name
  })

  const periodTimings = settingsResult.data?.period_timings as Array<{ id: string; label: string; time: string }> || []

  return (
    <StudentTimetableClient
      timetableRows={timetableRows ?? []}
      subjectMap={subjectObj}
      facultyMap={facultyObj}
      periodTimings={periodTimings}
    />
  )
}
