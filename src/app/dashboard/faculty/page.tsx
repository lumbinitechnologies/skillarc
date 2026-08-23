import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import FacultyDashboardClient from "./faculty-dashboard-client"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function FacultyDashboardPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  if (![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(context.role as any)) {
    redirect("/auth/login")
  }

  const supabase = await createSupabaseServerClient()
  const profile = context

  const [{ data: institution }, { data: assignedSubjects }, { data: timetableRows }, { count: studentCount }] = await Promise.all([
    supabase.from("institutions").select("id, name").eq("id", profile?.institution_id).maybeSingle(),
    supabase.from("faculty_subjects").select("subject_id").eq("faculty_id", context.id).limit(6),
    supabase.from("timetable_slots").select("day, period, section_id, subjects!inner(id, name, code), sections!inner(name)").eq("faculty_id", context.id).limit(6),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("institution_id", profile?.institution_id).eq("role", ROLES.STUDENT),
  ])

  const subjectIds = (assignedSubjects ?? []).map((r: any) => r.subject_id)
  const { data: subjects } = subjectIds.length ? await supabase.from("subjects").select("id, name, code").in("id", subjectIds).limit(6) : { data: [] }

  const timetableSlots = (timetableRows ?? []).map((slot: any) => ({
    day: slot.day,
    period: slot.period,
    section_id: slot.section_id,
    subjects: Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects,
    sections: Array.isArray(slot.sections) ? slot.sections[0] : slot.sections,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <FacultyDashboardClient
        faculty={{
          name: profile?.name ?? "",
          email: context.email ?? "",
          institution: institution?.name ?? "",
        }}
        subjects={subjects ?? []}
        studentCount={studentCount ?? 0}
        timetableSlots={timetableSlots ?? []}
      />
    </div>
  )
}
