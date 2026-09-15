"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, GraduationCap, Users } from "lucide-react"
import Link from "next/link"
import { DEMO_URL, WORKFLOW_STEPS } from "@/components/landing/marketing-data"
import { ProductWindow, SectionEyebrow, StatusPill } from "@/components/landing/marketing-ui"

const heroViews = [
  {
    title: "Admissions review",
    status: "Ready for review",
    accent: "terracotta" as const,
    rows: [
      ["A. Sharma", "Computer Science", "Fall 2026", "Review"],
      ["M. Patel", "Business Studies", "Fall 2026", "Pending"],
      ["R. Singh", "Data Analytics", "Spring 2027", "Complete"],
    ],
  },
  {
    title: "Academic operations",
    status: "Ready to publish",
    accent: "navy" as const,
    rows: [
      ["Monday 09:00", "CS-302", "Room 304", "No clash"],
      ["Monday 11:00", "DBMS", "Room 212", "No clash"],
      ["Tuesday 10:00", "Data Analytics", "Lab 2", "Review"],
    ],
  },
  {
    title: "Student support",
    status: "3 priorities today",
    accent: "mint" as const,
    rows: [
      ["Attendance follow-up", "Below threshold", "12 students", "Review"],
      ["Assignments to review", "Due today", "42 submissions", "Today"],
      ["Grades ready", "Publish this week", "3 courses", "Ready"],
    ],
  },
]

export default function Hero() {
  const [activeView, setActiveView] = useState(0)
  const view = heroViews[activeView]

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[#DDE7EF] bg-[#F7FAFC] px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:pb-24 lg:pt-24">
        <div className="absolute right-[-8rem] top-[-8rem] h-[32rem] w-[32rem] rounded-full bg-[#E7EFF6] blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-[-10rem] left-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[#FBECE5] blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <SectionEyebrow>Purpose-built for university teams</SectionEyebrow>
            <h1 className="mt-7 max-w-2xl text-5xl font-bold leading-[1.03] tracking-[-0.055em] text-[#14234B] sm:text-6xl lg:text-7xl">
              One clear workspace for the work behind every student journey.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#58718B] sm:text-xl">
              SkillArc connects admissions, academic operations, student progress, and placements so university teams can spend less time chasing updates and more time supporting students.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#C85D2E] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(200,93,46,0.22)] transition hover:bg-[#A94B22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] focus-visible:ring-offset-2"
              >
                Book a demo <ArrowUpRight size={16} aria-hidden="true" />
              </a>
              <Link
                href="/platform"
                className="inline-flex items-center gap-2 rounded-full border border-[#BFCFDB] bg-white px-6 py-3.5 text-sm font-bold text-[#31547A] transition hover:border-[#31547A] hover:text-[#14234B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] focus-visible:ring-offset-2"
              >
                Explore the platform <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-6 text-sm font-medium text-[#6D8498]">Admissions · academics · student support · placements</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="relative"
          >
            <div className="absolute -right-4 -top-7 z-10 hidden rounded-2xl border border-[#D9E3EC] bg-white px-4 py-3 shadow-[0_14px_34px_rgba(20,35,75,0.13)] sm:block marketing-float">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#31547A]"><span className="h-2 w-2 rounded-full bg-[#087F62]" /> One shared view</div>
              <p className="mt-1 text-xs text-[#6D8498]">Up to date for every role</p>
            </div>

            <ProductWindow title={view.title} label="Illustrative workspace" accent={view.accent} className="relative z-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#6D8498]">Today at your university</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#14234B]">The work that needs attention.</h2>
                </div>
                <StatusPill accent="mint">{view.status}</StatusPill>
              </div>

              <div className="mt-7 overflow-hidden rounded-2xl border border-[#E4EBF1]">
                <div className="grid grid-cols-[1.1fr_1fr_0.8fr_0.65fr] gap-3 bg-[#F4F8FB] px-4 py-3 text-xs font-bold text-[#6D8498]">
                  <span>Workstream</span><span>Context</span><span>Scope</span><span>Status</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {view.rows.map((row) => (
                      <div key={row[0]} className="grid grid-cols-[1.1fr_1fr_0.8fr_0.65fr] gap-3 border-t border-[#E8EEF3] px-4 py-4 text-sm text-[#31547A]">
                        <span className="font-semibold text-[#14234B]">{row[0]}</span>
                        <span>{row[1]}</span>
                        <span>{row[2]}</span>
                        <span className="font-semibold text-[#087F62]">{row[3]}</span>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E4EBF1] pt-5 text-sm">
                <span className="flex items-center gap-2 font-semibold text-[#31547A]"><CheckCircle2 size={16} className="text-[#087F62]" aria-hidden="true" /> Shared record, role-aware view</span>
                <span className="text-[#6D8498]">Illustrative data</span>
              </div>
            </ProductWindow>

            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Product preview views">
              {heroViews.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  role="tab"
                  aria-selected={activeView === index}
                  onClick={() => setActiveView(index)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] focus-visible:ring-offset-2 ${activeView === index ? "bg-[#14234B] text-white" : "border border-[#D9E3EC] bg-white text-[#58718B] hover:border-[#31547A] hover:text-[#14234B]"}`}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <SectionEyebrow accent="navy">A clearer way to run the university</SectionEyebrow>
            <h2 className="mt-5 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">Bring the work together without making every team work the same way.</h2>
            <p className="mt-5 text-lg leading-8 text-[#58718B]">SkillArc keeps the university connected while giving each team a focused view of the work in front of them.</p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {WORKFLOW_STEPS.map((step, index) => (
              <motion.article
                key={step.number}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="group rounded-3xl border border-[#DCE6EE] bg-[#F8FBFD] p-6 transition hover:-translate-y-1 hover:border-[#BFCFDB] hover:bg-white hover:shadow-[0_16px_40px_rgba(20,35,75,0.08)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#6D8498]">{step.number}</span>
                  <span className={`h-3 w-3 rounded-full ${step.accent === "terracotta" ? "bg-[#C85D2E]" : step.accent === "navy" ? "bg-[#31547A]" : "bg-[#087F62]"}`} aria-hidden="true" />
                </div>
                <p className="mt-8 text-sm font-bold uppercase tracking-[0.12em] text-[#6D8498]">{step.label}</p>
                <h3 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[#14234B]">{step.title}</h3>
                <p className="mt-4 text-base leading-7 text-[#58718B]">{step.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F0F5F8] px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3">
          {[
            { icon: GraduationCap, label: "Academic structure", value: "Programs, courses, faculty, and schedules" },
            { icon: CalendarDays, label: "Student day-to-day", value: "Timetables, attendance, tasks, grades, and fees" },
            { icon: Users, label: "Shared responsibility", value: "Leadership, teams, students, and families" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-4 rounded-2xl border border-[#D7E2EA] bg-white/70 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF1F7] text-[#31547A]"><Icon size={19} aria-hidden="true" /></div>
              <div><p className="text-sm font-bold text-[#14234B]">{label}</p><p className="mt-1 text-sm leading-6 text-[#6D8498]">{value}</p></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
