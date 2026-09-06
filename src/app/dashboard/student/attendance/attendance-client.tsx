"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Sparkles,
  UserRound,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Calendar,
  Send,
  Info
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { submitLeaveApplicationAction } from "./actions"

interface StudentInfo {
  name: string
  email: string
  institution: string
  sectionName: string
  programName: string
  semester: number | null
  registrationNumber?: string
  phone?: string
  admissionYear?: number | null
}

interface AttendanceEntry {
  id: string
  date: string
  period: number
  subjectName: string
  subjectCode: string
  facultyName: string
  status: string
}

interface SubjectSummary {
  id: string
  name: string
  code: string
  present: number
  absent: number
  late: number
  total: number
  rate: number
}

interface OverallSummary {
  total: number
  present: number
  absent: number
  late: number
  rate: number
}

export default function AttendanceClient({
  student,
  studentId,
  sectionId,
  advisorId,
  institutionId,
  advisorName,
  attendanceEntries,
  subjectSummaries,
  overallSummary,
  initialLeaveApplications = [],
}: {
  student: StudentInfo
  studentId: string
  sectionId: string | null
  advisorId: string | null
  institutionId: string | null
  advisorName: string
  attendanceEntries: AttendanceEntry[]
  subjectSummaries: SubjectSummary[]
  overallSummary: OverallSummary
  initialLeaveApplications?: any[]
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "log" | "leave">("overview")
  const [leaveApplications, setLeaveApplications] = useState<any[]>(initialLeaveApplications)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  
  // Leave Form State
  const [leaveReason, setLeaveReason] = useState("")
  const [leaveFromDate, setLeaveFromDate] = useState("")
  const [leaveToDate, setLeaveToDate] = useState("")
  const [leaveNote, setLeaveNote] = useState("")
  const [leaveStatus, setLeaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [leaveFeedback, setLeaveFeedback] = useState<string | null>(null)

  const isAttendanceSafe = overallSummary.rate >= 75
  const isAttendanceWarning = overallSummary.rate >= 65 && overallSummary.rate < 75

  // Calculations for 75% policy
  const effectivePresent = overallSummary.present + overallSummary.late
  const safeBuffer = isAttendanceSafe && overallSummary.total > 0
    ? Math.max(0, Math.floor((effectivePresent - 0.75 * overallSummary.total) / 0.75))
    : 0
  const requiredClasses = !isAttendanceSafe && overallSummary.total > 0
    ? Math.max(0, Math.ceil((0.75 * overallSummary.total - effectivePresent) / 0.25))
    : 0

  const statusStyles: Record<string, { bg: string; text: string; border: string; label: string; icon: any }> = {
    PRESENT: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Present", icon: CheckCircle2 },
    ABSENT: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "Absent", icon: AlertCircle },
    LATE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Late", icon: Clock },
    APPROVED_ABSENCE: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Approved Leave", icon: CheckCircle2 },
    EXCUSED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Excused", icon: CheckCircle2 },
    NOT_MARKED: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", label: "Not Marked", icon: Clock },
  }

  const filteredEntries = useMemo(() => {
    return attendanceEntries.filter((entry) => {
      const matchesSearch =
        entry.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.facultyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.date.includes(searchTerm)
      
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PRESENT" && (entry.status === "PRESENT" || entry.status === "APPROVED_ABSENCE" || entry.status === "EXCUSED")) ||
        (statusFilter === "ABSENT" && entry.status === "ABSENT") ||
        (statusFilter === "LATE" && entry.status === "LATE")

      return matchesSearch && matchesStatus
    })
  }, [attendanceEntries, searchTerm, statusFilter])

  const tabs = [
    { key: "overview", label: "Overview & Insights", icon: Sparkles },
    { key: "analytics", label: "Subject-Wise Analytics", icon: BarChart2 },
    { key: "log", label: "Attendance Log", icon: CalendarDays },
    { key: "leave", label: "Leave Application", icon: FileText },
  ] as const

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-3 pb-12 pt-5 sm:px-5 lg:px-8 lg:pt-7 font-sans">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <span className="text-xs text-slate-400 font-medium">
          {student.institution} · {student.sectionName}
        </span>
      </div>

      {/* Hero Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-[#1A2E4D] via-[#14234B] to-[#0D1836] p-6 sm:p-8 text-white shadow-xl"
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#6C63FF]/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-[#00C2A8]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-white/10 border border-white/15 text-emerald-400 shadow-inner">
              <GraduationCap size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Attendance Analytics Hub</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 bg-white/10 text-slate-200">
                  Semester {student.semester ?? "—"}
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading">
                Attendance & Participation
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-300">
                Track your attendance status, maintain academic thresholds (75% rule), and manage leave requests.
              </p>
            </div>
          </div>

          {/* Quick Gauge Widget */}
          <div className="flex items-center gap-4 rounded-[24px] border border-white/15 bg-white/10 p-4 sm:p-5 backdrop-blur-md self-start lg:self-auto">
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.15)" strokeWidth="5" fill="transparent" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - overallSummary.rate / 100)}
                  strokeLinecap="round"
                  className={isAttendanceSafe ? "text-emerald-400" : "text-rose-400"}
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-sm font-bold font-mono text-white">{overallSummary.rate}%</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Current Standing</p>
              <p className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                {isAttendanceSafe ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Eligible & Good Standing</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} className="text-rose-400" />
                    <span>Attendance Shortage</span>
                  </>
                )}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                {effectivePresent} of {overallSummary.total} sessions marked
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB 1: OVERVIEW & INSIGHTS */}
      {activeTab === "overview" && (
        <div className="grid gap-6">
          {/* Key Metric Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Classes</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <CalendarDays size={16} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">{overallSummary.total}</p>
              <p className="mt-1 text-xs text-slate-500 font-medium">Section lecture periods</p>
            </div>

            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Present & Approved</span>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-emerald-800 font-mono">{overallSummary.present}</p>
              <p className="mt-1 text-xs text-emerald-700/80 font-medium">Attended classes</p>
            </div>

            <div className="rounded-[24px] border border-rose-100 bg-rose-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Absences</span>
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <AlertCircle size={16} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-rose-800 font-mono">{overallSummary.absent}</p>
              <p className="mt-1 text-xs text-rose-700/80 font-medium">Unexcused missed classes</p>
            </div>

            <div className="rounded-[24px] border border-amber-100 bg-amber-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Late Arrivals</span>
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Clock size={16} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-amber-800 font-mono">{overallSummary.late}</p>
              <p className="mt-1 text-xs text-amber-700/80 font-medium">Counted towards attendance</p>
            </div>
          </div>

          {/* Smart Attendance Calculator / 75% Rule Engine */}
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-heading">Attendance Calculator & Goal Tracker</h2>
                  <p className="text-xs text-slate-500">Calculates class buffers and recovery quotas based on the university 75% rule.</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                Min 75% Required
              </span>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="p-5 rounded-[22px] border border-slate-100 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {isAttendanceSafe ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <AlertTriangle size={18} className="text-rose-600" />
                    )}
                    <h3 className="text-sm font-bold text-slate-900">
                      {isAttendanceSafe ? "Safe Standing Status" : "Attendance Recovery Action"}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {overallSummary.total === 0 ? (
                      "No session data has been recorded for your section yet."
                    ) : isAttendanceSafe ? (
                      <>
                        You are currently in good academic standing at <strong className="text-emerald-700 font-bold">{overallSummary.rate}%</strong>.
                        You can miss up to <strong className="text-slate-900 font-bold">{safeBuffer} more {safeBuffer === 1 ? 'class' : 'classes'}</strong> without falling below the 75% threshold.
                      </>
                    ) : (
                      <>
                        Your attendance is currently at <strong className="text-rose-700 font-bold">{overallSummary.rate}%</strong>, which is below the required 75% mark.
                        You must attend the next <strong className="text-slate-900 font-bold">{requiredClasses} consecutive {requiredClasses === 1 ? 'class' : 'classes'}</strong> to recover your eligibility.
                      </>
                    )}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current Margin:</span>
                  <span className={`font-mono font-bold ${isAttendanceSafe ? "text-emerald-600" : "text-rose-600"}`}>
                    {isAttendanceSafe ? `+${safeBuffer} Safe Classes` : `-${requiredClasses} Classes Deficit`}
                  </span>
                </div>
              </div>

              {/* Progress Visualizer */}
              <div className="p-5 rounded-[22px] border border-slate-100 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs font-bold text-slate-700">Eligibility Progress</span>
                    <span className="text-xs font-mono font-bold text-slate-900">{overallSummary.rate}% / 100%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden relative shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isAttendanceSafe ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-rose-500 to-amber-400"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(overallSummary.rate, 4))}%` }}
                    />
                    <div className="absolute top-0 bottom-0 left-[75%] w-1 bg-slate-900/70" title="75% Minimum Bar" />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                    <span>0% (Critical)</span>
                    <span className="text-indigo-600 font-bold">75% Target Line</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Exam Eligibility:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isAttendanceSafe ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                    {isAttendanceSafe ? "✅ Eligible for Final Exams" : "⚠️ Shortage Detainment Risk"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Subject Highlights */}
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 font-heading">Course Breakdown Highlights</h2>
              <button
                onClick={() => setActiveTab("analytics")}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
              >
                View Full Analytics <ChevronRight size={14} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjectSummaries.length === 0 ? (
                <p className="text-xs text-slate-400 col-span-full py-4 text-center">No subject summaries available yet.</p>
              ) : (
                subjectSummaries.slice(0, 6).map((sub) => {
                  const isSafe = sub.rate >= 75
                  return (
                    <div key={sub.id} className="p-4 rounded-[20px] border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{sub.code} · {sub.name}</span>
                        <span className={`text-xs font-mono font-bold ${isSafe ? "text-emerald-600" : "text-rose-600"}`}>
                          {sub.rate}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full mt-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isSafe ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${Math.min(100, Math.max(sub.rate, 5))}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{sub.present} Attended</span>
                        <span>{sub.total} Total</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBJECT-WISE ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">Course-Wise Attendance Breakdown</h2>
              <p className="text-xs text-slate-500">Detailed attendance performance and standing per enrolled subject.</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">{subjectSummaries.length} Courses</span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {subjectSummaries.length === 0 ? (
              <div className="col-span-full p-8 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-[22px]">
                No course records available yet.
              </div>
            ) : (
              subjectSummaries.map((sub) => {
                const isSafe = sub.rate >= 75
                const subBuffer = isSafe && sub.total > 0
                  ? Math.max(0, Math.floor((sub.present + sub.late - 0.75 * sub.total) / 0.75))
                  : 0
                const subNeeded = !isSafe && sub.total > 0
                  ? Math.max(0, Math.ceil((0.75 * sub.total - (sub.present + sub.late)) / 0.25))
                  : 0

                return (
                  <div
                    key={sub.id}
                    className="p-5 rounded-[24px] border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{sub.code}</span>
                        <h3 className="text-base font-bold text-slate-900 font-heading mt-0.5">{sub.name}</h3>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                        isSafe ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {sub.rate}%
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                        <span>Attendance Progress</span>
                        <span>{sub.present + sub.late} / {sub.total} Classes</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all ${isSafe ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${Math.min(100, Math.max(sub.rate, 4))}%` }}
                        />
                        <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-slate-900/60" />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">Present</span>
                        <p className="font-bold text-emerald-800 font-mono mt-0.5">{sub.present}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-100">
                        <span className="text-[10px] font-bold text-rose-700 uppercase">Absent</span>
                        <p className="font-bold text-rose-800 font-mono mt-0.5">{sub.absent}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-100">
                        <span className="text-[10px] font-bold text-amber-700 uppercase">Late</span>
                        <p className="font-bold text-amber-800 font-mono mt-0.5">{sub.late}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Advice:</span>
                      {sub.total === 0 ? (
                        <span className="text-slate-400">No classes yet</span>
                      ) : isSafe ? (
                        <span className="text-emerald-600 font-semibold">Can miss up to {subBuffer} more classes</span>
                      ) : (
                        <span className="text-rose-600 font-semibold">Attend next {subNeeded} classes to reach 75%</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE LOG */}
      {activeTab === "log" && (
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">Historical Attendance Log</h2>
              <p className="text-xs text-slate-500">Live, period-by-period class attendance records.</p>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search subject or faculty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 w-48 sm:w-56"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present Only</option>
                <option value="ABSENT">Absent Only</option>
                <option value="LATE">Late Only</option>
              </select>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-[20px]">
                No attendance records match your filter criteria.
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const style = statusStyles[entry.status] || statusStyles.NOT_MARKED
                const Icon = style.icon
                return (
                  <div
                    key={entry.id}
                    className="p-3.5 sm:p-4 rounded-[20px] border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-[14px] bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-700 shrink-0">
                        P{entry.period}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {entry.subjectCode} · {entry.subjectName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {entry.facultyName} · {entry.date}
                        </p>
                      </div>
                    </div>

                    <div className={`inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}>
                      <Icon size={13} />
                      {style.label}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: LEAVE APPLICATION */}
      {activeTab === "leave" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* Column 1: Submit Form */}
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-7 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading">Apply for Leave</h2>
                <p className="text-xs text-slate-500">Request excused absence for medical or personal reasons.</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold">
                <UserRound size={13} />
                Advisor: {advisorName}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    From Date *
                  </label>
                  <input
                    type="date"
                    value={leaveFromDate}
                    onChange={(e) => setLeaveFromDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    To Date *
                  </label>
                  <input
                    type="date"
                    value={leaveToDate}
                    onChange={(e) => setLeaveToDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Leave *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Medical fever / doctor appointment / family emergency"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Supporting Notes / Context (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Add any additional context or details for your faculty advisor..."
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>

              <button
                onClick={async () => {
                  if (!leaveFromDate || !leaveToDate) {
                    setLeaveFeedback("Please select both a from-date and a to-date.")
                    setLeaveStatus("error")
                    return
                  }

                  if (new Date(leaveFromDate) > new Date(leaveToDate)) {
                    setLeaveFeedback("The from-date cannot be after the to-date.")
                    setLeaveStatus("error")
                    return
                  }

                  if (!leaveReason.trim()) {
                    setLeaveFeedback("Please add a reason for your leave.")
                    setLeaveStatus("error")
                    return
                  }

                  setLeaveStatus("saving")
                  setLeaveFeedback(null)

                  const result = await submitLeaveApplicationAction({
                    studentId,
                    sectionId,
                    advisorId,
                    institutionId,
                    fromDate: leaveFromDate,
                    toDate: leaveToDate,
                    reason: leaveReason.trim(),
                    notes: leaveNote.trim() || null,
                  })

                  if (result.success) {
                    setLeaveStatus("saved")
                    setLeaveFeedback("🎉 Leave request submitted successfully! Your advisor has been notified.")
                    const newApp = (result as any).application || {
                      id: Date.now().toString(),
                      from_date: leaveFromDate,
                      to_date: leaveToDate,
                      reason: leaveReason.trim(),
                      notes: leaveNote.trim() || null,
                      status: "PENDING",
                      created_at: new Date().toISOString(),
                    }
                    setLeaveApplications((prev) => [newApp, ...prev])
                    setLeaveFromDate("")
                    setLeaveToDate("")
                    setLeaveReason("")
                    setLeaveNote("")
                  } else {
                    setLeaveStatus("error")
                    setLeaveFeedback(result.error ?? "Unable to submit leave request.")
                  }
                }}
                disabled={leaveStatus === "saving"}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                <Send size={14} />
                {leaveStatus === "saving" ? "Submitting Request..." : "Submit Leave Application"}
              </button>

              {leaveFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold border ${
                    leaveStatus === "saved"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {leaveFeedback}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Leave History */}
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading">My Leave History</h2>
                <p className="text-xs text-slate-500">Track approvals and review statuses.</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {leaveApplications.length} {leaveApplications.length === 1 ? "Request" : "Requests"}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {leaveApplications.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-[20px]">
                  You have not submitted any leave applications yet.
                </div>
              ) : (
                leaveApplications.map((app) => {
                  const isPending = app.status === "PENDING"
                  const isApproved = app.status === "APPROVED"
                  const isRejected = app.status === "REJECTED"

                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-[20px] border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{app.reason}</p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                            <Calendar size={13} className="text-indigo-600" />
                            <span>
                              {app.from_date} → {app.to_date}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isRejected
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isApproved && <CheckCircle2 size={11} />}
                          {isRejected && <AlertCircle size={11} />}
                          {isPending && <Clock size={11} />}
                          {isApproved ? "Approved" : isRejected ? "Rejected" : "Pending Review"}
                        </span>
                      </div>

                      {app.notes && (
                        <p className="mt-2 text-[11px] text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-100">
                          {app.notes}
                        </p>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Submitted: {new Date(app.created_at || Date.now()).toLocaleDateString()}</span>
                        {app.approved_at && (
                          <span className={isApproved ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                            {isApproved ? "Approved on " : "Reviewed on "}
                            {new Date(app.approved_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
