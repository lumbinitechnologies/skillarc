"use client"

import React, { useState, useMemo } from "react"
import {
  UserRound,
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Search,
  CheckCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react"

interface Props {
  students: any[]
  attendance: Record<string, string>
  notes?: Record<string, string>
  studentAttendanceRates?: Record<string, { rate: number; total: number; missed: number }>
  onStatusChange: (studentId: string, status: string) => void
  onNoteChange?: (studentId: string, note: string) => void
  onIssueWarning?: (student: any) => void
  onPrint?: () => void
}

const STATUS = [
  {
    value: "Present",
    activeClass: "bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-300",
    inactiveClass: "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
    label: "Present",
  },
  {
    value: "Absent",
    activeClass: "bg-rose-600 text-white shadow-md shadow-rose-200 ring-2 ring-rose-300",
    inactiveClass: "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200",
    label: "Absent",
  },
  {
    value: "Late",
    activeClass: "bg-amber-500 text-white shadow-md shadow-amber-200 ring-2 ring-amber-300",
    inactiveClass: "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200",
    label: "Late",
  },
  {
    value: "Approved Absence",
    activeClass: "bg-[#6C63FF] text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-300",
    inactiveClass: "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-[#6C63FF] hover:border-indigo-200",
    label: "Approved",
    fullName: "Approved Absence",
  },
]

const QUICK_NOTES = ["Medical Certificate", "Approved Leave", "Sick Leave", "Left Early (Appointment)", "Transport Delay"]

export default function AttendanceTable({
  students,
  attendance,
  notes = {},
  studentAttendanceRates = {},
  onStatusChange,
  onNoteChange,
  onIssueWarning,
  onPrint,
}: Props) {
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState("")

  function toggleNote(studentId: string) {
    setExpandedNotes((prev) => ({ ...prev, [studentId]: !prev[studentId] }))
  }

  // Filter students by search
  const visibleStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase().trim()
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.registration_number?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
    )
  }, [students, searchQuery])

  // Count at-risk students
  const atRiskStudents = students.filter((s) => {
    const rateInfo = studentAttendanceRates[s.id]
    return rateInfo && rateInfo.rate < 80 && rateInfo.total > 0
  })

  // Bulk actions
  function handleMarkAllPresent() {
    visibleStudents.forEach((s) => {
      onStatusChange(s.id, "Present")
    })
  }

  function handleMarkAllAbsent() {
    visibleStudents.forEach((s) => {
      onStatusChange(s.id, "Absent")
    })
  }

  function handleClearAll() {
    visibleStudents.forEach((s) => {
      onStatusChange(s.id, "")
    })
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm space-y-0">
      {/* Header */}
      <div className="border-b border-slate-200 p-5 sm:px-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">Students Roster</h2>
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-0.5 text-xs font-bold text-[#6C63FF]">
                {students.length} Total
              </span>
              {atRiskStudents.length > 0 && (
                <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-0.5 text-xs font-bold text-rose-700 flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {atRiskStudents.length} At-Risk (&lt;80%)
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Mark attendance statuses, attach leave notes, and generate official compliance warnings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs shrink-0"
              >
                <Printer size={14} className="text-[#6C63FF]" /> Print Roll Sheet
              </button>
            )}
          </div>
        </div>

        {/* Toolbar: Search + Bulk Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-9 pr-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:bg-white focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
            >
              <CheckCheck size={13} /> Mark All Present
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="divide-y divide-slate-100">
        {visibleStudents.map((student) => {
          const currentStatus = attendance[student.id]
          const currentNote = notes[student.id] || ""
          const isNoteOpen = expandedNotes[student.id] || Boolean(currentNote)
          const rateData = studentAttendanceRates[student.id]
          const isAtRisk = rateData && rateData.rate < 80 && rateData.total > 0

          return (
            <div
              key={student.id}
              className={`p-5 sm:px-6 transition-all ${
                isAtRisk ? "bg-rose-50/30 hover:bg-rose-50/50" : "hover:bg-slate-50/70"
              }`}
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                {/* Student Info */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      isAtRisk
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : "bg-indigo-50 text-[#6C63FF] border border-indigo-100"
                    }`}
                  >
                    <UserRound size={19} />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-sm font-['Plus_Jakarta_Sans',sans-serif]">
                        {student.name}
                      </h3>
                      {isAtRisk && (
                        <span className="rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[10px] font-black text-rose-800 uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> At-Risk ({rateData.rate}%)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 border border-slate-200">
                        {student.registration_number || student.email || `STU-${student.id.slice(0, 6)}`}
                      </span>

                      {rateData ? (
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[11px] font-bold border ${
                            rateData.rate < 80
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          Cumulative: {rateData.rate}% ({rateData.total - rateData.missed}/{rateData.total} sessions)
                        </span>
                      ) : (
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          New Cohort
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Buttons & Actions */}
                <div className="flex flex-wrap items-center gap-2 sm:self-auto self-start">
                  {/* Status Group */}
                  <div className="inline-flex rounded-2xl bg-slate-100/90 p-1 border border-slate-200/80 gap-1">
                    {STATUS.map((s) => {
                      const isActive = currentStatus === s.value
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => onStatusChange(student.id, s.value)}
                          title={s.fullName || s.label}
                          className={`rounded-xl px-3 sm:px-3.5 py-1.5 text-xs font-bold transition-all ${
                            isActive ? s.activeClass : s.inactiveClass
                          }`}
                        >
                          {s.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Note Toggle Button */}
                  <button
                    type="button"
                    onClick={() => toggleNote(student.id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                      currentNote
                        ? "border-indigo-200 bg-indigo-50 text-[#6C63FF]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <FileText size={13} />
                    <span className="hidden sm:inline">{currentNote ? "Note Attached" : "Add Note"}</span>
                  </button>

                  {/* Warning Letter Trigger for At-Risk */}
                  {isAtRisk && onIssueWarning && (
                    <button
                      type="button"
                      onClick={() =>
                        onIssueWarning({
                          ...student,
                          attendanceRate: rateData.rate,
                          totalSessions: rateData.total,
                          missedSessions: rateData.missed,
                        })
                      }
                      className="rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-rose-200 hover:scale-[1.02] transition-all flex items-center gap-1.5"
                    >
                      <ShieldAlert size={13} />
                      <span>Issue Warning Letter</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Per-Student Note Area */}
              {isNoteOpen && onNoteChange && (
                <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add exception note (e.g. Medical certificate submitted, Approved doctor appointment)..."
                      value={currentNote}
                      onChange={(e) => onNoteChange(student.id, e.target.value)}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100"
                    />
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      {QUICK_NOTES.map((qn) => (
                        <button
                          key={qn}
                          type="button"
                          onClick={() => onNoteChange(student.id, qn)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-[#6C63FF] whitespace-nowrap transition"
                        >
                          + {qn}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {visibleStudents.length === 0 && (
          <div className="px-6 py-16 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 text-[#6C63FF]">
              <UserRound size={26} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base font-['Plus_Jakarta_Sans',sans-serif]">
              {searchQuery ? "No matching students" : "No students in this class"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No student record found matching "${searchQuery}". Try a different keyword.`
                : "Choose a program, semester, or class section to load the class attendance roster."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}