"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Award,
  TrendingUp,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  ArrowLeft,
  Calendar
} from "lucide-react"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Cell
} from "recharts"

interface StudentReportCardClientProps {
  studentName: string
  subjects: Array<{
    id: string
    name: string
    code: string
  }>
  assignments: Array<any>
  submissions: Array<any>
  gradeColumns?: Array<any>
  gradeEntries?: Array<any>
}

const CLASS_COLORS = ["#4f46e5", "#0d9488", "#e11d48", "#d97706", "#7c3aed"]

function getGrade(pct: number) {
  if (pct >= 90) return { label: "A+", color: "text-emerald-600 bg-emerald-50 border-emerald-200" }
  if (pct >= 80) return { label: "A", color: "text-green-600 bg-green-50 border-green-200" }
  if (pct >= 70) return { label: "B", color: "text-blue-600 bg-blue-50 border-blue-200" }
  if (pct >= 60) return { label: "C", color: "text-yellow-600 bg-yellow-50 border-yellow-200" }
  if (pct >= 50) return { label: "D", color: "text-orange-600 bg-orange-50 border-orange-200" }
  return { label: "F", color: "text-red-600 bg-red-50 border-red-200" }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3 text-left">
        <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="text-sm font-bold text-slate-800">
            {p.name}: {p.value}{p.name === "Performance" ? "%" : " pts"}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function StudentReportCardClient({
  studentName,
  subjects,
  assignments,
  submissions,
  gradeColumns = [],
  gradeEntries = [],
}: StudentReportCardClientProps) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(subjects[0]?.id || null)

  // Build report stats per subject
  const subjectReports = subjects.map((subj, idx) => {
    const subjectAssignments = assignments.filter(a => a.subject_id === subj.id)
    const mySubmissions = submissions.filter(s =>
      subjectAssignments.some(a => a.id === s.assignment_id) &&
      s.status === "graded" &&
      s.grade !== null
    )

    const subjectGradeColumns = (gradeColumns || []).filter((column: any) => column.subject_id === subj.id)
    const subjectGradeEntries = (gradeEntries || []).filter((entry: any) =>
      subjectGradeColumns.some((column: any) => column.id === entry.column_id)
    )

    const gradedItems = mySubmissions
      .map(sub => {
        const assignment = subjectAssignments.find(a => a.id === sub.assignment_id)
        if (!assignment) return null
        const rawTitle = assignment.title || "Assignment"
        const maxScore = Number(assignment.max_score || 100)
        const pct = maxScore > 0 ? Math.round((Number(sub.grade || 0) / maxScore) * 100) : 0
        return {
          id: sub.assignment_id,
          title: rawTitle.length > 20 ? rawTitle.substring(0, 20) + "…" : rawTitle,
          fullTitle: rawTitle,
          type: assignment.type || "Assignment",
          score: Number(sub.grade || 0),
          maxScore,
          pct,
          feedback: sub.feedback,
          submittedAt: sub.submitted_at,
        }
      })
      .filter(Boolean) as Array<any>

    const customGradedItems = subjectGradeColumns
      .map((column: any) => {
        const entry = subjectGradeEntries.find((item: any) => item.column_id === column.id)
        if (entry?.score == null || entry?.score === "") return null
        const score = Number(entry.score)
        const maxScore = Number(column.max_score ?? 100)
        const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : null

        return {
          id: column.id,
          title: column.title || "Assessment",
          fullTitle: column.title || "Assessment",
          type: column.type || "Custom",
          score,
          maxScore,
          pct,
          feedback: entry?.feedback ?? null,
          submittedAt: entry?.graded_at ?? null,
        }
      })
      .filter(Boolean) as Array<any>

    const allItems = [...gradedItems, ...customGradedItems]

    const totalScored = allItems.reduce((sum, item) => sum + (Number(item.score) || 0), 0)
    const totalMax = allItems.reduce((sum, item) => sum + (Number(item.maxScore) || 100), 0)

    const overallPct = totalMax > 0 ? Math.round((totalScored / totalMax) * 100) : null
    const pendingCount = subjectAssignments.filter(a => !submissions.some(s => s.assignment_id === a.id)).length

    return {
      subject: subj,
      color: CLASS_COLORS[idx % CLASS_COLORS.length],
      graded: allItems,
      overallPct,
      pending: pendingCount,
      totalAssignments: subjectAssignments.length + subjectGradeColumns.length,
      submitted: allItems.length,
    }
  })

  // Global calculations
  const allGraded = subjectReports.flatMap(r => r.graded)
  const overallScored = allGraded.reduce((sum, g) => sum + g.score, 0)
  const overallMax = allGraded.reduce((sum, g) => sum + g.maxScore, 0)
  const overallPct = overallMax > 0 ? Math.round((overallScored / overallMax) * 100) : 0

  const radarData = subjectReports.map(r => ({
    subject: r.subject?.code || r.subject?.name || "Course",
    Performance: r.overallPct || 0,
  }))

  const summaryBar = subjectReports.map(r => {
    const sName = r.subject?.name || "Course"
    return {
      id: r.subject?.id || "course",
      name: sName.length > 15 ? sName.substring(0, 15) + "..." : sName,
      Performance: r.overallPct || 0,
      fill: r.color,
    }
  })

  const TYPE_COLORS = {
    Assignment: "#10b981",
    Quiz: "#8b5cf6",
    "Coding Assignment": "#3b82f6",
  } as any

  return (
    <div className="max-w-5xl w-full mx-auto p-8 space-y-8 font-sans text-left">
      {/* Back button */}
      <div>
        <Link href="/dashboard/student/subjects" className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-sm font-semibold mb-3 transition-colors">
          <ArrowLeft size={16} /> Back to subjects
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="w-7 h-7 text-indigo-600" />
          My Grades
        </h1>
        <p className="text-gray-500 mt-1 text-sm font-medium">Track your academic progress across all enrolled subjects.</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-black text-indigo-600 mb-1">{overallPct}%</div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Overall Score</div>
          <div className={`mt-2.5 px-3 py-0.5 rounded-full text-xs font-black border ${getGrade(overallPct).color}`}>
            Grade {getGrade(overallPct).label}
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-black text-emerald-600 mb-1">{allGraded.length}</div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Graded Tasks</div>
          <div className="mt-2 text-emerald-600 flex items-center gap-1 text-xs font-semibold">
            <CheckCircle size={14} /> Evaluated
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-black text-amber-500 mb-1">
            {subjectReports.reduce((s, r) => s + r.pending, 0)}
          </div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pending Tasks</div>
          <div className="mt-2 text-amber-500 flex items-center gap-1 text-xs font-semibold">
            <Clock size={14} /> To Complete
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-black text-violet-600 mb-1">{subjects.length}</div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Enrolled Courses</div>
          <div className="mt-2 text-violet-600 flex items-center gap-1 text-xs font-semibold">
            <BookOpen size={14} /> Subjects
          </div>
        </div>
      </div>

      {/* Recharts analysis */}
      {allGraded.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">Subject Performance Summary</h3>
            </div>
            <div className="w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryBar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Performance" radius={[6, 6, 0, 0]}>
                    {summaryBar.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">Subject Radar Analysis</h3>
            </div>
            <div className="w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Radar name="Performance" dataKey="Performance" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} dot={{ fill: "#4f46e5", r: 3 }} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Accordion List */}
      <div className="space-y-4">
        {subjectReports.map((report) => {
          const isExpanded = expandedSubject === report.subject.id
          const grade = report.overallPct !== null ? getGrade(report.overallPct) : null

          return (
            <div key={report.subject.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpandedSubject(isExpanded ? null : report.subject.id)}
              >
                <div className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50 transition-colors">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: report.color + "18" }}>
                    <BookOpen className="w-6 h-6" style={{ color: report.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-800 text-sm truncate">{report.subject.name}</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">{report.subject.code}</p>
                  </div>

                  <div className="hidden sm:flex items-center gap-6 mr-4 text-center">
                    <div>
                      <div className="text-xs font-bold text-slate-700">{report.submitted}/{report.totalAssignments}</div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Submitted</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-orange-600">{report.pending}</div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Pending</div>
                    </div>
                    <div>
                      {report.overallPct !== null ? (
                        <>
                          <div className="text-xs font-bold" style={{ color: report.color }}>{report.overallPct}%</div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Score</div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-bold text-slate-400">—</div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">No grades</div>
                        </>
                      )}
                    </div>
                  </div>

                  {grade && (
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${grade.color}`}>
                      {grade.label}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                  {report.graded.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-300" />
                      No graded submissions yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="px-4 py-3">Task Name</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3 text-center">Score</th>
                            <th className="px-4 py-3 text-center">Percentage</th>
                            <th className="px-4 py-3 text-center">Grade</th>
                            <th className="px-4 py-3">Feedback Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {report.graded.map((g, gi) => {
                            const pctValue = g.pct ?? 0
                            const gradeMeta = getGrade(pctValue)
                            return (
                              <tr key={gi} className="hover:bg-slate-50/40 transition-colors">
                                <td className="px-4 py-3 font-bold text-slate-800 max-w-[200px] truncate" title={g.fullTitle}>
                                  {g.fullTitle}
                                </td>
                                <td className="px-4 py-3 font-bold text-[10px] text-slate-400 uppercase">{g.type}</td>
                                <td className="px-4 py-3 text-center font-bold text-slate-800">{g.score}/{g.maxScore}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-16 bg-slate-100 rounded-full h-1">
                                      <div className="h-1 rounded-full" style={{ width: `${pctValue}%`, backgroundColor: report.color }} />
                                    </div>
                                    <span className="font-bold text-slate-600">{pctValue}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-lg font-black border ${gradeMeta.color}`}>
                                    {gradeMeta.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[11px] text-slate-500 max-w-[200px] truncate" title={g.feedback || ""}>
                                  {g.feedback || <span className="italic text-slate-300">No remarks</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
