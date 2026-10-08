"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, ChevronDown } from "lucide-react"
import { PageShell, PageHeader } from "@/components/ui/page-shell"

interface CourseAssignment {
  facultyName: string
  sectionName: string
}

interface Course {
  id: string
  name: string
  code: string
  programName: string
  sectionCount: number
  assignments: CourseAssignment[]
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 140, damping: 20 } } }

export default function PHCoursesClient({
  phName,
  courses,
}: {
  phName: string
  courses: Course[]
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <PageShell>
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        eyebrow="Program Head Portal"
        title="Courses"
        subtitle={`${courses.length} courses mapped to programs in the institution.`}
      />

      <motion.div variants={container} initial="hidden" animate="show" className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Curriculum</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900">Course Catalogue</h2>
        </div>

        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-400">No courses found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {courses.map((c) => (
              <motion.div key={c.id} variants={item}>
                <button
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50/40 text-left transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/8 text-[var(--primary)] font-black text-xs font-['Space_Grotesk']">
                    {c.code.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{c.code} · {c.programName}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900 font-['Space_Grotesk']">{c.assignments.length}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">sections</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded === c.id ? "rotate-180" : ""}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {expanded === c.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden border-t border-slate-50">
                      <div className="bg-slate-50/60 px-6 py-4">
                        {c.assignments.length === 0 ? (
                          <p className="text-sm text-slate-400">No sections assigned yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {c.assignments.map((a, i) => (
                              <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <p className="text-xs font-bold text-slate-800">Section {a.sectionName}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{a.facultyName}</p>
                              </div>
                            ))}
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
