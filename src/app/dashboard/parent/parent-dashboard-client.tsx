"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  GraduationCap, BookOpen, UserCheck, Mail, Phone, Calendar,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  ChevronDown, Users, Clock, BarChart3, Building2,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface SubjectWithAttendance {
  id: string
  name: string
  code: string
  facultyName: string
  attendance: { total: number; present: number; absent: number }
}

interface Child {
  id: string
  relationship: string
  name: string
  email: string
  phone: string
  registration_number: string
  semester: number | null
  admission_year: number | null
  sectionName: string
  programName: string
  advisorName: string
  advisorEmail: string
  advisorPhone: string
  subjects: SubjectWithAttendance[]
  schedule: Array<{ day: string; period: number; subjectName: string; subjectCode: string; facultyName: string }>
  attendance: { rate: number; total: number; present: number; absent: number; late: number }
}

// ── Animation variants ────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 18 } },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function greeting(name: string) {
  const h = new Date().getHours()
  const time = h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening"
  return `${time}, ${name.split(" ")[0]} 👋`
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function attendanceColor(rate: number) {
  if (rate >= 75) return "text-emerald-600"
  if (rate >= 60) return "text-amber-500"
  return "text-red-500"
}

function attendanceBg(rate: number) {
  if (rate >= 75) return "bg-emerald-50 border-emerald-100"
  if (rate >= 60) return "bg-amber-50 border-amber-100"
  return "bg-red-50 border-red-100"
}

