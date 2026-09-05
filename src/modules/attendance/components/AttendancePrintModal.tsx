"use client"

import React, { useState } from "react"
import { Printer, X, Download, CheckCircle2, XCircle, Clock, FileText, CheckSquare, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { printIsolatedElement } from "@/lib/print-document"

interface AttendancePrintModalProps {
  isOpen: boolean
  onClose: () => void
  programName?: string
  semesterName?: string
  sectionName?: string
  subjectName?: string
  periodName?: string
  date: string
  students: any[]
  attendance: Record<string, string>
  notes?: Record<string, string>
  sessionNotes?: string
  trainerName?: string
}

export default function AttendancePrintModal({
  isOpen,
  onClose,
  programName = "All Programs",
  semesterName = "All Semesters",
  sectionName = "All Sections",
  subjectName = "General Subject",
  periodName = "Period 1",
  date,
  students,
  attendance,
  notes = {},
  sessionNotes = "",
  trainerName = "Faculty Trainer",
}: AttendancePrintModalProps) {
  const [printMode, setPrintMode] = useState<"MARKED" | "BLANK">("MARKED")

  if (!isOpen) return null

  const handlePrint = () => {
    printIsolatedElement("printable-attendance-area", {
      title: `SkillArc_Attendance_${subjectName}_${sectionName}_${date}`,
      orientation: "landscape",
      margin: "6mm 8mm",
    })
  }

  const presentCount = students.filter((s) => attendance[s.id] === "Present").length
  const absentCount = students.filter((s) => attendance[s.id] === "Absent").length
  const lateCount = students.filter((s) => attendance[s.id] === "Late").length
  const approvedAbsenceCount = students.filter((s) => attendance[s.id] === "Approved Absence").length
  const unmarkedCount = students.length - (presentCount + absentCount + lateCount + approvedAbsenceCount)
  const attendanceRate = students.length
    ? Math.round(((presentCount + lateCount + approvedAbsenceCount) / students.length) * 100)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:static print:bg-white print:p-0 print:m-0 print:overflow-visible print:block">
      {/* Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden my-6 max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:rounded-none print:my-0 print:p-0 print:w-full print:max-w-none">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 print:hidden shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C63FF]">Attendance Register Export</span>
            <h2 className="text-base font-extrabold text-slate-900">Printable Attendance Sheet & Roll</h2>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-slate-200/80 p-1">
              <button
                type="button"
                onClick={() => setPrintMode("MARKED")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  printMode === "MARKED" ? "bg-white text-[#6C63FF] shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> Marked Session
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("BLANK")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  printMode === "BLANK" ? "bg-white text-[#6C63FF] shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" /> Blank Roll Sheet
              </button>
            </div>

            <Button
              onClick={handlePrint}
              className="rounded-xl bg-slate-900 text-white text-xs font-bold px-4 py-2 shadow-sm hover:bg-slate-800 transition"
            >
              <Printer size={15} className="mr-1.5" /> Print / PDF
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible font-sans space-y-6 text-slate-900" id="printable-attendance-area">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-lg bg-[#6C63FF] text-white flex items-center justify-center font-extrabold text-xs">S</span>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">SkillArc Academy</span>
              </div>
              <h1 className="text-xl font-bold text-slate-800">
                {printMode === "BLANK" ? "CLASSROOM ATTENDANCE ROLL SHEET (BLANK)" : "OFFICIAL CLASS ATTENDANCE REGISTER"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {printMode === "BLANK" ? "Manual Physical Attendance Taking & Audit Form" : "Academic Session Audit & Compliance Record"}
              </p>
            </div>
            <div className="text-right text-xs space-y-1">
              <div className="font-semibold text-slate-800">Date: <span className="font-mono text-slate-900 font-bold">{date}</span></div>
              <div className="text-slate-500">Period / Slot: <span className="font-medium text-slate-700">{periodName}</span></div>
              <div className="text-slate-500">Trainer: <span className="font-medium text-slate-700">{trainerName}</span></div>
            </div>
          </div>

          {/* Session Metadata Grid */}
          <div className="grid grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs print:bg-white print:border-slate-300">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Program</div>
              <div className="font-bold text-slate-800 mt-0.5">{programName}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Semester & Section</div>
              <div className="font-bold text-slate-800 mt-0.5">Sem {semesterName} - Section {sectionName}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Subject</div>
              <div className="font-bold text-slate-800 mt-0.5">{subjectName}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">
                {printMode === "BLANK" ? "Total Enrolled" : "Attendance Rate"}
              </div>
              <div className="font-black text-[#6C63FF] text-sm mt-0.5">
                {printMode === "BLANK" ? `${students.length} Students` : `${attendanceRate}%`}
              </div>
            </div>
          </div>

          {/* Attendance Roster Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-slate-300">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 print:bg-slate-200">
                  <th className="p-3 w-10 text-center border-r border-slate-200">#</th>
                  <th className="p-3 w-32 border-r border-slate-200">Reg. No / ID</th>
                  <th className="p-3 border-r border-slate-200">Student Name</th>
                  {printMode === "BLANK" ? (
                    <>
                      <th className="p-3 w-28 text-center border-r border-slate-200">Present [ P ]</th>
                      <th className="p-3 w-28 text-center border-r border-slate-200">Absent [ A ]</th>
                      <th className="p-3 w-36 text-center">Student Signature / Notes</th>
                    </>
                  ) : (
                    <>
                      <th className="p-3 w-32 text-center border-r border-slate-200">Status</th>
                      <th className="p-3 border-r border-slate-200">Notes & Exceptions</th>
                      <th className="p-3 w-32 text-center">Verification</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((student, idx) => {
                  const status = attendance[student.id] || "Unmarked"
                  const note = notes[student.id] || "—"

                  return (
                    <tr key={student.id} className="print:break-inside-avoid">
                      <td className="p-3 text-center font-mono font-medium text-slate-500 border-r border-slate-200">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-700 border-r border-slate-200">
                        {student.registration_number || student.email?.split("@")[0] || `STU-${student.id.slice(0, 6)}`}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 border-r border-slate-200">{student.name}</td>

                      {printMode === "BLANK" ? (
                        <>
                          <td className="p-3 text-center border-r border-slate-200">
                            <div className="h-5 w-5 border-2 border-slate-400 rounded mx-auto" />
                          </td>
                          <td className="p-3 text-center border-r border-slate-200">
                            <div className="h-5 w-5 border-2 border-slate-400 rounded mx-auto" />
                          </td>
                          <td className="p-3 text-center text-slate-300">
                            ____________________
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-center border-r border-slate-200">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                status === "Present"
                                  ? "bg-emerald-100 text-emerald-800 print:border print:border-emerald-500"
                                  : status === "Absent"
                                  ? "bg-rose-100 text-rose-800 print:border print:border-rose-500"
                                  : status === "Late"
                                  ? "bg-amber-100 text-amber-800 print:border print:border-amber-500"
                                  : status === "Approved Absence"
                                  ? "bg-blue-100 text-blue-800 print:border print:border-blue-500"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-200 text-slate-600 italic">
                            {note}
                          </td>
                          <td className="p-3 text-center text-slate-400 font-mono text-[10px]">
                            Verified
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {sessionNotes && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">Class Session Notes: </span>
              <span className="text-slate-600 italic">{sessionNotes}</span>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-sans">
            <div>
              <div className="h-10 border-b border-slate-400 flex items-end pb-1 italic text-slate-400">
                Signature of Conducting Faculty Trainer
              </div>
              <p className="font-bold text-slate-900 mt-1">Faculty Trainer Signature</p>
              <p className="text-[10px] text-slate-400">Date: ____ / ____ / ________</p>
            </div>

            <div>
              <div className="h-10 border-b border-slate-400 flex items-end pb-1 italic text-slate-400">
                Head of Department / Attendance Coordinator
              </div>
              <p className="font-bold text-slate-900 mt-1">Audited By (HoD / Admin)</p>
              <p className="text-[10px] text-slate-400">Date: ____ / ____ / ________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
