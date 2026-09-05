"use client"

import React, { useState } from "react"
import {
  AlertTriangle,
  Printer,
  X,
  FileText,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Send,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface AttendanceWarningModalProps {
  isOpen: boolean
  onClose: () => void
  student: {
    id: string
    name: string
    email?: string
    registration_number?: string
    program_name?: string
    section_name?: string
    attendanceRate?: number
    totalSessions?: number
    missedSessions?: number
  } | null
  institutionName?: string
  institutionDomain?: string
  onIssued?: (warning: any) => void
}

export default function AttendanceWarningModal({
  isOpen,
  onClose,
  student,
  institutionName = "SkillArc Institute",
  institutionDomain = "skillarc.edu.au",
  onIssued,
}: AttendanceWarningModalProps) {
  const [warningLevel, setWarningLevel] = useState<"FIRST_WARNING" | "SECOND_WARNING" | "FINAL_BREACH_NOTICE">("FIRST_WARNING")
  const [meetingDate, setMeetingDate] = useState(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [issuedSuccess, setIssuedSuccess] = useState(false)

  if (!isOpen || !student) return null

  const attendanceRate = student.attendanceRate ?? 68
  const missedCount = student.missedSessions ?? 5
  const totalCount = student.totalSessions ?? 16

  const warningTitles = {
    FIRST_WARNING: "FIRST ATTENDANCE WARNING NOTICE (70% – 79%)",
    SECOND_WARNING: "SECOND FORMAL ATTENDANCE WARNING NOTICE (60% – 69%)",
    FINAL_BREACH_NOTICE: "FINAL ATTENDANCE BREACH NOTICE & INTENTION TO REPORT (< 60%)",
  }

  const warningClauses = {
    FIRST_WARNING:
      "This official notice is issued in accordance with the Academic Attendance Policy. Your attendance has dropped below the required 80% threshold. You are required to improve your attendance immediately to avoid escalating disciplinary proceedings.",
    SECOND_WARNING:
      "This is your Second Formal Attendance Warning. Continued failure to maintain satisfactory attendance is a serious breach of course enrolment requirements and regulatory standards (Standard 8 of the National Code / ASQA Standards). Immediate intervention is mandatory.",
    FINAL_BREACH_NOTICE:
      "URGENT: This is a Final Breach Notice and Notice of Intention to Report. Your recorded attendance is critically below minimum regulatory requirements. Failure to attend the scheduled intervention meeting will result in formal cancellation of your enrolment and reporting to government authorities.",
  }

  function handlePrint() {
    window.print()
  }

  async function handleIssueWarning() {
    setIsSaving(true)
    try {
      // Create warning letter record via API or callback
      const warningPayload = {
        student_id: student?.id,
        warning_level: warningLevel,
        attendance_percentage: attendanceRate,
        total_sessions: totalCount,
        missed_sessions: missedCount,
        intervention_date: meetingDate,
        notes: additionalNotes,
      }

      if (onIssued) {
        onIssued(warningPayload)
      }

      setIssuedSuccess(true)
      setTimeout(() => {
        setIssuedSuccess(false)
        onClose()
      }, 2000)
    } finally {
      setIsSaving(false)
    }
  }

  const todayStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-6 max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:rounded-none print:my-0 print:p-0">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Compliance Warning Notice</span>
              <h2 className="text-base font-extrabold text-slate-900">Attendance Warning Letter Generator</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="rounded-xl bg-slate-900 text-white text-xs font-bold px-3.5 py-2 shadow-sm hover:bg-slate-800 transition"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / PDF
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Configuration Bar (Hidden on Print) */}
        <div className="p-5 border-b border-slate-100 bg-amber-50/30 grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden shrink-0 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Warning Notice Level</label>
            <select
              value={warningLevel}
              onChange={(e) => setWarningLevel(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2 font-semibold text-slate-900 outline-none focus:border-amber-500"
            >
              <option value="FIRST_WARNING">1st Warning Notice (70-79%)</option>
              <option value="SECOND_WARNING">2nd Warning Notice (60-69%)</option>
              <option value="FINAL_BREACH_NOTICE">Final Breach & Cancellation Risk (&lt;60%)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mandatory Meeting Date</label>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2 font-semibold text-slate-900 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Intervention Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Medical cert required"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Printable Official Warning Notice Body */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible font-serif space-y-6 text-slate-900" id="printable-warning-letter">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-7 h-7 rounded-lg bg-[#6C63FF] text-white flex items-center justify-center font-extrabold text-sm font-sans">S</span>
                <span className="font-extrabold text-xl text-slate-900 tracking-tight font-sans">{institutionName}</span>
              </div>
              <p className="text-xs text-slate-500 font-sans">Academic Progress & Attendance Compliance Office</p>
              <p className="text-xs text-slate-400 font-sans">{institutionDomain}</p>
            </div>
            <div className="text-right font-sans text-xs space-y-0.5">
              <p className="font-bold text-slate-900">Date: {todayStr}</p>
              <p className="text-slate-500">Ref: WARN-{student.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center py-2">
            <h1 className="text-base font-extrabold uppercase tracking-wide text-rose-900 font-sans border border-rose-200 bg-rose-50/50 py-2 rounded-xl">
              {warningTitles[warningLevel]}
            </h1>
          </div>

          {/* Student Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-sans print:bg-white print:border-slate-300">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Student Name:</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{student.name}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Student ID / Reg:</span>
              <p className="font-bold text-slate-900 text-sm font-mono mt-0.5">
                {student.registration_number || student.email?.split("@")[0] || `STU-${student.id.slice(0, 6)}`}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Enrolled Qualification:</span>
              <p className="font-semibold text-slate-800 mt-0.5">{student.program_name || "Enrolled Course"}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Recorded Attendance Rate:</span>
              <p className="font-black text-rose-600 text-sm mt-0.5">
                {attendanceRate}% ({missedCount} absences out of {totalCount} sessions)
              </p>
            </div>
          </div>

          {/* Notice Body */}
          <div className="text-sm leading-relaxed space-y-3.5 text-slate-800">
            <p>Dear {student.name},</p>
            
            <p className="leading-relaxed">
              {warningClauses[warningLevel]}
            </p>

            <p className="leading-relaxed">
              Our academic monitoring records indicate that your overall attendance rate has reached <strong className="text-rose-700">{attendanceRate}%</strong>, which is below the mandatory minimum <strong>80% attendance requirement</strong>.
            </p>

            {/* Mandatory Action Box */}
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 text-xs font-sans space-y-1.5 print:bg-white print:border-amber-400">
              <p className="font-extrabold text-amber-900 uppercase tracking-wider">Required Mandatory Action:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Attend the mandatory Academic Intervention Meeting scheduled on <strong>{meetingDate}</strong> at the Student Support Desk.</li>
                <li>Provide verified medical certificates or documented evidence for any unexcused absences.</li>
                <li>Agree to and sign an Attendance Rectification Plan with the Academic Coordinator.</li>
              </ul>
            </div>

            {additionalNotes && (
              <p className="text-xs italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <strong>Officer Note:</strong> {additionalNotes}
              </p>
            )}

            <p className="leading-relaxed">
              If you are experiencing personal, academic, or health difficulties, please contact our Student Welfare support services immediately. We are committed to supporting you in completing your qualification successfully.
            </p>

            <p>Sincerely,</p>
          </div>

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 font-sans text-xs">
            <div>
              <div className="h-12 border-b border-slate-400 flex items-end pb-1 font-serif italic text-slate-500">
                Authorized Signature
              </div>
              <p className="font-bold text-slate-900 mt-1.5">Academic Registrar / Course Coordinator</p>
              <p className="text-[11px] text-slate-400">{institutionName}</p>
            </div>

            <div>
              <div className="h-12 border-b border-slate-400 flex items-end pb-1 text-slate-300">
                ___________________________
              </div>
              <p className="font-bold text-slate-900 mt-1.5">Student Acknowledgment Signature</p>
              <p className="text-[11px] text-slate-400">Date: ____ / ____ / ________</p>
            </div>
          </div>
        </div>

        {/* Footer Actions (Hidden on Print) */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between print:hidden shrink-0">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="rounded-xl text-xs font-bold"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Letter
            </Button>

            <Button
              disabled={isSaving}
              onClick={handleIssueWarning}
              className="rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 text-white text-xs font-bold shadow-md hover:opacity-95 transition"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {issuedSuccess ? "Warning Notice Issued!" : isSaving ? "Saving..." : "Log & Issue Warning Notice"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
