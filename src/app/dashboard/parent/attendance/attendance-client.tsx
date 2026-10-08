"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UserCheck, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ChevronDown, Calendar } from "lucide-react"
import { PageShell, PageHeader, itemVariants } from "@/components/ui/page-shell"

interface AttendanceRecord {
  date: string
  period: number
  status: string
  subjectName: string
  subjectCode: string
  facultyName: string
}

interface SubjectSummary {
  name: string
  code: string
  total: number
  present: number
  absent: number
  late: number
  rate: number
}

interface ChildWithAttendance {
  id: string
  name: string
  relationship: string
  sectionName: string
  programName: string
  semester: number | null
  records: AttendanceRecord[]
  subjectSummaries: SubjectSummary[]
  overall: { total: number; present: number; absent: number; rate: number }
}

function rateColor(rate: number) {
  if (rate >= 75) return "text-emerald-600"
  if (rate >= 60) return "text-amber-500"
  return "text-red-500"
}
function rateBg(rate: number) {
  if (rate >= 75) return "bg-emerald-50 border-emerald-100"
  if (rate >= 60) return "bg-amber-50 border-amber-100"
  return "bg-red-50 border-red-100"
}
function rateBar(rate: number) {
  if (rate >= 75) return "bg-emerald-500"
  if (rate >= 60) return "bg-amber-400"
  return "bg-red-500"
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PRESENT: { label: "Present", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  ABSENT: { label: "Absent", cls: "bg-red-50 text-red-600 border-red-100" },
  LATE: { label: "Late", cls: "bg-amber-50 text-amber-600 border-amber-100" },
  APPROVED_ABSENCE: { label: "Excused", cls: "bg-blue-50 text-blue-600 border-blue-100" },
  EXCUSED: { label: "Excused", cls: "bg-blue-50 text-blue-600 border-blue-100" },
  NOT_MARKED: { label: "Not marked", cls: "bg-slate-50 text-slate-400 border-slate-100" },
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 18 } } }

