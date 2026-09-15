"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Building2, ChevronRight, CircleUserRound, GraduationCap, Layers3 } from "lucide-react"
import { ProductWindow, SectionEyebrow, StatusPill } from "@/components/landing/marketing-ui"

const nodes = [
  { id: "university", label: "University group", icon: Building2, description: "A shared view across institutions and campuses.", children: ["Institution A", "Institution B", "Institution C"] },
  { id: "institution", label: "Institution", icon: Building2, description: "The operational view for administrators and teams.", children: ["Departments", "Admissions", "Student support"] },
  { id: "department", label: "Department & program", icon: Layers3, description: "The academic structure behind each cohort.", children: ["Courses", "Faculty", "Timetables"] },
  { id: "student", label: "Student journey", icon: CircleUserRound, description: "The connected experience students and families follow.", children: ["Attendance", "Grades", "Placements"] },
]

export default function Organization() {
  const [activeId, setActiveId] = useState(nodes[0].id)
  const active = nodes.find((node) => node.id === activeId) ?? nodes[0]
  const Icon = active.icon

  return (
    <section className="bg-white px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
          <div>
            <SectionEyebrow accent="navy">The university structure, connected</SectionEyebrow>
            <h2 className="mt-5 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">The right information, in the right hands.</h2>
            <p className="mt-5 text-lg leading-8 text-[#58718B]">Bring your existing structure into one dependable workspace, with clear responsibilities for each team.</p>
            <div className="mt-8 space-y-2" role="tablist" aria-label="University structure levels">
              {nodes.map((node) => {
                const NodeIcon = node.icon
                return (
                  <button
                    key={node.id}
                    type="button"
                    role="tab"
                    aria-selected={activeId === node.id}
                    onClick={() => setActiveId(node.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] ${activeId === node.id ? "border-[#31547A] bg-[#EAF1F7] text-[#14234B]" : "border-[#DCE6EE] text-[#58718B] hover:border-[#BFCFDB] hover:bg-[#F7FAFC]"}`}
                  >
                    <NodeIcon size={18} aria-hidden="true" />
                    <span className="flex-1 text-sm font-semibold">{node.label}</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          </div>

          <ProductWindow title="Institutional structure" label="Illustrative workspace" accent="navy">
            <AnimatePresence mode="wait">
              <motion.div key={active.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF1F7] text-[#31547A]"><Icon size={22} aria-hidden="true" /></div>
                    <div><p className="text-sm font-semibold text-[#6D8498]">Current level</p><h3 className="text-2xl font-bold text-[#14234B]">{active.label}</h3></div>
                  </div>
                  <StatusPill accent="mint">Connected</StatusPill>
                </div>
                <p className="mt-6 text-base leading-7 text-[#58718B]">{active.description}</p>
                <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
                  {active.children.map((child, index) => (
                    <div key={child} className="relative rounded-2xl border border-[#DCE6EE] bg-[#F8FBFD] p-5 text-center">
                      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#31547A] shadow-sm"><span className="text-sm font-bold">0{index + 1}</span></div>
                      <p className="text-sm font-bold text-[#14234B]">{child}</p>
                      <p className="mt-2 text-sm leading-6 text-[#6D8498]">Focused view for the team responsible.</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-2 border-t border-[#E4EBF1] pt-5 text-sm font-semibold text-[#31547A]"><GraduationCap size={16} className="text-[#C85D2E]" aria-hidden="true" /> Shared structure, local control</div>
              </motion.div>
            </AnimatePresence>
          </ProductWindow>
        </div>
      </div>
    </section>
  )
}
