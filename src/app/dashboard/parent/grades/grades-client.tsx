"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Award, ChevronDown, TrendingUp } from "lucide-react"
import { PageShell, PageHeader, itemVariants } from "@/components/ui/page-shell"

interface GradeRecord {
  assignmentTitle: string
  subjectName: string
  subjectCode: string
  maxMarks: number | null
  grade: number | null
  feedback: string | null
  submittedAt: string | null
  percentage: number | null
}

interface SubjectSummary {
  name: string
  code: string
  grades: GradeRecord[]
  avg: number | null
}

interface ChildWithGrades {
  id: string
  name: string
  relationship: string
  programName: string
  semester: number | null
  records: GradeRecord[]
  subjectSummaries: SubjectSummary[]
  cgpa: string | null
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 18 } } }

function gradeColor(pct: number | null) {
  if (pct === null) return "text-slate-400"
  if (pct >= 85) return "text-emerald-600"
  if (pct >= 60) return "text-amber-500"
  return "text-red-500"
}
function gradeBg(pct: number | null) {
  if (pct === null) return "bg-slate-50"
  if (pct >= 85) return "bg-emerald-50"
  if (pct >= 60) return "bg-amber-50"
  return "bg-red-50"
}
function gradeBar(pct: number | null) {
  if (pct === null) return "bg-slate-200"
  if (pct >= 85) return "bg-emerald-500"
  if (pct >= 60) return "bg-amber-400"
  return "bg-red-500"
}

function gradeLetter(pct: number | null): string {
  if (pct === null) return "—"
  if (pct >= 90) return "A+"
  if (pct >= 80) return "A"
  if (pct >= 70) return "B"
  if (pct >= 60) return "C"
  if (pct >= 50) return "D"
  return "F"
}

export default function ParentGradesClient({
  parentName,
  children,
}: {
  parentName: string
  children: ChildWithGrades[]
}) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)

  const child = children[selectedIdx] ?? null

  return (
    <PageShell>
      <PageHeader
        icon={<Award className="h-5 w-5" />}
        eyebrow="Parent Portal"
        title="Grades & Report"
        subtitle="View grades and performance across all subjects."
        actions={
          children.length > 1 ? (
            <select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[var(--primary)] transition"
            >
              {children.map((c, i) => <option key={c.id} value={i}>{c.name}</option>)}
            </select>
          ) : undefined
        }
      />

      {!child ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <Award className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No student linked yet.</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={child.id} variants={container} initial="hidden" animate="show" className="space-y-5">
            {/* Student bar */}
            <motion.div variants={item} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-3.5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-black text-sm">{child.name.charAt(0)}</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{child.name}</p>
                <p className="text-[11px] text-slate-400">{child.relationship} · {child.programName} · Sem {child.semester ?? "—"}</p>
              </div>
              {child.cgpa && (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--primary)]/8 border border-[var(--primary)]/15 px-4 py-2">
                  <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">Avg Score</p>
                    <p className="text-lg font-black text-slate-900 font-['Space_Grotesk'] leading-none">{child.cgpa}%</p>
                  </div>
                </div>
              )}
            </motion.div>

            {child.records.length === 0 ? (
              <motion.div variants={item} className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
                <Award className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-500">No graded assignments yet.</p>
              </motion.div>
            ) : (
              <motion.div variants={item} className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-50">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Performance</p>
                  <h2 className="mt-0.5 text-base font-bold text-slate-900">Subject-wise Grades</h2>
                </div>

                <div className="divide-y divide-slate-50">
                  {child.subjectSummaries.map((sub) => {
                    const isOpen = expandedSubject === sub.name
                    return (
                      <div key={sub.name}>
                        <button onClick={() => setExpandedSubject(isOpen ? null : sub.name)} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50/40 text-left transition-colors">
                          <div className="h-8 w-1 rounded-full shrink-0" style={{ background: (sub.avg ?? 0) >= 85 ? "#10B981" : (sub.avg ?? 0) >= 60 ? "#EAAD62" : "#F04438" }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{sub.name}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{sub.code} · {sub.grades.length} assignment{sub.grades.length !== 1 ? "s" : ""} graded</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {sub.avg !== null && (
                                  <>
                                    <span className={`text-xl font-black font-['Space_Grotesk'] ${gradeColor(sub.avg)}`}>{sub.avg}%</span>
                                    <span className={`rounded-lg px-2 py-1 text-sm font-black ${gradeBg(sub.avg)} ${gradeColor(sub.avg)}`}>{gradeLetter(sub.avg)}</span>
                                  </>
                                )}
                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                              </div>
                            </div>
                            {sub.avg !== null && (
                              <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                                <div className={`h-1.5 rounded-full ${gradeBar(sub.avg)} transition-all duration-700`} style={{ width: `${sub.avg}%` }} />
                              </div>
                            )}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-50">
                              <div className="divide-y divide-slate-50/70 bg-slate-50/40">
                                {sub.grades.map((g, i) => (
                                  <div key={i} className="px-8 py-3 flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-slate-800 truncate">{g.assignmentTitle}</p>
                                      {g.feedback && <p className="text-[11px] text-slate-400 mt-0.5 truncate">Feedback: {g.feedback}</p>}
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      {g.maxMarks !== null && g.grade !== null && (
                                        <span className="text-sm font-bold text-slate-700 font-['Space_Grotesk']">{g.grade}/{g.maxMarks}</span>
                                      )}
                                      {g.percentage !== null && (
                                        <span className={`rounded-lg px-2.5 py-1 text-sm font-black ${gradeBg(g.percentage)} ${gradeColor(g.percentage)}`}>
                                          {gradeLetter(g.percentage)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </PageShell>
  )
}
