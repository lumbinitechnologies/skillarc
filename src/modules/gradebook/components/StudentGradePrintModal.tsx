"use client"

import React from "react"
import { Printer, X, Award, CheckCircle2, ClipboardList, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { printIsolatedElement } from "@/lib/print-document"

interface StudentGradePrintModalProps {
  isOpen: boolean
  onClose: () => void
  studentName: string
  studentEmail?: string
  subjectName: string
  subjectCode: string
  instructorName?: string
  academicTerm?: string
  gradeColumns: Array<{
    id: string
    title: string
    type?: string
    max_score?: number
    weight?: number
  }>
  gradeValueMap: Record<string, string | number | null | undefined>
  gradeEntries: Array<{
    column_id: string
    score?: number | null
    feedback?: string | null
  }>
  gradeSummary: {
    average: number
    gradedCount: number
    totalColumns: number
  }
}

function getGradeBadge(pct: number) {
  if (pct >= 90) return { label: "A+", title: "Outstanding", color: "text-emerald-700 bg-emerald-50 border-emerald-300" }
  if (pct >= 80) return { label: "A", title: "Excellent", color: "text-green-700 bg-green-50 border-green-300" }
  if (pct >= 70) return { label: "B", title: "Good", color: "text-blue-700 bg-blue-50 border-blue-300" }
  if (pct >= 60) return { label: "C", title: "Satisfactory", color: "text-yellow-700 bg-yellow-50 border-yellow-300" }
  if (pct >= 50) return { label: "D", title: "Pass", color: "text-orange-700 bg-orange-50 border-orange-300" }
  return { label: "F", title: "Needs Improvement", color: "text-red-700 bg-red-50 border-red-300" }
}

export default function StudentGradePrintModal({
  isOpen,
  onClose,
  studentName,
  studentEmail = "",
  subjectName,
  subjectCode,
  instructorName = "Course Faculty",
  academicTerm = "Academic Term 2026",
  gradeColumns = [],
  gradeValueMap = {},
  gradeEntries = [],
  gradeSummary,
}: StudentGradePrintModalProps) {
  if (!isOpen) return null

  const handlePrint = () => {
    printIsolatedElement("printable-student-grade-area", {
      title: `SkillArc_Marksheet_${subjectCode}_${studentName}`,
      orientation: "landscape",
      margin: "6mm 8mm",
    })
  }

  const overallGrade = getGradeBadge(gradeSummary.average)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:static print:bg-white print:p-0 print:m-0 print:overflow-visible print:block">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-[96vw] xl:max-w-5xl overflow-hidden my-6 max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:rounded-none print:my-0 print:p-0 print:w-full print:max-w-none">
        {/* Top bar (hidden in print) */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70 print:hidden shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C63FF]">Academic Transcript Export</span>
            <h2 className="text-base font-extrabold text-slate-900">Student Statement of Marks</h2>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Printable Area */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible font-sans space-y-6 text-slate-900" id="printable-student-grade-area">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-lg bg-[#6C63FF] text-white flex items-center justify-center font-extrabold text-xs">S</span>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">SkillArc Academy</span>
              </div>
              <h1 className="text-xl font-bold text-slate-800">OFFICIAL STATEMENT OF MARKS</h1>
              <p className="text-xs text-slate-500 mt-0.5">Individual Course Assessment & Academic Evaluation Record</p>
            </div>
            <div className="text-right text-xs space-y-1">
              <div className="font-bold text-slate-700 font-['Space_Grotesk']">
                Date: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
              </div>
              <div className="text-emerald-700 font-bold text-[10px] uppercase font-mono">STATUS: CERTIFIED RECORD</div>
            </div>
          </div>

          {/* Student & Course Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Student Name</span>
              <span className="font-bold text-slate-900 text-sm">{studentName}</span>
              {studentEmail && <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{studentEmail}</span>}
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Subject & Code</span>
              <span className="font-bold text-slate-900">{subjectName}</span>
              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{subjectCode}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Instructor</span>
              <span className="font-bold text-slate-800">{instructorName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Term / Period</span>
              <span className="font-bold text-slate-800">{academicTerm}</span>
            </div>
          </div>

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weighted Average</span>
              <p className="text-xl font-black text-indigo-600 font-['Space_Grotesk'] mt-0.5">{gradeSummary.average}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Final Grade</span>
              <div className="mt-1">
                <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-black border ${overallGrade.color}`}>
                  Grade {overallGrade.label}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed Assessments</span>
              <p className="text-xl font-black text-slate-800 font-['Space_Grotesk'] mt-0.5">
                {gradeSummary.gradedCount} / {gradeSummary.totalColumns}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Result Status</span>
              <p className={`text-base font-black font-['Space_Grotesk'] mt-1 ${gradeSummary.average >= 50 ? "text-emerald-600" : "text-red-600"}`}>
                {gradeSummary.average >= 50 ? "PASSED" : "NEEDS RETAKE"}
              </p>
            </div>
          </div>

          {/* Assessments Mark Breakdown Table */}
          <div className="border border-slate-300 rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 border-b-2 border-slate-300">
                <tr className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 border-r border-slate-200 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Assessment / Component</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-center">Type</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-20 text-center">Max Score</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-20 text-center">Weight</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-center">Score Obtained</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-20 text-center">Percentage</th>
                  <th className="py-2.5 px-3">Instructor Feedback / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {gradeColumns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No grade columns found for this subject.
                    </td>
                  </tr>
                ) : (
                  gradeColumns.map((col, idx) => {
                    const rawScore = gradeValueMap[col.id]
                    const numericScore = rawScore != null && rawScore !== "" ? Number(rawScore) : null
                    const maxScore = Number(col.max_score ?? 100)
                    const percent = numericScore != null && maxScore > 0 ? Math.round((numericScore / maxScore) * 100) : null
                    const feedback = gradeEntries.find((e) => e.column_id === col.id)?.feedback

                    return (
                      <tr key={col.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono text-[10px] text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-800">
                          {col.title}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                          {col.type || "Assessment"}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center font-['Space_Grotesk'] font-semibold text-slate-700">
                          {maxScore}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center font-['Space_Grotesk'] font-semibold text-slate-700">
                          {Number(col.weight ?? 0)}%
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center font-black font-['Space_Grotesk'] text-slate-900">
                          {numericScore == null ? <span className="text-slate-400 font-normal">Pending</span> : numericScore}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold font-['Space_Grotesk'] text-indigo-600">
                          {percent != null ? `${percent}%` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {feedback || <span className="text-slate-400 italic">No notes</span>}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Academic Signature Authorization Block */}
          <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs mt-6 border-t border-slate-200">
            <div>
              <div className="border-b border-slate-400 h-10 w-3/5 mx-auto mb-2"></div>
              <span className="font-bold text-slate-700 block">{instructorName}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Instructor in Charge</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-10 w-3/5 mx-auto mb-2"></div>
              <span className="font-bold text-slate-700 block">Registrar & Examinations</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Authorized Academic Seal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
