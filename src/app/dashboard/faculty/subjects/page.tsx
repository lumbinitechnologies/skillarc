import { redirect } from "next/navigation"
import { BookOpen, GraduationCap, Layers, ArrowRight } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function FacultySubjectsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, institution_id, name")
    .eq("id", user.id)
    .single()

  if (!profile || ![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(profile.role)) redirect("/dashboard")

  const { data: assignmentRows } = await supabase
    .from("faculty_subjects")
    .select("subject_id")
    .eq("faculty_id", user.id)
    .eq("institution_id", profile?.institution_id)

  const subjectIds = (assignmentRows ?? []).map((row: any) => row.subject_id).filter(Boolean)

  const { data: subjectRowsData } = subjectIds.length
    ? await supabase
        .from("subjects")
        .select("id, name, code")
        .in("id", subjectIds)
        .eq("institution_id", profile?.institution_id)
        .order("name")
    : { data: [] }

  const subjectRows = Array.isArray(subjectRowsData) ? subjectRowsData : []

  const { data: timetableRows } = subjectIds.length
    ? await supabase
        .from("timetable_slots")
        .select("subject_id, section_id, semester")
        .eq("faculty_id", user.id)
        .in("subject_id", subjectIds)
        .order("semester")
    : { data: [] }

  const sectionIds = Array.from(
    new Set(
      (timetableRows ?? [])
        .map((row: any) => row.section_id)
        .filter(Boolean) as string[],
    ),
  )

  const { data: sectionsData } = sectionIds.length
    ? await supabase.from("sections").select("id, name").in("id", sectionIds)
    : { data: [] }

  const sectionMap = new Map((Array.isArray(sectionsData) ? sectionsData : []).map((section: any) => [section.id, section.name]))

  const subjectMetaMap = new Map<string, { sectionNames: string[]; semester?: number }>()
  for (const row of timetableRows ?? []) {
    const subjectId = row.subject_id
    const sectionId = row.section_id
    if (!subjectId) continue

    const existing = subjectMetaMap.get(subjectId) ?? { sectionNames: [] }
    if (sectionId) {
      const sectionName = sectionMap.get(sectionId)
      if (sectionName && !existing.sectionNames.includes(sectionName)) {
        existing.sectionNames.push(sectionName)
      }
    }

    if (row.semester != null) {
      existing.semester = row.semester
    }

    subjectMetaMap.set(subjectId, existing)
  }

  const subjects = (subjectRows as Array<any>).map((subject) => {
    const meta = subjectMetaMap.get(subject.id)

    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      sectionName: meta && meta.sectionNames.length ? `Sections: ${meta.sectionNames.join(", ")}` : "No sections scheduled",
      programName: meta?.semester != null ? `Semester ${meta.semester}` : "Semester not assigned",
    }
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header section identical to Attendance Center design */}
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#6C63FF]">Academic Portfolio</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans']">Your Assigned Subjects</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Overview of the courses you teach and the sections assigned to your schedule.
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 self-start md:self-auto">
          <p className="text-sm text-indigo-700">Teaching load</p>
          <p className="text-lg font-semibold text-indigo-900 font-['Space_Grotesk']">
            {subjects.length} active subject{subjects.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Main Subjects Display list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <Link
            key={subject.id}
            href={`/dashboard/faculty/subjects/${subject.id}`}
            className="group block relative bg-white rounded-3xl border border-slate-100 shadow-[0_2px_8px_rgba(15,23,42,0.02)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(108,99,255,0.06)] hover:border-indigo-100"
          >
            {/* Type tag line */}
            <div className="h-[4px] w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]" />
            
            <div className="p-6 flex flex-col justify-between h-full min-h-[170px]">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[#6C63FF]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold font-['Space_Grotesk'] text-[#6C63FF] bg-[#6C63FF]/5 border border-[#6C63FF]/15 px-2 py-0.5 rounded-md">
                    {subject.code}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 tracking-tight group-hover:text-[#6C63FF] transition-colors duration-200">
                  {subject.name}
                </h3>
              </div>

              <div className="mt-6 space-y-2 border-t border-slate-50 pt-4">
                <div className="flex items-center gap-2.5 text-xs text-slate-500">
                  <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{subject.sectionName}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-500 justify-between">
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate font-['Space_Grotesk'] font-medium">{subject.programName}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#6C63FF] group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="py-20 px-6 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#6C63FF] mx-auto mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-900 mb-1">No subjects assigned</p>
          <p className="text-xs text-slate-400">There are no subjects linked to your teaching roster yet.</p>
        </div>
      )}
    </div>
  )
}
