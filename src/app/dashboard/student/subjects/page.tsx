import { redirect } from "next/navigation"
import { BookOpen, GraduationCap, UserRound, ArrowRight } from "lucide-react"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { ROLES } from "@/constants/roles"
import Link from "next/link"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"

export const dynamic = "force-dynamic"

export default async function StudentSubjectsPage() {
  const tPageStart = performance.now()
  const tContextStart = performance.now()
  const context = await getCurrentDashboardSession()
  const contextMs = performance.now() - tContextStart

  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.STUDENT) redirect("/dashboard")

  const adminClient = createSupabaseAdminClient()

  const tBatchStart = performance.now()
  const [studentRes, timetableRes, subjectsRes] = await Promise.all([
    adminClient
      .from("students")
      .select("id, section_id, program_id, semester")
      .eq("id", context.id)
      .maybeSingle(),
    context.institution_id
      ? adminClient
          .from("timetable_slots")
          .select("subject_id, faculty_id, section_id, subjects(id, name, code, subject_type), users!faculty_id(id, name)")
          .eq("institution_id", context.institution_id)
      : Promise.resolve({ data: [] }),
    context.institution_id
      ? adminClient
          .from("subjects")
          .select("id, name, code, subject_type, program_id, semester")
          .eq("institution_id", context.institution_id)
      : Promise.resolve({ data: [] }),
  ])
  const batchMs = performance.now() - tBatchStart

  const studentData = studentRes.data
  const allSlots = (timetableRes.data ?? []) as any[]
  const allSubjects = (subjectsRes.data ?? []) as any[]

  // Filter slots for student's section
  const sectionSlots = studentData?.section_id
    ? allSlots.filter((slot: any) => slot.section_id === studentData.section_id)
    : []

  const subjectMap = new Map<string, { id: string; name: string; code: string; subjectType: string; facultyName: string }>()

  sectionSlots.forEach((slot: any) => {
    const sub = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects
    const fac = Array.isArray(slot.users) ? slot.users[0] : slot.users
    if (sub?.id && !subjectMap.has(sub.id)) {
      subjectMap.set(sub.id, {
        id: sub.id,
        name: sub.name,
        code: sub.code,
        subjectType: sub.subject_type || "THEORY",
        facultyName: fac?.name ?? "Faculty pending",
      })
    }
  })

  // Fallback: If section has no timetable slots yet, find subjects for student's program/semester
  if (subjectMap.size === 0 && studentData?.program_id) {
    const progSubs = allSubjects.filter((s: any) => {
      const matchProg = s.program_id === studentData.program_id
      const matchSem = !studentData.semester || !s.semester || s.semester === studentData.semester
      return matchProg && matchSem
    })
    progSubs.forEach((sub: any) => {
      subjectMap.set(sub.id, {
        id: sub.id,
        name: sub.name,
        code: sub.code,
        subjectType: sub.subject_type || "THEORY",
        facultyName: "Faculty pending",
      })
    })
  }

  const subjects = Array.from(subjectMap.values())
  const totalMs = performance.now() - tPageStart

  console.info(
    `[DashboardStudentSubjects] contextMs=${contextMs.toFixed(1)} batchMs=${batchMs.toFixed(1)} totalMs=${totalMs.toFixed(1)} studentId=${context.id}`
  )

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
