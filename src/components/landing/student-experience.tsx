"use client"

import { motion } from "framer-motion"
import { BookOpen, CalendarDays, ClipboardCheck, GraduationCap, Users } from "lucide-react"
import { ProductWindow } from "@/components/landing/marketing-ui"

const workspaces = [
  { label: "Institution administration", title: "Run the institution with the day in view.", description: "Bring admissions, programs, faculty, students, fees, schedules, attendance, events, and placements into one practical workspace.", icon: GraduationCap, accent: "navy" as const, items: ["Admissions review", "Today’s priorities", "Attendance follow-up"] },
  { label: "Faculty", title: "Teach with less administration.", description: "Give faculty a focused view of schedules, course materials, attendance, assignments, submissions, and grades.", icon: BookOpen, accent: "terracotta" as const, items: ["Today’s timetable", "Pending assessments", "Attendance"] },
  { label: "Student & family", title: "Make the next step easier to see.", description: "Keep timetables, courses, assignments, attendance, grades, fees, events, and placement opportunities connected.", icon: Users, accent: "mint" as const, items: ["Upcoming work", "Progress view", "Placement opportunities"] },
]

export default function StudentExperience() {
  return (
    <section className="bg-[#F7FAFC] px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h2 className="mt-0 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">Everyone sees the work that matters to them.</h2>
          <p className="mt-5 text-lg leading-8 text-[#58718B]">The university stays connected while leadership, administrators, faculty, students, and families each get a focused workspace.</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {workspaces.map((workspace, index) => {
            const Icon = workspace.icon
            return (
              <motion.article key={workspace.label} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.45, delay: index * 0.08 }}>
                <ProductWindow title={workspace.label} label="Focused workspace" accent={workspace.accent}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF1F7] text-[#31547A]"><Icon size={21} aria-hidden="true" /></div>
                  </div>
                  <h3 className="mt-6 text-2xl font-bold tracking-[-0.04em] text-[#14234B]">{workspace.title}</h3>
                  <p className="mt-3 text-base leading-7 text-[#58718B]">{workspace.description}</p>
                  <div className="mt-6 space-y-3 border-t border-[#E4EBF1] pt-5">
                    {workspace.items.map((item, itemIndex) => (
                      <div key={item} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 font-semibold text-[#31547A]"><span className={`h-2 w-2 rounded-full ${itemIndex === 0 ? "bg-[#C85D2E]" : itemIndex === 1 ? "bg-[#31547A]" : "bg-[#087F62]"}`} aria-hidden="true" />{item}</span>
                        <span className="text-[#6D8498]">{itemIndex === 0 ? "Today" : itemIndex === 1 ? "Ready" : "View"}</span>
                      </div>
                    ))}
                  </div>
                </ProductWindow>
              </motion.article>
            )
          })}
        </div>

        <div className="mt-7 grid gap-4 rounded-3xl border border-[#DCE6EE] bg-white p-6 sm:grid-cols-3 sm:p-7">
          {[
            { icon: CalendarDays, label: "A timetable teams can trust", detail: "Plan, check, save, and publish." },
            { icon: ClipboardCheck, label: "Progress that invites follow-up", detail: "See the work before it becomes a problem." },
            { icon: Users, label: "The right people in the loop", detail: "Keep students, families, and teams aligned." },
          ].map(({ icon: Icon, label, detail }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon size={19} className="mt-0.5 shrink-0 text-[#C85D2E]" aria-hidden="true" />
              <div><p className="text-sm font-bold text-[#14234B]">{label}</p><p className="mt-1 text-sm leading-6 text-[#6D8498]">{detail}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
