"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Award, BookOpen, Building2, HeartHandshake, Shield, Users } from "lucide-react"
import { ROLE_VIEWS } from "@/components/landing/marketing-data"
import { ProductWindow } from "@/components/landing/marketing-ui"

const iconMap = { Shield, Building2, Award, BookOpen, Users, HeartHandshake }

const previewRows: Record<string, Array<[string, string, string]>> = {
  leadership: [["Institutions", "Across your group", "In view"], ["Teams", "Connected", "Ready"], ["Reports", "One place", "Up to date"]],
  administrator: [["Admissions", "Applications", "Review"], ["Attendance", "Follow-up list", "Today"], ["Placements", "Open roles", "View"]],
  department: [["Faculty", "Assignments", "Ready"], ["Courses", "Mapped", "Complete"], ["Schedules", "Semester view", "Review"]],
  faculty: [["Today’s class", "CS-302 · 09:00", "Active"], ["Attendance", "Current class", "Take"], ["Assessments", "42 submissions", "Review"]],
  student: [["Next assignment", "Due soon", "View"], ["Current courses", "This term", "Open"], ["Placements", "Opportunities", "Explore"]],
}

export default function Roles() {
  const [activeId, setActiveId] = useState(ROLE_VIEWS[0].id)
  const active = ROLE_VIEWS.find((role) => role.id === activeId) ?? ROLE_VIEWS[0]
  const Icon = iconMap[active.id === "leadership" ? "Shield" : active.id === "administrator" ? "Building2" : active.id === "department" ? "Award" : active.id === "faculty" ? "BookOpen" : "Users"]

  return (
    <section className="bg-[#F7FAFC] px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl"><h2 className="mt-0 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">Everyone sees the work that matters to them.</h2><p className="mt-5 text-lg leading-8 text-[#58718B]">Keep the university connected while leadership, administrators, department heads, faculty, students, and families each get a focused workspace.</p></div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:gap-12">
          <div className="space-y-2" role="tablist" aria-label="Role-based solutions">
            {ROLE_VIEWS.map((role) => (
              <button key={role.id} type="button" role="tab" aria-selected={active.id === role.id} onClick={() => setActiveId(role.id)} className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] ${active.id === role.id ? "border-[#14234B] bg-[#14234B] text-white shadow-[0_12px_26px_rgba(20,35,75,0.13)]" : "border-[#DCE6EE] bg-white text-[#31547A] hover:border-[#BFCFDB]"}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active.id === role.id ? "bg-white/12 text-[#E07A48]" : "bg-[#EAF1F7] text-[#31547A]"}`}><span className="text-sm font-bold">{role.id === "leadership" ? "01" : role.id === "administrator" ? "02" : role.id === "department" ? "03" : role.id === "faculty" ? "04" : "05"}</span></span>
                <span className="min-w-0 flex-1"><span className={`block text-xs font-semibold uppercase tracking-[0.1em] ${active.id === role.id ? "text-[#A9C2D7]" : "text-[#6D8498]"}`}>{role.audience}</span><span className="mt-1 block text-base font-bold">{role.title}</span></span>
              </button>
            ))}
          </div>

          <ProductWindow title={`${active.audience} workspace`} label="Focused workspace" accent={active.accent}>
            <AnimatePresence mode="wait">
              <motion.div key={active.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.24 }}>
                <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF1F7] text-[#31547A]"><Icon size={22} aria-hidden="true" /></div><div><p className="text-sm font-semibold text-[#6D8498]">{active.audience}</p><h3 className="text-2xl font-bold text-[#14234B]">{active.title}</h3></div></div>
                <p className="mt-6 text-base leading-7 text-[#58718B]">{active.description}</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-3">{active.focus.map((focus, index) => <div key={focus} className="rounded-2xl border border-[#E2EAF0] bg-[#F8FBFD] p-4"><span className="text-sm font-bold text-[#C85D2E]">0{index + 1}</span><p className="mt-5 text-sm font-semibold leading-6 text-[#31547A]">{focus}</p></div>)}</div>
                <div className="mt-6 overflow-hidden rounded-2xl border border-[#E2EAF0]"><div className="grid grid-cols-[1fr_1fr_0.65fr] gap-3 bg-[#F4F8FB] px-4 py-3 text-xs font-bold text-[#6D8498]"><span>Workstream</span><span>Context</span><span>Status</span></div>{previewRows[active.id].map((row) => <div key={row[0]} className="grid grid-cols-[1fr_1fr_0.65fr] gap-3 border-t border-[#E8EEF3] px-4 py-3 text-sm text-[#58718B]"><span className="font-semibold text-[#14234B]">{row[0]}</span><span>{row[1]}</span><span className="font-semibold text-[#087F62]">{row[2]}</span></div>)}</div>
              </motion.div>
            </AnimatePresence>
          </ProductWindow>
        </div>
      </div>
    </section>
  )
}
