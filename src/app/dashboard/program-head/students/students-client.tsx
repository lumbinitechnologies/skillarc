"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Search, ChevronDown } from "lucide-react"
import { PageShell, PageHeader } from "@/components/ui/page-shell"

interface Student {
  id: string
  name: string
  email: string
  phone: string
  registrationNumber: string
  semester: number | null
  admissionYear: number | null
  sectionName: string
  programName: string
  joinedAt: string
}

const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 140, damping: 20 } } }

export default function PHStudentsClient({
  phName,
  students,
  totalCount,
}: {
  phName: string
  students: Student[]
  totalCount: number
}) {
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = students.filter((s) => {
    const q = search.toLowerCase()
    return !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.registrationNumber.toLowerCase().includes(q)
  })

  return (
    <PageShell>
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        eyebrow="Program Head Portal"
        title="Students"
        subtitle={`${totalCount} students enrolled across the institution.`}
      />

      <motion.div variants={item} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or reg. no."
          className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </motion.div>

      <motion.div variants={item} className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Directory</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900">Student List <span className="text-sm font-semibold text-slate-400">({filtered.length})</span></h2>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-400">No students found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((s) => (
              <div key={s.id}>
                <button
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/40 text-left transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-black">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{s.registrationNumber} · {s.programName} · Section {s.sectionName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.semester !== null && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">Sem {s.semester}</span>}
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded === s.id ? "rotate-180" : ""}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {expanded === s.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden border-t border-slate-50">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 px-6 py-4">
                        {[
                          { label: "Email", val: s.email },
                          { label: "Phone", val: s.phone || "—" },
                          { label: "Admission Year", val: s.admissionYear?.toString() ?? "—" },
                          { label: "Joined", val: s.joinedAt ? new Date(s.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—" },
                        ].map(({ label, val }) => (
                          <div key={label} className="rounded-xl bg-white border border-slate-100 px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                            <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{val}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </PageShell>
  )
}
