"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Activity, BookOpen, CalendarDays, ChevronRight, Clock, GraduationCap, CheckCircle2, AlertTriangle, ArrowUpRight, UserCheck, ShieldCheck } from "lucide-react"
import { motion } from "framer-motion"
import gsap from "gsap"

interface Subject {
  id: string
  name: string
  code: string
  facultyName: string
  attendanceRate?: number
  attendedClasses?: number
  totalClasses?: number
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
  safeBuffer?: number
  requiredClasses?: number
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
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Text reveal animation for the welcome greeting
      gsap.fromTo(
        ".welcome-title-char",
        { y: 35, opacity: 0, filter: "blur(4px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.8,
          stagger: 0.04,
          ease: "power3.out",
        }
      )

      // 2. Stats cards stagger reveal
      gsap.fromTo(
        ".student-stat-card",
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: "power2.out",
          delay: 0.2,
        }
      )

      // 3. Grid blocks slide-up
      gsap.fromTo(
        ".student-grid-section",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
          delay: 0.4,
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const isAttendanceSafe = attendance.rate >= 75
  const isAttendanceWarning = attendance.rate >= 65 && attendance.rate < 75

  const stats = [
    {
      label: "Attendance Rate",
      value: `${attendance.rate}%`,
      sublabel: `${attendance.present + attendance.late}/${attendance.total} sessions`,
      badge: isAttendanceSafe ? "Safe ≥75%" : "Shortage Risk",
      badgeColor: isAttendanceSafe ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200",
      accent: isAttendanceSafe ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200",
      icon: <UserCheck size={18} className={isAttendanceSafe ? "text-emerald-600" : "text-rose-600"} />,
      link: "/dashboard/student/attendance",
    },
    {
      label: "Courses Enrolled",
      value: subjects.length,
      sublabel: "Live subject list",
      badge: "Active",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      accent: "bg-blue-50 text-blue-600 border-blue-200",
      icon: <BookOpen size={18} className="text-[#6C63FF]" />,
      link: "/dashboard/student/subjects",
    },
    {
      label: "Today’s Classes",
      value: schedule.length,
      sublabel: "From section timetable",
      badge: schedule.length > 0 ? "Scheduled" : "No Classes",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      accent: "bg-purple-50 text-purple-600 border-purple-200",
      icon: <CalendarDays size={18} className="text-[#8B5CF6]" />,
      link: "/dashboard/student/timetable",
    },
    {
      label: "Section & Program",
      value: student.sectionName || "—",
      sublabel: student.programName || "Program pending",
      badge: `Sem ${student.semester ?? "—"}`,
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      accent: "bg-amber-50 text-amber-600 border-amber-200",
      icon: <GraduationCap size={18} className="text-amber-600" />,
      link: "/dashboard/student",
    },
  ]

  const welcomeText = `Welcome back, ${student.name}`
  const words = welcomeText.split(" ")

  return (
    <div ref={containerRef} className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-3 pb-8 pt-5 sm:px-5 lg:px-8 lg:pt-7 font-sans">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        className="relative overflow-hidden rounded-[30px] border border-[#3A6DAF]/25 bg-gradient-to-br from-[#1A2E4D] to-[#14234B] p-5 shadow-[0_20px_50px_rgba(20,35,75,0.25)] backdrop-blur-xl sm:p-7 lg:p-8"
      >
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#6C63FF]/20 blur-3xl" />
        <div className="absolute -left-12 -bottom-12 h-56 w-56 rounded-full bg-[#00C2A8]/15 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#3A6DAF]/25 text-[#E57D37] shadow-[inset_0_0_0_1px_rgba(58,109,175,0.3)]">
              <GraduationCap size={24} className="text-[#ECDFCB]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ECDFCB]">Student Dashboard</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#ECDFCB] sm:text-3xl flex flex-wrap font-heading">
                {words.map((word, idx) => (
                  <span key={idx} className="inline-block overflow-hidden mr-2">
                    <span className="welcome-title-char inline-block">
                      {word}
                    </span>
                  </span>
                ))}
              </h1>
              <p className="mt-2 text-sm text-[#94BAC4]/90">{student.institution} · {student.programName} · Semester {student.semester ?? "—"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link href="/dashboard/student/attendance" className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-4 py-2.5 text-[11px] font-bold text-emerald-200 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-emerald-900/60">
              <Activity size={14} className="text-emerald-400" /> Attendance Analytics
            </Link>
            <Link href="/dashboard/student/todo" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#3A6DAF]/30 bg-[#1A2E4D]/70 px-4 py-2.5 text-[11px] font-bold text-[#ECDFCB] shadow-sm transition hover:-translate-y-0.5 hover:border-[#E57D37]/50 hover:bg-[#1C3F73]">
              📋 To-Do List
            </Link>
            <Link href="/dashboard/student/report-card" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#3A6DAF]/30 bg-[#1A2E4D]/70 px-4 py-2.5 text-[11px] font-bold text-[#ECDFCB] shadow-sm transition hover:-translate-y-0.5 hover:border-[#E57D37]/50 hover:bg-[#1C3F73]">
              🏆 Grades
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, idx) => (
          <Link key={item.label} href={item.link}>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="student-stat-card dashboard-card p-5 rounded-[24px] border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(20,35,75,0.06)] hover:shadow-lg hover:border-indigo-200 transition-all duration-300 relative group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-[16px] ${item.accent} border`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <p className="text-3xl font-bold leading-none text-slate-900 font-mono">{item.value}</p>
                <ArrowUpRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">{item.sublabel}</p>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Grid Content */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        {/* Left Column: Schedule */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="student-grid-section dashboard-card p-5 sm:p-6 lg:p-7 rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(20,35,75,0.06)]"
        >
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-600">Today's classes</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl font-heading">Your Schedule</h2>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700 animate-pulse">Live</span>
          </div>

          <div className="mt-5 space-y-3">
            {schedule.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 shadow-sm">
                No class sessions are scheduled for today yet.
              </div>
            ) : (
              schedule.map((item) => (
                <div key={`${item.day}-${item.period}`} className="rounded-[20px] border border-slate-100 bg-slate-50/70 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/30">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.subjectCode} · {item.subjectName}</p>
                      <p className="mt-1 text-xs text-slate-500">Faculty: {item.facultyName}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm sm:self-auto">
                      <Clock size={13} className="text-indigo-600" /> Period {item.period}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Enrolled Courses with Attendance Rate */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-600">Enrolled Courses</p>
                <h3 className="text-base font-bold text-slate-900 font-heading">Course Attendance Overview</h3>
              </div>
              <Link href="/dashboard/student/subjects" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                View All <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {subjects.map((sub) => {
                const rate = sub.attendanceRate ?? 0
                const isSafe = rate >= 75
                return (
                  <Link key={sub.id} href={`/dashboard/student/subjects/${sub.id}`}>
                    <div className="p-3.5 rounded-[18px] border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {sub.code} · {sub.name}
                        </span>
                        <span className={`text-[11px] font-mono font-bold ${isSafe ? "text-emerald-600" : "text-rose-600"}`}>
                          {sub.totalClasses && sub.totalClasses > 0 ? `${rate}%` : "—"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isSafe ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${Math.min(100, Math.max(sub.totalClasses ? rate : 0, 5))}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        {sub.totalClasses && sub.totalClasses > 0 ? `${sub.attendedClasses}/${sub.totalClasses} classes attended` : "No sessions held yet"}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </motion.section>

        {/* Right Column: Attendance & Analytics Hub */}
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
          className="student-grid-section flex flex-col gap-5"
        >
          {/* Main Attendance Card */}
          <div className="dashboard-card p-5 sm:p-6 rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(20,35,75,0.06)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">Live Analytics</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 font-heading">Overall Attendance</h2>
              </div>
              <Link href="/dashboard/student/attendance" className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors">
                <ArrowUpRight size={18} />
              </Link>
            </div>

            {/* Attendance Percentage Display */}
            <div className="mt-5 p-5 rounded-[22px] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden shadow-md">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-emerald-500/20 blur-2xl" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Attendance Rate</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold font-mono tracking-tight text-white">{attendance.rate}%</span>
                    <span className="text-xs font-semibold text-emerald-400">Min 75%</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-white/10 bg-white/10">
                    {isAttendanceSafe ? (
                      <>
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        <span className="text-emerald-300">Optimal Standing</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} className="text-rose-400" />
                        <span className="text-rose-300">Shortage Warning (&lt;75%)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Circular Progress Ring */}
                <div className="relative flex items-center justify-center">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-white/10"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 32}
                      strokeDashoffset={2 * Math.PI * 32 * (1 - attendance.rate / 100)}
                      strokeLinecap="round"
                      className={isAttendanceSafe ? "text-emerald-400" : "text-rose-400"}
                      fill="transparent"
                    />
                  </svg>
                  <ShieldCheck size={22} className={`absolute ${isAttendanceSafe ? "text-emerald-400" : "text-rose-400"}`} />
                </div>
              </div>

              {/* Progress Bar with 75% indicator */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex justify-between text-[10px] font-semibold text-slate-300 mb-1">
                  <span>0%</span>
                  <span className="text-emerald-400">75% Target</span>
                  <span>100%</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full ${isAttendanceSafe ? "bg-emerald-400" : "bg-rose-400"}`}
                    style={{ width: `${Math.min(100, Math.max(attendance.rate, 3))}%` }}
                  />
                  <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-white/80" />
                </div>
              </div>
            </div>

            {/* Smart Advice / Attendance Calculator */}
            <div className="mt-4 p-3.5 rounded-[18px] border border-slate-100 bg-slate-50 text-xs text-slate-700">
              {attendance.total === 0 ? (
                <p className="text-slate-500 text-center py-1">No attendance records have been marked yet.</p>
              ) : isAttendanceSafe ? (
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-emerald-700 font-semibold">Safe Buffer:</strong> You can miss up to{" "}
                    <strong className="text-slate-900 font-bold">{attendance.safeBuffer ?? 0} more classes</strong> without falling below the mandatory 75% threshold.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-rose-700 font-semibold">Attendance Action:</strong> You need to attend the next{" "}
                    <strong className="text-slate-900 font-bold">{attendance.requiredClasses ?? 1} consecutive classes</strong> to reach the 75% requirement.
                  </p>
                </div>
              )}
            </div>

            {/* Counts Breakdown */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[16px] border border-emerald-100 bg-emerald-50/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Present</p>
                <p className="mt-1 text-xl font-bold text-emerald-800 font-mono">{attendance.present}</p>
              </div>
              <div className="rounded-[16px] border border-rose-100 bg-rose-50/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Absent</p>
                <p className="mt-1 text-xl font-bold text-rose-800 font-mono">{attendance.absent}</p>
              </div>
              <div className="rounded-[16px] border border-amber-100 bg-amber-50/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Late</p>
                <p className="mt-1 text-xl font-bold text-amber-800 font-mono">{attendance.late}</p>
              </div>
            </div>

            <Link
              href="/dashboard/student/attendance"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-all shadow-sm"
            >
              View Full Attendance Center & Leaves <ChevronRight size={14} />
            </Link>
          </div>

          {/* Student Profile Info */}
          <div className="dashboard-card p-5 rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Student Profile</p>
            <div className="mt-3 grid gap-2">
              {[
                ["Email", student.email],
                ["Registration", student.registrationNumber],
                ["Phone", student.phone],
                ["Admission Year", student.admissionYear ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[14px] border border-slate-100 bg-slate-50/60 px-3 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                  <span className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{value || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  )
}