function attendanceBarColor(rate: number) {
  if (rate >= 75) return "bg-emerald-500"
  if (rate >= 60) return "bg-amber-400"
  return "bg-red-500"
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ParentDashboardClient({
  parent,
  childrenList = [],
}: {
  parent: { name: string; email: string; institution: string }
  childrenList: Child[]
}) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [timetableDay, setTimetableDay] = useState(
    new Date().toLocaleDateString("en-US", { weekday: "long" })
  )
  const [subjectExpanded, setSubjectExpanded] = useState<string | null>(null)

  const child = childrenList[selectedIdx] ?? null
  const daySchedule = child?.schedule?.filter((s) => s.day === timetableDay) ?? []

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 antialiased">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[5%] top-[5%] h-[500px] w-[500px] rounded-full bg-[#1690C7]/6 blur-[140px]" />
        <div className="absolute right-[8%] top-[35%] h-[400px] w-[400px] rounded-full bg-[#FC8402]/5 blur-[120px]" />
        <div className="absolute bottom-[5%] left-[25%] h-[450px] w-[450px] rounded-full bg-emerald-100/30 blur-[140px]" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
      >
        {/* ── Hero Header ── */}
        <motion.div
          variants={item}
          className="flex flex-col gap-5 rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1690C7]/10 border border-[#1690C7]/15 text-[#1690C7]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1690C7]">
                Parent Console · {parent.institution}
              </p>
              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">
                {greeting(parent.name)}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">{parent.email}</p>
            </div>
          </div>

          {/* Student switcher (multi-child) */}
          {childrenList.length > 1 && (
            <div className="flex shrink-0 flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Viewing Student
              </label>
              <select
                value={selectedIdx}
                onChange={(e) => setSelectedIdx(Number(e.target.value))}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#1690C7] focus:ring-2 focus:ring-[#1690C7]/10 transition"
              >
                {childrenList.map((c, idx) => (
                  <option key={c.id} value={idx}>
                    {c.name} · {c.registration_number}
                  </option>
                ))}
              </select>
            </div>
          )}
        </motion.div>

        {/* ── No students linked ── */}
        {childrenList.length === 0 && (
          <motion.div
            variants={item}
            className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/80 py-24 text-center px-6"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1690C7]/8 text-[#1690C7]">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No student linked yet</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
              Your parent account is not linked to any student record. Please contact the institution administrator to complete the setup.
            </p>
          </motion.div>
        )}

        {child && (
          <AnimatePresence mode="wait">
            <motion.div
              key={child.id}
              variants={container}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* ── Student Identity Bar ── */}
              <motion.div
                variants={item}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/80 px-5 py-3.5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1690C7]/10 text-[#1690C7] text-sm font-black">
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{child.name}</p>
                    <p className="text-[11px] text-slate-400">{child.relationship}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    child.registration_number !== "—" && `USN: ${child.registration_number}`,
                    child.programName,
                    child.sectionName !== "—" && `Section ${child.sectionName}`,
                    child.semester && `Semester ${child.semester}`,
                  ]
                    .filter(Boolean)
                    .map((label, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {label}
                      </span>
                    ))}
                </div>
              </motion.div>

              {/* ── Stat Cards ── */}
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Attendance rate */}
                <motion.div
                  variants={item}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className={`rounded-3xl border p-5 shadow-sm transition-all duration-200 ${attendanceBg(child.attendance.rate)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${attendanceBg(child.attendance.rate)}`}>
                      {child.attendance.rate >= 75 ? (
                        <TrendingUp className={`h-5 w-5 ${attendanceColor(child.attendance.rate)}`} />
                      ) : child.attendance.rate >= 60 ? (
                        <AlertTriangle className={`h-5 w-5 ${attendanceColor(child.attendance.rate)}`} />
                      ) : (
                        <TrendingDown className={`h-5 w-5 ${attendanceColor(child.attendance.rate)}`} />
                      )}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${attendanceColor(child.attendance.rate)}`}>
                      {child.attendance.rate >= 75 ? "Good" : child.attendance.rate >= 60 ? "Warning" : "Low"}
                    </span>
                  </div>
                  <p className={`mt-4 text-4xl font-black tracking-tight font-['Space_Grotesk'] ${attendanceColor(child.attendance.rate)}`}>
                    {child.attendance.rate}%
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">Overall Attendance</p>
                  <div className="mt-3 flex gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {child.attendance.present} Present</span>
                    <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-400" /> {child.attendance.absent} Absent</span>
                  </div>
                  {/* Mini bar */}
                  <div className="mt-3 h-1.5 rounded-full bg-white/60">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-700 ${attendanceBarColor(child.attendance.rate)}`}
                      style={{ width: `${child.attendance.rate}%` }}
                    />
                  </div>
                </motion.div>

                {/* Enrolled courses */}
                <motion.div
                  variants={item}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="rounded-3xl border border-[#1690C7]/12 bg-[#1690C7]/5 p-5 shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1690C7]/10 text-[#1690C7]">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1690C7]">This Semester</span>
                  </div>
                  <p className="mt-4 text-4xl font-black tracking-tight text-slate-900 font-['Space_Grotesk']">
                    {child.subjects.length}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">Enrolled Courses</p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {child.subjects.map((s) => s.code).slice(0, 3).join(", ")}
                    {child.subjects.length > 3 ? ` +${child.subjects.length - 3} more` : ""}
                  </p>
                </motion.div>

                {/* Academic info */}
                <motion.div
                  variants={item}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="rounded-3xl border border-[#FC8402]/12 bg-[#FC8402]/5 p-5 shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FC8402]/10 text-[#FC8402]">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#FC8402]">Academic</span>
                  </div>
                  <p className="mt-4 text-4xl font-black tracking-tight text-slate-900 font-['Space_Grotesk']">
                    Sem {child.semester ?? "—"}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">Current Semester</p>
                  {child.admission_year && (
                    <p className="mt-2 text-[11px] text-slate-500">Admitted {child.admission_year}</p>
                  )}
                </motion.div>
              </div>

              {/* ── Main grid: Timetable + Right panel ── */}
              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">

                {/* Timetable */}
                <motion.section
                  variants={item}
                  className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-4 mb-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1690C7]">Schedule</p>
                      <h2 className="mt-0.5 text-base font-bold text-slate-900">Class Timetable</h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[11px] font-semibold text-slate-500">{timetableDay}</span>
                    </div>
                  </div>

                  {/* Day selector */}
                  <div className="flex gap-1 flex-wrap mb-5">
                    {DAYS.map((day) => {
                      const hasClass = child.schedule.some((s) => s.day === day)
                      const isToday = day === new Date().toLocaleDateString("en-US", { weekday: "long" })
                      return (
                        <button
                          key={day}
                          onClick={() => setTimetableDay(day)}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all duration-150 ${
                            timetableDay === day
                              ? "bg-[#1690C7] text-white shadow-sm"
                              : hasClass
                              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              : "bg-slate-50 text-slate-400"
                          } ${isToday && timetableDay !== day ? "ring-1 ring-[#1690C7]/30" : ""}`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      )
                    })}
                  </div>

                  {daySchedule.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
                      <Calendar className="h-7 w-7 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-400">No classes on {timetableDay}</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {daySchedule
                        .sort((a, b) => a.period - b.period)
                        .map((session, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 hover:border-[#1690C7]/20 hover:bg-[#1690C7]/3 transition-all duration-150"
                          >
                            <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-white border border-slate-100 text-[#1690C7] font-['Space_Grotesk']">
                              <span className="text-[9px] font-bold uppercase opacity-60">P</span>
                              <span className="text-sm font-black leading-none">{session.period}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900 truncate">{session.subjectName}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{session.subjectCode} · {session.facultyName}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </motion.section>

                {/* Right panel: Advisor + Contact */}
                <div className="space-y-5">
                  {/* Advisor */}
                  <motion.section
                    variants={item}
                    className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1690C7] mb-3">Section Advisor</p>
                    {child.advisorName ? (
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FC8402]/10 text-[#FC8402] text-sm font-black">
                          {child.advisorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-sm">{child.advisorName}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Section Faculty Advisor</p>
                          <div className="mt-3 space-y-1.5">
                            {child.advisorEmail && (
                              <a
                                href={`mailto:${child.advisorEmail}`}
                                className="flex items-center gap-2 text-[12px] text-slate-600 hover:text-[#1690C7] transition-colors"
                              >
                                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{child.advisorEmail}</span>
                              </a>
                            )}
                            {child.advisorPhone && (
                              <a
                                href={`tel:${child.advisorPhone}`}
                                className="flex items-center gap-2 text-[12px] text-slate-600 hover:text-[#1690C7] transition-colors"
                              >
                                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {child.advisorPhone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No advisor assigned</p>
                    )}
                  </motion.section>

                  {/* Student contact */}
                  <motion.section
                    variants={item}
                    className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1690C7] mb-3">Student Contact</p>
                    <div className="space-y-2.5">
                      {child.email && (
                        <a
                          href={`mailto:${child.email}`}
                          className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 hover:border-[#1690C7]/20 transition-all"
                        >
                          <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="truncate">{child.email}</span>
                        </a>
                      )}
                      {child.phone && child.phone !== "—" && (
                        <a
                          href={`tel:${child.phone}`}
                          className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 hover:border-[#1690C7]/20 transition-all"
                        >
                          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                          {child.phone}
                        </a>
                      )}
                    </div>
                  </motion.section>
                </div>
              </div>

              {/* ── Subject-wise Attendance ── */}
              <motion.section variants={item} className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-5">
                  <BarChart3 className="h-4 w-4 text-[#1690C7]" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1690C7]">Academics</p>
                    <h2 className="mt-0.5 text-base font-bold text-slate-900">Subject-wise Attendance</h2>
                  </div>
                </div>

                {child.subjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
                    <BookOpen className="h-7 w-7 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-400">No courses assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {child.subjects.map((subject) => {
                      const rate = subject.attendance.total > 0
                        ? Math.round((subject.attendance.present / subject.attendance.total) * 100)
                        : 0
                      const isExpanded = subjectExpanded === subject.id

                      return (
                        <div key={subject.id} className="rounded-2xl border border-slate-100 overflow-hidden">
                          <button
                            onClick={() => setSubjectExpanded(isExpanded ? null : subject.id)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50/60 transition-colors text-left"
                          >
                            {/* Subject color bar */}
                            <div className="h-8 w-1 rounded-full flex-shrink-0" style={{
                              background: rate >= 75 ? "#10B981" : rate >= 60 ? "#EAAD62" : "#F04438"
                            }} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">{subject.name}</p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">{subject.code} · {subject.facultyName}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`text-base font-black font-['Space_Grotesk'] ${attendanceColor(rate)}`}>
                                    {subject.attendance.total > 0 ? `${rate}%` : "—"}
                                  </span>
                                  <ChevronDown
                                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                </div>
                              </div>
                              {/* Progress bar */}
                              {subject.attendance.total > 0 && (
                                <div className="mt-2.5 h-1.5 rounded-full bg-slate-100">
                                  <div
                                    className={`h-1.5 rounded-full transition-all duration-700 ${attendanceBarColor(rate)}`}
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-slate-50"
                              >
                                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50/60">
                                  <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5 text-center">
                                    <p className="text-base font-black text-slate-900 font-['Space_Grotesk']">
                                      {subject.attendance.total}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase tracking-wider">Total</p>
                                  </div>
                                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-center">
                                    <p className="text-base font-black text-emerald-600 font-['Space_Grotesk']">
                                      {subject.attendance.present}
                                    </p>
                                    <p className="text-[10px] text-emerald-500 mt-0.5 font-semibold uppercase tracking-wider">Present</p>
                                  </div>
                                  <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-center">
                                    <p className="text-base font-black text-red-500 font-['Space_Grotesk']">
                                      {subject.attendance.absent}
                                    </p>
                                    <p className="text-[10px] text-red-400 mt-0.5 font-semibold uppercase tracking-wider">Absent</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.section>

              {/* ── Academic Info footer ── */}
              <motion.div
                variants={item}
                className="flex flex-wrap gap-3 rounded-2xl border border-slate-100 bg-white/80 px-5 py-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-700">{parent.institution}</span>
                </div>
                <span className="text-slate-200">|</span>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  <span>{child.programName}</span>
                </div>
                {child.sectionName !== "—" && (
                  <>
                    <span className="text-slate-200">|</span>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <UserCheck className="h-4 w-4 text-slate-400" />
                      <span>Section {child.sectionName}</span>
                    </div>
                  </>
                )}
                {child.admission_year && (
                  <>
                    <span className="text-slate-200">|</span>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>Batch of {child.admission_year}</span>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  )
}
