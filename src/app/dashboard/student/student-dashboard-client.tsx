"use client"

import Link from "next/link"
import { Activity, AlertCircle, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Clock, GraduationCap } from "lucide-react"

interface Subject {
  id: string
  name: string
  code: string
  facultyName: string
}

interface ScheduleItem {
  day: string
  period: number
  subjectName: string
  subjectCode: string
  facultyName: string
}

interface AttendanceSummary {
  rate: number
  total: number
  present: number
  absent: number
  late: number
}

export default function StudentPage({
  student,
  subjects,
  schedule,
  upcomingSchedule,
  attendance,
}: {
  student: {
    name: string
    email: string
    institution: string
    sectionName: string
    programName: string
    semester: number | null
    registrationNumber: string
    phone: string
    admissionYear: number | null
  }
  subjects: Subject[]
  schedule: ScheduleItem[]
  upcomingSchedule: ScheduleItem[]
  attendance: AttendanceSummary
}) {
  const stats = [
    {
      label: "Attendance rate",
      value: `${attendance.rate}%`,
      sublabel: `${attendance.present}/${attendance.total} marked`,
      accent: "bg-emerald-100 text-emerald-700",
      icon: <Activity size={18} className="text-emerald-700" />,
    },
    {
      label: "Courses enrolled",
      value: subjects.length,
      sublabel: "Live subject list",
      accent: "bg-violet-100 text-violet-700",
      icon: <BookOpen size={18} className="text-violet-700" />,
    },
    {
      label: "Today’s classes",
      value: schedule.length,
      sublabel: "From your section timetable",
      accent: "bg-sky-100 text-sky-700",
      icon: <CalendarDays size={18} className="text-sky-700" />,
    },
    {
      label: "Section",
      value: student.sectionName || "—",
      sublabel: student.programName || "Program pending",
      accent: "bg-amber-100 text-amber-700",
      icon: <GraduationCap size={18} className="text-amber-700" />,
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8 space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Soft radial aura */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-radial-gradient from-indigo-50/50 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg shadow-indigo-100/50 flex-shrink-0">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#6C63FF]">Student dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans']">Welcome back, {student.name}</h1>
              <p className="mt-2 text-sm text-slate-500">{student.institution} · {student.programName} · Semester {student.semester ?? "—"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/student/todo" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:border-slate-200 active:scale-95">
              📋 To-Do List
            </Link>
            <Link href="/dashboard/student/report-card" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:border-slate-200 active:scale-95">
              🏆 Report Card
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.015)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(108,99,255,0.06)] hover:border-indigo-100/80">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${item.accent} border border-slate-100/10`}>
              {item.icon}
            </div>
            <p className="mt-4 text-2xl font-bold font-['Space_Grotesk'] text-slate-900 leading-none">{item.value}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">{item.label}</p>
            <p className="mt-1 text-xs text-slate-500 font-semibold">{item.sublabel}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-[0_2px_8px_rgba(15,23,42,0.015)]">
          <div className="flex items-center justify-between gap-4 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6C63FF]">Today’s classes</p>
              <h2 className="text-2xl font-black font-['Plus_Jakarta_Sans'] tracking-tight text-slate-900 mt-1">Your schedule</h2>
            </div>
            <span className="bg-[#6C63FF]/5 border border-[#6C63FF]/15 text-[#6C63FF] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Live</span>
          </div>
          <div className="space-y-4">
            {schedule.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No class sessions are scheduled for today yet.</div>
            ) : (
              schedule.map((item) => (
                <div key={`${item.day}-${item.period}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.subjectCode} · {item.subjectName}</p>
                      <p className="mt-2 text-sm text-slate-500">Faculty: {item.facultyName}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                      <Clock size={14} /> Period {item.period}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-6 bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-[0_2px_8px_rgba(15,23,42,0.015)]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6C63FF]">Attendance</p>
            <h2 className="text-2xl font-black font-['Plus_Jakarta_Sans'] tracking-tight text-slate-900 mt-1">Session summary</h2>
          </div>
          <div className="grid gap-3">
            <div className="rounded-3xl bg-[#00C2A8]/5 border border-[#00C2A8]/15 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#00C2A8]">Present</p>
              <p className="mt-2 text-3xl font-bold font-['Space_Grotesk'] text-[#00C2A8]">{attendance.present}</p>
            </div>
            <div className="rounded-3xl bg-[#F04438]/5 border border-[#F04438]/15 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#F04438]">Absent</p>
              <p className="mt-2 text-3xl font-bold font-['Space_Grotesk'] text-[#F04438]">{attendance.absent}</p>
            </div>
            <div className="rounded-3xl bg-[#FFB020]/5 border border-[#FFB020]/15 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#FFB020]">Late</p>
              <p className="mt-2 text-3xl font-bold font-['Space_Grotesk'] text-[#FFB020]">{attendance.late}</p>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5">
            <p className="text-xs font-bold text-slate-800">Student details</p>
            <div className="mt-4 grid gap-3">
              {[
                ["Email", student.email],
                ["Registration", student.registrationNumber],
                ["Phone", student.phone],
                ["Admission year", student.admissionYear ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-100/60 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.01)]">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="mt-1 text-xs font-bold text-slate-800">{value || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
