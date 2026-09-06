import { redirect } from "next/navigation"
import Link from "next/link"
import { BookOpen, Mail, School, UserCircle2, Calendar, UserCheck, Settings, ArrowRight } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"

export const dynamic = "force-dynamic"

function getInitials(name: string) {
  return (name || "F")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default async function FacultyProfilePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, institution_id, profile_image_url, created_at")
    .eq("id", user.id)
    .single()

  if (!profile || ![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(profile.role)) redirect("/dashboard")

  const { data: institution } = await supabase
    .from("institutions")
    .select("name")
    .eq("id", profile.institution_id)
    .single()

  const { data: assignmentRows } = await supabase
    .from("faculty_subjects")
    .select("subject_id")
    .eq("faculty_id", user.id)

  const assignedSubjectIds = new Set(
    ((assignmentRows ?? []).map((row: any) => row.subject_id).filter(Boolean) as string[]),
  )

  const { data: subjectsData = [] } = await supabase
    .from("subjects")
    .select("id, name, code, faculty_id")
    .eq("institution_id", profile?.institution_id)
    .order("name")

  const subjects = Array.isArray(subjectsData)
    ? subjectsData.filter((subject: any) => subject.faculty_id === user.id || assignedSubjectIds.has(subject.id))
    : []

  const { data: timetableRows = [] } = await supabase
    .from("timetable_slots")
    .select("section_id, sections!inner(name)")
    .eq("institution_id", profile.institution_id)
    .eq("faculty_id", user.id)

  const sectionNames = Array.from(
    new Set(
      (timetableRows as Array<any>)
        .map((slot) => slot.sections?.name)
        .filter(Boolean) as string[],
    ),
  )

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Top Banner Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            Faculty Overview
          </div>
          <h1 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {profile.name ?? "Faculty Member"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View your academic profile, assigned teaching courses, and active section schedules.
          </p>
        </div>

        <Link
          href="/dashboard/account/profile"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#584fe6] self-start sm:self-auto"
        >
          <Settings size={15} />
          Edit Profile & Avatar
        </Link>
      </div>

      {/* Main Identity Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] p-6 text-white shadow-lg md:col-span-2">
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white/20 bg-white/10 shadow-inner">
              {profile.profile_image_url ? (
                <img
                  src={profile.profile_image_url}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-['Space_Grotesk'] text-3xl font-bold text-white">
                  {getInitials(profile.name)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {profile.role.replace(/_/g, " ")}
                </span>
              </div>
              <h2 className="mt-1.5 truncate font-['Space_Grotesk'] text-2xl font-bold text-white">
                {profile.name ?? "Faculty Member"}
              </h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-white/80">
                <Mail size={15} />
                <span className="truncate">{profile.email ?? "Email unavailable"}</span>
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-4 border-t border-white/15 pt-4 text-xs text-white/90">
            <div className="flex items-center gap-1.5">
              <School size={14} className="text-white/70" />
              <span>{institution?.name ?? "Academic Institution"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-white/70" />
              <span>Member since {new Date(profile.created_at).getFullYear()}</span>
            </div>
          </div>
        </div>

        {/* Quick Edit Account Box */}
        <div className="flex flex-col justify-between rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div>
            <div className="flex items-center gap-2 font-['Space_Grotesk'] text-base font-bold text-slate-900">
              <UserCheck size={18} className="text-[#6C63FF]" />
              Account Settings
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Update your photo, biography, pronouns, phone number, and social links at any time in the universal Account Center.
            </p>
          </div>

          <Link
            href="/dashboard/account/profile"
            className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            <span>Manage Account</span>
            <ArrowRight size={14} className="text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Teaching Metrics */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-['Space_Grotesk'] text-base font-bold text-slate-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-[#6C63FF]">
                <BookOpen size={18} />
              </div>
              Assigned Courses
            </div>
            <span className="font-['Space_Grotesk'] text-3xl font-extrabold text-slate-900">
              {subjects.length}
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {subjects.length > 0
              ? "Active teaching courses allocated to your teaching schedule."
              : "No courses currently assigned to your profile."}
          </p>

          {subjects.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {subjects.slice(0, 5).map((s: any) => (
                <span
                  key={s.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {s.name} {s.code ? `(${s.code})` : ""}
                </span>
              ))}
              {subjects.length > 5 && (
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                  +{subjects.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-['Space_Grotesk'] text-base font-bold text-slate-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserCircle2 size={18} />
              </div>
              Scheduled Sections
            </div>
            <span className="font-['Space_Grotesk'] text-3xl font-extrabold text-slate-900">
              {sectionNames.length}
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {sectionNames.length > 0
              ? `Scheduled classes: ${sectionNames.join(", ")}`
              : "No section allocations in current active timetable."}
          </p>

          {sectionNames.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {sectionNames.map((name) => (
                <span
                  key={name}
                  className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                >
                  Section {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
