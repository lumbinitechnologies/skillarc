"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Clock3, GripVertical, MapPin, Users } from "lucide-react"
import { ProductWindow, SectionEyebrow, StatusPill } from "@/components/landing/marketing-ui"

const scheduleStates = [
  { id: "plan", label: "Plan the week", status: "Draft schedule", message: "Move sections into place before publishing.", rows: [["Mon 09:00", "CS-302", "Room 304", "Dr. Roy"], ["Mon 11:00", "DBMS", "Room 212", "Prof. Mehta"], ["Tue 10:00", "Data Analytics", "Lab 2", "Dr. Khan"]] },
  { id: "check", label: "Check for clashes", status: "Review complete", message: "SkillArc surfaces conflicts before they reach staff or students.", rows: [["Mon 09:00", "CS-302", "Room 304", "No clash"], ["Mon 11:00", "DBMS", "Room 212", "No clash"], ["Tue 10:00", "Data Analytics", "Lab 2", "Review"]] },
  { id: "publish", label: "Publish the timetable", status: "Ready to publish", message: "Save, print, and share the finished schedule with the people who need it.", rows: [["Mon 09:00", "CS-302", "Room 304", "Published"], ["Mon 11:00", "DBMS", "Room 212", "Published"], ["Tue 10:00", "Data Analytics", "Lab 2", "Published"]] },
]

export default function TimetableDemo() {
  const [activeId, setActiveId] = useState(scheduleStates[0].id)
  const active = scheduleStates.find((state) => state.id === activeId) ?? scheduleStates[0]

  return (
    <section className="bg-[#14234B] px-5 py-20 text-white sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:gap-20">
          <div>
            <SectionEyebrow accent="amber">Flagship workflow</SectionEyebrow>
            <h2 className="mt-5 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Timetables your teams can trust.</h2>
            <p className="mt-5 text-lg leading-8 text-[#D6E3EC]">Build schedules visually, catch double-bookings as you work, then save, print, and publish the timetable for staff and students.</p>
            <div className="mt-8 space-y-2" role="tablist" aria-label="Timetable workflow">
              {scheduleStates.map((state, index) => <button key={state.id} type="button" role="tab" aria-selected={active.id === state.id} onClick={() => setActiveId(state.id)} className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${active.id === state.id ? "border-white/25 bg-white/12" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}><span className="text-sm font-bold text-[#E07A48]">0{index + 1}</span><span className="text-base font-semibold text-white">{state.label}</span></button>)}
            </div>
          </div>

          <ProductWindow title="Timetable builder" label="Illustrative workspace" accent="navy">
            <AnimatePresence mode="wait"><motion.div key={active.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#6D8498]">Semester timetable</p><h3 className="mt-1 text-2xl font-bold text-[#14234B]">{active.message}</h3></div><StatusPill accent={active.id === "check" ? "mint" : active.id === "publish" ? "navy" : "amber"}>{active.status}</StatusPill></div>
              <div className="mt-7 overflow-hidden rounded-2xl border border-[#E2EAF0]"><div className="grid grid-cols-[0.8fr_1fr_0.9fr_0.8fr] gap-3 bg-[#F4F8FB] px-4 py-3 text-xs font-bold text-[#6D8498]"><span>Time</span><span>Course</span><span>Location</span><span>Faculty</span></div>{active.rows.map((row) => <div key={row[0]} className="grid grid-cols-[0.8fr_1fr_0.9fr_0.8fr] gap-3 border-t border-[#E8EEF3] px-4 py-4 text-sm text-[#58718B]"><span className="font-semibold text-[#14234B]">{row[0]}</span><span>{row[1]}</span><span className="flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" />{row[2]}</span><span className={row[3].includes("clash") || row[3] === "Review" ? "font-semibold text-[#A66314]" : "font-semibold text-[#087F62]"}>{row[3]}</span></div>)}</div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="flex items-center gap-2 rounded-xl border border-[#E2EAF0] bg-[#F8FBFD] px-4 py-3 text-sm font-semibold text-[#31547A]"><GripVertical size={15} className="text-[#31547A]" aria-hidden="true" /> Visual planning</div><div className="flex items-center gap-2 rounded-xl border border-[#E2EAF0] bg-[#F8FBFD] px-4 py-3 text-sm font-semibold text-[#31547A]"><Clock3 size={15} className="text-[#C85D2E]" aria-hidden="true" /> Conflict checking</div><div className="flex items-center gap-2 rounded-xl border border-[#E2EAF0] bg-[#F8FBFD] px-4 py-3 text-sm font-semibold text-[#31547A]"><Users size={15} className="text-[#087F62]" aria-hidden="true" /> Ready to share</div></div>
            </motion.div></AnimatePresence>
          </ProductWindow>
        </div>
      </div>
    </section>
  )
}
