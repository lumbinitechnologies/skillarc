"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ClipboardList, CheckCircle2, AlertTriangle, Clock, ChevronDown } from "lucide-react"
import { PageShell, PageHeader, itemVariants } from "@/components/ui/page-shell"

interface Assignment {
  id: string
  title: string
  description: string
  dueDate: string | null
  maxMarks: number | null
  subjectName: string
  subjectCode: string
  submitted: boolean
  submittedAt: string | null
  status: string
  grade: number | null
  feedback: string | null
  overdue: boolean
}

interface ChildWithAssignments {
  id: string
  name: string
  relationship: string
  programName: string
  semester: number | null
  assignments: Assignment[]
  stats: { total: number; submitted: number; missing: number; pending: number }
}

const STATUS_CONFIG = {
  submitted: { label: "Submitted", cls: "bg-emerald-50 border-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  pending: { label: "Pending", cls: "bg-amber-50 border-amber-100 text-amber-600", icon: <Clock className="h-3.5 w-3.5" /> },
  missing: { label: "Missing", cls: "bg-red-50 border-red-100 text-red-600", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 18 } } }

export default function ParentAssignmentsClient({
  parentName,
  children,
}: {
  parentName: string
  children: ChildWithAssignments[]
}) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [filter, setFilter] = useState<"all" | "submitted" | "pending" | "missing">("all")
  const [expanded, setExpanded] = useState<string | null>(null)

  const child = children[selectedIdx] ?? null
  const filtered = child?.assignments.filter((a) => {
    if (filter === "submitted") return a.submitted
    if (filter === "missing") return a.overdue && !a.submitted
    if (filter === "pending") return !a.submitted && !a.overdue
    return true
  }) ?? []

  return (
    <PageShell>
      <PageHeader
        icon={<ClipboardList className="h-5 w-5" />}
        eyebrow="Parent Portal"
        title="Assignments"
        subtitle="Track submitted and pending assignments for your child."
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
          <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No student linked yet.</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={child.id} variants={container} initial="hidden" animate="show" className="space-y-5">
            {/* Student bar */}
            <motion.div variants={item} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-3.5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-black text-sm">{child.name.charAt(0)}</div>
              <div>
                <p className="text-sm font-bold text-slate-900">{child.name}</p>
                <p className="text-[11px] text-slate-400">{child.relationship} · {child.programName} · Sem {child.semester ?? "—"}</p>
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: "all", label: "Total", count: child.stats.total, cls: "border-slate-100 bg-white" },
                { key: "submitted", label: "Submitted", count: child.stats.submitted, cls: "border-emerald-100 bg-emerald-50" },
                { key: "pending", label: "Pending", count: child.stats.pending, cls: "border-amber-100 bg-amber-50" },
                { key: "missing", label: "Missing", count: child.stats.missing, cls: "border-red-100 bg-red-50" },
              ].map(({ key, label, count, cls }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`rounded-2xl border p-4 text-left transition-all shadow-sm hover:scale-[1.02] ${cls} ${filter === key ? "ring-2 ring-[var(--primary)]/30" : ""}`}
                >
                  <p className="text-2xl font-black text-slate-900 font-['Space_Grotesk']">{count}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
                </button>
              ))}
            </motion.div>

            {/* Assignment list */}
            <motion.div variants={item} className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">List</p>
                  <h2 className="mt-0.5 text-base font-bold text-slate-900">
                    {filter === "all" ? "All Assignments" : filter === "submitted" ? "Submitted" : filter === "missing" ? "Missing / Overdue" : "Pending"}
                    <span className="ml-2 text-sm font-semibold text-slate-400">({filtered.length})</span>
                  </h2>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <CheckCircle2 className="h-8 w-8 text-emerald-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-400">
                    {filter === "missing" ? "No missing assignments! 🎉" : "Nothing here yet."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filtered.map((a) => {
                    const statusKey = a.submitted ? "submitted" : a.overdue ? "missing" : "pending"
                    const status = STATUS_CONFIG[statusKey]
                    const isOpen = expanded === a.id

                    return (
                      <div key={a.id}>
                        <button onClick={() => setExpanded(isOpen ? null : a.id)} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50/40 text-left transition-colors">
                          <div className="h-8 w-1 rounded-full shrink-0" style={{ background: statusKey === "submitted" ? "#10B981" : statusKey === "missing" ? "#F04438" : "#EAAD62" }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{a.title}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{a.subjectName} · {a.subjectCode}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${status.cls}`}>
                                  {status.icon} {status.label}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                              </div>
                            </div>
                            {a.dueDate && (
                              <p className={`text-[11px] mt-1 font-medium ${a.overdue && !a.submitted ? "text-red-500" : "text-slate-400"}`}>
                                Due: {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                {a.overdue && !a.submitted && " · Overdue"}
                              </p>
                            )}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-50">
                              <div className="bg-slate-50/60 px-6 py-4 space-y-3">
                                {a.description && <p className="text-sm text-slate-600 leading-relaxed">{a.description}</p>}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {a.maxMarks !== null && (
                                    <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
                                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Max Marks</p>
                                      <p className="text-base font-black text-slate-900 font-['Space_Grotesk'] mt-0.5">{a.maxMarks}</p>
                                    </div>
                                  )}
                                  {a.grade !== null && (
                                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Grade</p>
                                      <p className="text-base font-black text-emerald-700 font-['Space_Grotesk'] mt-0.5">{a.grade}{a.maxMarks ? ` / ${a.maxMarks}` : ""}</p>
                                    </div>
                                  )}
                                  {a.submittedAt && (
                                    <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
                                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Submitted</p>
                                      <p className="text-xs font-bold text-slate-700 mt-0.5">{new Date(a.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                                    </div>
                                  )}
                                </div>
                                {a.feedback && (
                                  <div className="rounded-xl bg-white border border-slate-100 px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Faculty Feedback</p>
                                    <p className="text-sm text-slate-700 leading-relaxed">{a.feedback}</p>
                                  </div>
                                )}
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
          </motion.div>
        </AnimatePresence>
      )}
    </PageShell>
  )
}