export default function ParentAttendanceClient({
  parentName,
  children,
}: {
  parentName: string
  children: ChildWithAttendance[]
}) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const child = children[selectedIdx] ?? null

  return (
    <PageShell>
      <PageHeader
        icon={<UserCheck className="h-5 w-5" />}
        eyebrow="Parent Portal"
        title="Attendance"
        subtitle="Track your child's attendance across all subjects."
        actions={
          children.length > 1 ? (
            <select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[var(--primary)] transition"
            >
              {children.map((c, i) => (
                <option key={c.id} value={i}>{c.name}</option>
              ))}
            </select>
          ) : undefined
        }
      />

      {!child ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <UserCheck className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No student linked to your account yet.</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={child.id} variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* Child info bar */}
            <motion.div variants={item} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-3.5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-black text-sm">{child.name.charAt(0)}</div>
              <div>
                <p className="text-sm font-bold text-slate-900">{child.name}</p>
                <p className="text-[11px] text-slate-400">{child.relationship} · {child.programName} · Sem {child.semester ?? "—"}</p>
              </div>
            </motion.div>

            {/* Overall stat */}
            <motion.div variants={item} className={`rounded-3xl border p-6 shadow-sm ${rateBg(child.overall.rate)}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Overall Attendance</p>
                  <p className={`mt-2 text-5xl font-black tracking-tight font-['Space_Grotesk'] ${rateColor(child.overall.rate)}`}>
                    {child.overall.rate}%
                  </p>
                  <div className="mt-3 flex gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-emerald-600 font-semibold"><CheckCircle2 className="h-4 w-4" />{child.overall.present} Present</span>
                    <span className="flex items-center gap-1.5 text-red-500 font-semibold"><AlertTriangle className="h-4 w-4" />{child.overall.absent} Absent</span>
                    <span className="text-slate-400 font-medium">{child.overall.total} Total</span>
                  </div>
                </div>
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white shadow-md" style={{ background: `conic-gradient(${child.overall.rate >= 75 ? "#10B981" : child.overall.rate >= 60 ? "#EAAD62" : "#F04438"} ${child.overall.rate}%, #f1f5f9 0)` }}>
                  <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center">
                    {child.overall.rate >= 75 ? <TrendingUp className="h-6 w-6 text-emerald-500" /> : <TrendingDown className="h-6 w-6 text-red-400" />}
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/60">
                <div className={`h-2 rounded-full ${rateBar(child.overall.rate)} transition-all duration-700`} style={{ width: `${child.overall.rate}%` }} />
              </div>
              {child.overall.rate < 75 && (
                <p className="mt-3 text-sm font-semibold text-red-600">
                  ⚠️ Attendance is below the 75% requirement. {child.overall.total > 0 ? `Needs ${Math.ceil(0.75 * child.overall.total) - child.overall.present} more present days to reach 75%.` : ""}
                </p>
              )}
            </motion.div>

            {/* Subject-wise */}
            <motion.div variants={item} className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Subject-wise Breakdown</p>
                <h2 className="mt-0.5 text-base font-bold text-slate-900">Per-Subject Attendance</h2>
              </div>
              {child.subjectSummaries.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No attendance data yet.</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {child.subjectSummaries.map((sub) => {
                    const isOpen = expandedSubject === sub.name
                    return (
                      <div key={sub.name}>
                        <button onClick={() => setExpandedSubject(isOpen ? null : sub.name)} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 text-left transition-colors">
                          <div className="h-8 w-1 rounded-full shrink-0" style={{ background: sub.rate >= 75 ? "#10B981" : sub.rate >= 60 ? "#EAAD62" : "#F04438" }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{sub.name}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{sub.code} · {sub.present}/{sub.total} classes attended</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-lg font-black font-['Space_Grotesk'] ${rateColor(sub.rate)}`}>{sub.rate}%</span>
                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                              </div>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                              <div className={`h-1.5 rounded-full ${rateBar(sub.rate)} transition-all duration-700`} style={{ width: `${sub.rate}%` }} />
                            </div>
                          </div>
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-50">
                              <div className="grid grid-cols-4 gap-3 bg-slate-50/60 px-6 py-4">
                                {[{ label: "Total", val: sub.total, cls: "text-slate-900" }, { label: "Present", val: sub.present, cls: "text-emerald-600" }, { label: "Absent", val: sub.absent, cls: "text-red-500" }, { label: "Late", val: sub.late, cls: "text-amber-500" }].map(({ label, val, cls }) => (
                                  <div key={label} className="rounded-xl bg-white border border-slate-100 px-3 py-2.5 text-center">
                                    <p className={`text-xl font-black font-['Space_Grotesk'] ${cls}`}>{val}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase tracking-wider">{label}</p>
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
              )}
            </motion.div>

            {/* History toggle */}
            <motion.div variants={item} className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] text-left">Records</p>
                  <h2 className="mt-0.5 text-base font-bold text-slate-900 text-left">Attendance Log ({child.records.length})</h2>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${showHistory ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showHistory && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-50">
                    {child.records.length === 0 ? (
                      <div className="py-10 text-center text-sm text-slate-400">No records found.</div>
                    ) : (
                      <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                        {[...child.records].sort((a, b) => b.date.localeCompare(a.date)).map((r, i) => {
                          const s = STATUS_LABEL[r.status] ?? STATUS_LABEL.NOT_MARKED
                          return (
                            <div key={i} className="flex items-center justify-between gap-4 px-6 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 border border-slate-100">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{r.subjectName}</p>
                                  <p className="text-[11px] text-slate-400">{r.date ? new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"} · Period {r.period} · {r.facultyName}</p>
                                </div>
                              </div>
                              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold shrink-0 ${s.cls}`}>{s.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </PageShell>
  )
}
