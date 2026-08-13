import { redirect } from "next/navigation"
import { BookOpen, GraduationCap, UserRound, ArrowRight } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { ROLES } from "@/constants/roles"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function StudentSubjectsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const adminClient = createSupabaseAdminClient()

  const { data: userProfile } = await adminClient
    .from("users")
    .select("id, role, institution_id")
    .eq("id", user.id)
    .single()

  if (!userProfile || userProfile.role !== ROLES.STUDENT) redirect("/dashboard")

  const { data: studentData } = await adminClient
    .from("students")
    .select("id, section_id, program_id, semester")
    .eq("id", user.id)
    .single()

  const profile = { ...userProfile, ...studentData }

  const { data: timetableRows = [] } = profile.section_id
    ? await adminClient
        .from("timetable_slots")
        .select("subject_id, faculty_id")
        .eq("institution_id", profile.institution_id)
        .eq("section_id", profile.section_id)
        .order("subject_id")
    : { data: [] }

  let subjectIds = Array.from(new Set((timetableRows as Array<any>).map((slot) => slot.subject_id).filter(Boolean))) as string[]

  if (subjectIds.length === 0 && (profile.program_id || profile.institution_id)) {
    let subQuery = adminClient
      .from("subjects")
      .select("id")
    if (profile.program_id) {
      subQuery = subQuery.eq("program_id", profile.program_id)
    } else if (profile.institution_id) {
      subQuery = subQuery.eq("institution_id", profile.institution_id)
    }
    if (profile.semester) {
      subQuery = subQuery.eq("semester", profile.semester)
    }
    const { data: programSubjects } = await subQuery
    if (programSubjects?.length) {
      subjectIds = programSubjects.map((s: any) => s.id)
    }
  }

  const { data: subjectRows = [] } = subjectIds.length
    ? await adminClient.from("subjects").select("id, name, code, subject_type").in("id", subjectIds).order("name")
    : { data: [] }

  const facultyIds = Array.from(new Set((timetableRows as Array<any>).map((slot) => slot.faculty_id).filter(Boolean))) as string[]
  const facultyMap = new Map<string, string>()
  if (facultyIds.length) {
    const { data: facultyRows = [] } = await adminClient.from("users").select("id, name").in("id", facultyIds)
    ;(facultyRows as Array<any>).forEach((faculty) => facultyMap.set(faculty.id, faculty.name))
  }

  const subjects = (subjectRows as Array<any>).map((subject) => ({
    id: subject.id,
    name: subject.name,
    code: subject.code,
    subjectType: subject.subject_type || "THEORY",
    facultyName: facultyMap.get((timetableRows as Array<any>).find((slot: any) => slot.subject_id === subject.id)?.faculty_id) ?? "Faculty pending",
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header section identical to Attendance Center design */}
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#6C63FF]">Academic Syllabus</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans']">Your Enrolled Subjects</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            View courses linked to your section, syllabus parameters, and instructor profiles.
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 self-start md:self-auto">
          <p className="text-sm text-indigo-700">Current load</p>
          <p className="text-lg font-semibold text-indigo-900 font-['Space_Grotesk']">
            {subjects.length} active classes
          </p>
        </div>
      </div>

      {/* Main Subjects Display list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.length === 0 ? (
          <div className="col-span-full py-20 px-6 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#6C63FF] mx-auto mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 mb-1">No subjects assigned</p>
            <p className="text-xs text-slate-400">There are no subjects linked to your section timetable yet.</p>
          </div>
        ) : (
          subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/dashboard/student/subjects/${subject.id}`}
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
                    <UserRound className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{subject.facultyName}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 justify-between">
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">Section Syllabus</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#6C63FF] group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
