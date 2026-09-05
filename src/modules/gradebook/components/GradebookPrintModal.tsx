"use client"

import React, { useState, useMemo } from "react"
import { Printer, X, FileText, CheckSquare, Award, BarChart3, ChevronRight, ChevronLeft, SlidersHorizontal, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { printIsolatedElement } from "@/lib/print-document"

export interface GradebookColumnItem {
  id: string
  label: string
  max_score: number
  weight: number
}

interface GradebookPrintModalProps {
  isOpen: boolean
  onClose: () => void
  subjectName: string
  subjectCode: string
  sectionName: string
  facultyName?: string
  academicTerm?: string
  gradeWeightMode?: "percentage" | "marks"
  assignmentColumns: GradebookColumnItem[]
  customColumns: GradebookColumnItem[]
  students: Array<{
    id: string
    name: string
    email: string
    roll_number?: string
  }>
  assignmentGrades: Record<string, Record<string, any>>
  customGrades: Record<string, Record<string, string>>
}

function getLetterGrade(pct: number) {
  if (pct >= 90) return { grade: "A+", label: "Outstanding", color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
  if (pct >= 80) return { grade: "A", label: "Excellent", color: "text-green-700 bg-green-50 border-green-200" }
  if (pct >= 70) return { grade: "B", label: "Good", color: "text-blue-700 bg-blue-50 border-blue-200" }
  if (pct >= 60) return { grade: "C", label: "Satisfactory", color: "text-yellow-700 bg-yellow-50 border-yellow-200" }
  if (pct >= 50) return { grade: "D", label: "Pass", color: "text-orange-700 bg-orange-50 border-orange-200" }
  return { grade: "F", label: "Needs Improvement", color: "text-red-700 bg-red-50 border-red-200" }
}

export default function GradebookPrintModal({
  isOpen,
  onClose,
  subjectName,
  subjectCode,
  sectionName,
  facultyName = "Course Instructor",
  academicTerm = "Academic Session 2026",
  gradeWeightMode = "percentage",
  assignmentColumns = [],
  customColumns = [],
  students = [],
  assignmentGrades = {},
  customGrades = {},
}: GradebookPrintModalProps) {
  const [printMode, setPrintMode] = useState<"MARKED" | "BLANK">("MARKED")
  const [isColumnFilterOpen, setIsColumnFilterOpen] = useState(false)

  const allAvailableColumns = useMemo(() => [
    ...assignmentColumns.map((c) => ({ ...c, type: "Assignment" })),
    ...customColumns.map((c) => ({ ...c, type: "Evaluation" })),
  ], [assignmentColumns, customColumns])

  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(() =>
    allAvailableColumns.map((c) => c.id)
  )

  React.useEffect(() => {
    setSelectedColumnIds(allAvailableColumns.map((c) => c.id))
  }, [allAvailableColumns.length])

  if (!isOpen) return null

  const handlePrint = () => {
    printIsolatedElement("printable-gradebook-area", {
      title: `SkillArc_Marksheet_${subjectCode}_Section_${sectionName}`,
      orientation: "landscape",
      margin: "5mm 6mm",
      columnCount: visibleColumns.length,
    })
  }

  const toggleColumn = (colId: string) => {
    if (selectedColumnIds.includes(colId)) {
      if (selectedColumnIds.length > 1) {
        setSelectedColumnIds(selectedColumnIds.filter((id) => id !== colId))
      }
    } else {
      setSelectedColumnIds([...selectedColumnIds, colId])
    }
  }

  const selectAllColumns = () => {
    setSelectedColumnIds(allAvailableColumns.map((c) => c.id))
  }

  const visibleColumns = allAvailableColumns.filter((c) =>
    selectedColumnIds.includes(c.id)
  )

  // Compute student totals
  const studentTotals = students.map((student) => {
    const assignmentSum = assignmentColumns.reduce((sum, col) => {
      const grade = assignmentGrades[student.id]?.[col.id]
      if (grade == null || !Number.isFinite(Number(grade)) || col.max_score <= 0) return sum
      return sum + (Number(grade) / col.max_score) * col.weight
    }, 0)

    const customSum = customColumns.reduce((sum, col) => {
      const value = Number(customGrades[student.id]?.[col.id])
      if (!Number.isFinite(value)) return sum
      if (gradeWeightMode === "marks") {
        return sum + Math.min(value, col.weight)
      }
      return sum + (value * col.weight) / 100
    }, 0)

    const total = Number((assignmentSum + customSum).toFixed(1))
    return {
      studentId: student.id,
      total,
      letter: getLetterGrade(total),
    }
  })

  const totalsMap = new Map(studentTotals.map((t) => [t.studentId, t]))

  // Class analytics
  const scores = studentTotals.map((t) => t.total).filter((t) => t > 0)
  const averageScore = scores.length
    ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
    : 0
  const highestScore = scores.length ? Math.max(...scores) : 0
  const lowestScore = scores.length ? Math.min(...scores) : 0
  const passingCount = studentTotals.filter((t) => t.total >= 50).length
  const passRate = students.length ? Math.round((passingCount / students.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-y-auto">
      {/* Container - Ultra-wide for rich gradebook tables */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-[96vw] 2xl:max-w-[1550px] overflow-hidden my-4 max-h-[94vh] flex flex-col">
        {/* Modal Top Bar (Interactive Controls) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C63FF] bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                Academic Gradebook Export
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {visibleColumns.length} of {allAvailableColumns.length} Columns Visible • {students.length} Students
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
              Official Marksheet & Evaluation Register
            </h2>
          </div>

          {/* Mode Switcher, Column Filter & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mode Toggle */}
            <div className="flex rounded-xl bg-slate-200/80 p-1">
              <button
                type="button"
                onClick={() => setPrintMode("MARKED")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  printMode === "MARKED" ? "bg-white text-[#6C63FF] shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> Full Marksheet
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("BLANK")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  printMode === "BLANK" ? "bg-white text-[#6C63FF] shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" /> Blank Grading Form
              </button>
            </div>

            {/* Columns Filter Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsColumnFilterOpen(!isColumnFilterOpen)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
              >
                <SlidersHorizontal size={14} className="text-[#6C63FF]" />
                Columns ({visibleColumns.length}/{allAvailableColumns.length})
              </button>

              {/* Column Filter Dropdown */}
              {isColumnFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800">Select Columns to Print</span>
                    <button
                      type="button"
                      onClick={selectAllColumns}
                      className="text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {allAvailableColumns.map((col) => {
                      const isSelected = selectedColumnIds.includes(col.id)
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => toggleColumn(col.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition ${
                            isSelected ? "bg-indigo-50 text-indigo-900" : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate pr-2">{col.label}</span>
                          {isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Print Trigger */}
            <Button
              onClick={handlePrint}
              className="rounded-xl bg-slate-900 text-white text-xs font-bold px-4 py-2 shadow-sm hover:bg-slate-800 transition"
            >
              <Printer size={15} className="mr-1.5" /> Print / Save PDF
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Document Body - This is the exact section isolated into the print document */}
        <div className="p-6 sm:p-8 overflow-y-auto font-sans space-y-6 text-slate-900 bg-white" id="printable-gradebook-area">
          {/* Institution Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-lg bg-[#6C63FF] text-white flex items-center justify-center font-extrabold text-xs">S</span>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">SkillArc Academy</span>
              </div>
              <h1 className="text-xl font-bold text-slate-800">
                {printMode === "BLANK" ? "COURSE EVALUATION ROSTER (BLANK ENTRY SHEET)" : "OFFICIAL COURSE GRADEBOOK & MARKSHEET"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {printMode === "BLANK"
                  ? "Instructor Offline Assessment, Viva & Marking Form"
                  : "Certified Academic Performance & Final Assessment Record"}
              </p>
            </div>
            <div className="text-right text-xs space-y-1">
              <div className="font-bold text-slate-700 font-['Space_Grotesk']">
                Date: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
              </div>
              <div className="text-slate-500 text-[10px] uppercase font-mono">
                STATUS: {printMode === "BLANK" ? "BLANK FORM" : "FINALIZED MARKS"}
              </div>
            </div>
          </div>

          {/* Academic Context Details Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Subject & Code</span>
              <span className="font-bold text-slate-800">{subjectName} ({subjectCode})</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Class Section</span>
              <span className="font-bold text-slate-800">Section {sectionName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Faculty Instructor</span>
              <span className="font-bold text-slate-800">{facultyName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Academic Term / Mode</span>
              <span className="font-bold text-slate-800">{academicTerm} • {gradeWeightMode === "marks" ? "Marks" : "Percentage (%)"}</span>
            </div>
          </div>

          {/* KPI Analytics Strip (Only in Marked Mode) */}
          {printMode === "MARKED" && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Students</span>
                <p className="text-base font-black text-slate-800 font-['Space_Grotesk'] mt-0.5">{students.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class Average</span>
                <p className="text-base font-black text-indigo-600 font-['Space_Grotesk'] mt-0.5">{averageScore}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Highest Score</span>
                <p className="text-base font-black text-emerald-600 font-['Space_Grotesk'] mt-0.5">{highestScore}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lowest Score</span>
                <p className="text-base font-black text-amber-600 font-['Space_Grotesk'] mt-0.5">{lowestScore}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passing Rate</span>
                <p className="text-base font-black text-violet-600 font-['Space_Grotesk'] mt-0.5">{passRate}%</p>
              </div>
            </div>
          )}

          {/* Horizontal Scroll Hint for screen viewing */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1 print:hidden">
            <span className="font-semibold text-slate-600">
              Showing {visibleColumns.length} assessment columns • All {students.length} students
            </span>
            <span className="text-[#6C63FF] font-bold flex items-center gap-1 bg-indigo-50/80 px-3 py-1 rounded-lg border border-indigo-100">
              <ChevronLeft size={13} /> Scroll horizontally to inspect columns <ChevronRight size={13} />
            </span>
          </div>

          {/* Marksheet / Grading Table Container with Horizontal Scroll */}
          <div className="border border-slate-300 rounded-2xl overflow-x-auto shadow-sm bg-white">
            <table className="w-full min-w-max text-left border-collapse text-xs">
              <colgroup>
                <col style={{ width: "3.5%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "13%" }} />
                {visibleColumns.map((col) => (
                  <col key={col.id} style={{ width: `${59.5 / visibleColumns.length}%` }} />
                ))}
                <col style={{ width: "5%" }} />
                <col style={{ width: "4%" }} />
              </colgroup>
              <thead className="bg-slate-100 border-b-2 border-slate-300">
                <tr className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 border-r border-slate-200 w-10 text-center shrink-0">#</th>
                  <th className="py-2.5 px-4 border-r border-slate-200 min-w-[140px] shrink-0">Student Name</th>
                  <th className="py-2.5 px-4 border-r border-slate-200 min-w-[130px] shrink-0">Roll / Email</th>

                  {/* Dynamic Assessment Columns */}
                  {visibleColumns.map((col) => (
                    <th key={col.id} className="py-2.5 px-2.5 border-r border-slate-200 text-center min-w-[95px] max-w-[140px]">
                      <div className="grade-col-header font-extrabold text-slate-900 text-[11px] leading-snug whitespace-normal break-words" title={col.label}>
                        {col.label}
                      </div>
                      <div className="text-[9px] text-slate-500 font-semibold lowercase mt-0.5">
                        max {col.max_score} • {col.weight}{gradeWeightMode === "marks" ? "m" : "%"}
                      </div>
                    </th>
                  ))}

                  {/* Calculated Totals */}
                  <th className="py-2.5 px-3 border-r border-slate-200 text-center font-extrabold text-slate-900 min-w-[90px] bg-slate-150/70">
                    {printMode === "BLANK" ? "Total Score" : `Total (${gradeWeightMode === "marks" ? "Marks" : "%"})`}
                  </th>
                  <th className="py-2.5 px-2.5 text-center font-extrabold text-slate-900 min-w-[70px] bg-slate-150/70">
                    {printMode === "BLANK" ? "Grade" : "Grade"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5 + visibleColumns.length} className="p-8 text-center text-slate-400">
                      No students enrolled in this section.
                    </td>
                  </tr>
                ) : (
                  students.map((student, idx) => {
                    const studentStat = totalsMap.get(student.id)
                    const totalVal = studentStat ? studentStat.total : 0
                    const letterGrade = studentStat ? studentStat.letter : getLetterGrade(0)

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-mono text-[10px] text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-4 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                          {student.name}
                        </td>
                        <td className="py-2 px-4 border-r border-slate-200 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                          {student.roll_number || student.email}
                        </td>

                        {/* Visible Assessment Columns */}
                        {visibleColumns.map((col) => {
                          const val = col.type === "Assignment"
                            ? assignmentGrades[student.id]?.[col.id]
                            : customGrades[student.id]?.[col.id]

                          return (
                            <td key={col.id} className="py-2 px-2 border-r border-slate-200 text-center font-['Space_Grotesk'] font-bold text-slate-700">
                              {printMode === "BLANK" ? "" : val != null && val !== "" ? val : "-"}
                            </td>
                          )
                        })}

                        {/* Total */}
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-black font-['Space_Grotesk'] text-slate-900 bg-slate-50/50">
                          {printMode === "BLANK" ? "" : `${totalVal}${gradeWeightMode === "percentage" ? "%" : ""}`}
                        </td>

                        {/* Letter Grade */}
                        <td className="py-2 px-2 text-center bg-slate-50/50">
                          {printMode === "BLANK" ? (
                            <div className="h-4"></div>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border ${letterGrade.color}`}>
                              {letterGrade.grade}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Grade Distribution & Boundaries (Only in Marked Mode) */}
          {printMode === "MARKED" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <span className="font-bold text-slate-700 block mb-2 text-[11px] uppercase tracking-wider">
                  Grading Scale & Performance Brackets
                </span>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                    <span className="font-black text-emerald-700">A+ (90-100%)</span>
                    <span className="font-mono font-bold text-slate-600">{studentTotals.filter((t) => t.total >= 90).length}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                    <span className="font-black text-green-700">A (80-89%)</span>
                    <span className="font-mono font-bold text-slate-600">{studentTotals.filter((t) => t.total >= 80 && t.total < 90).length}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                    <span className="font-black text-blue-700">B (70-79%)</span>
                    <span className="font-mono font-bold text-slate-600">{studentTotals.filter((t) => t.total >= 70 && t.total < 80).length}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                    <span className="font-black text-yellow-700">C (60-69%)</span>
                    <span className="font-mono font-bold text-slate-600">{studentTotals.filter((t) => t.total >= 60 && t.total < 70).length}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                    <span className="font-black text-orange-700">D (50-59%)</span>
                    <span className="font-mono font-bold text-slate-600">{studentTotals.filter((t) => t.total >= 50 && t.total < 60).length}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                    <span className="font-black text-red-700">F (&lt;50%)</span>
                    <span className="font-mono font-bold text-slate-600">{studentTotals.filter((t) => t.total < 50).length}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-slate-700 block mb-1 text-[11px] uppercase tracking-wider">
                    Official Certification
                  </span>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    This document certifies the evaluation results for {subjectName} ({subjectCode}), Section {sectionName}. All assessment scores and weighted averages have been verified for compliance.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-200">
                  <span>Generated by SkillArc Academic Management System</span>
                  <span className="font-mono">ID: SEC-{sectionName}-GRD</span>
                </div>
              </div>
            </div>
          )}

          {/* Academic Signature Authorization Block */}
          <div className="grid grid-cols-3 gap-8 pt-6 text-center text-xs mt-4 border-t border-slate-200">
            <div>
              <div className="border-b border-slate-400 h-8 w-4/5 mx-auto mb-1.5"></div>
              <span className="font-bold text-slate-700 block">{facultyName}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Course Instructor</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-8 w-4/5 mx-auto mb-1.5"></div>
              <span className="font-bold text-slate-700 block">Department Head / HOD</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Academic Department</span>
            </div>
            <div>
              <div className="border-b border-slate-400 h-8 w-4/5 mx-auto mb-1.5"></div>
              <span className="font-bold text-slate-700 block">Office of Controller of Exams</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Official Stamp & Date</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
