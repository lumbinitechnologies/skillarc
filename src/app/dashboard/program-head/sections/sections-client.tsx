"use client"

import { motion } from "framer-motion"
import { Layers, Users, UserCheck } from "lucide-react"
import { PageShell, PageHeader } from "@/components/ui/page-shell"

interface Section {
  id: string
  name: string
  semester: number | null
  programName: string
  advisorName: string
  advisorEmail: string
  studentCount: number
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 140, damping: 20 } } }

export default function PHSectionsClient({
  phName,
  sections,
}: {
  phName: string
  sections: Section[]
}) {
  return (
    <PageShell>
      <PageHeader
        icon={<Layers className="h-5 w-5" />}
        eyebrow="Program Head Portal"
        title="Sections"
        subtitle={`${sections.length} sections across the institution.`}
      />

      {sections.length === 0 ? (
        <motion.div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20">
          <Layers className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No sections found.</p>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((sec) => (
            <motion.div
              key={sec.id}
              variants={item}
              whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(22,144,199,0.10)" }}
              className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] font-black text-base">
                  {sec.name.charAt(0)}
                </div>
                {sec.semester !== null && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                    Sem {sec.semester}
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-slate-900">Section {sec.name}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{sec.programName}</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Users className="h-3.5 w-3.5 text-[var(--primary)]" />
                  <span><span className="font-bold text-slate-800">{sec.studentCount}</span> students enrolled</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Advisor: <span className="font-semibold text-slate-700">{sec.advisorName}</span></span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </PageShell>
  )
}
