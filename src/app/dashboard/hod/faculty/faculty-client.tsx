"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GraduationCap, ChevronDown, BookOpen } from "lucide-react"
import { PageShell, PageHeader } from "@/components/ui/page-shell"

interface FacultyAssignment {
  subjectName: string
  subjectCode: string
  sectionName: string
}

interface FacultyMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  joinedAt: string
  subjectCount: number
  assignments: FacultyAssignment[]
}

const ROLE_LABELS: Record<string, string> = {
  FACULTY: "Faculty",
  HOD: "Head of Dept",
  PROGRAM_HEAD: "Program Head",
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 140, damping: 20 } } }

export default function HodFacultyClient({
  hodName,
  faculty,
}: {
  hodName: string
  faculty: FacultyMember[]
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <PageShell>
      <PageHeader
        icon={<GraduationCap className="h-5 w-5" />}
        eyebrow="HOD Portal"
        title="Faculty"
        subtitle={`${faculty.length} faculty members in the institution.`}
      />

      <motion.div variants={container} initial="hidden" animate="show" className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Department</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900">Faculty Directory</h2>
        </div>

        {faculty.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <GraduationCap className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-400">No faculty found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {faculty.map((f) => (
              <motion.div key={f.id} variants={item}>
                <button
                  onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50/40 text-left transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary)]/10 text-[var(--secondary)] font-black text-sm">
                    {f.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{f.name}</p>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {ROLE_LABELS[f.role] ?? f.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{f.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)]/8 border border-[var(--primary)]/15 px-2.5 py-1">
                      <BookOpen className="h-3 w-3 text-[var(--primary)]" />
                      <span className="text-xs font-black text-[var(--primary)]">{f.subjectCount}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded === f.id ? "rotate-180" : ""}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {expanded === f.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden border-t border-slate-50">
                      <div className="bg-slate-50/60 px-6 py-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phone</p>
                            <p className="text-sm font-semibold text-slate-800 mt-0.5">{f.phone || "—"}</p>
                          </div>
                          <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Joined</p>
                            <p className="text-sm font-semibold text-slate-800 mt-0.5">{f.joinedAt ? new Date(f.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                          </div>
                        </div>
                        {f.assignments.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Assigned Courses ({f.assignments.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {f.assignments.map((a, i) => (
                                <div key={i} className="rounded-lg border border-[var(--primary)]/15 bg-[var(--primary)]/5 px-3 py-1.5">
                                  <p className="text-xs font-bold text-[var(--primary)]">{a.subjectCode} — {a.subjectName}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Section {a.sectionName}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </PageShell>
  )
}
