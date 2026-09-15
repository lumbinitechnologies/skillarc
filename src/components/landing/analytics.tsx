"use client"

import { motion } from "framer-motion"
import { Activity, BarChart3, BookOpen, Clock3, Users } from "lucide-react"
import { ProductWindow, SectionEyebrow, StatusPill } from "@/components/landing/marketing-ui"

const cards = [
  { label: "Students", value: "View by program", detail: "Understand the student picture without stitching together separate lists.", icon: Users, accent: "terracotta" as const },
  { label: "Faculty", value: "See assignments", detail: "Keep course, timetable, attendance, and assessment work together.", icon: BookOpen, accent: "navy" as const },
  { label: "Programs", value: "Track progress", detail: "Give program teams a clear view of cohorts, courses, and priorities.", icon: BarChart3, accent: "mint" as const },
  { label: "Attendance", value: "Spot follow-up", detail: "Make it easier to see where a student or class needs attention.", icon: Clock3, accent: "amber" as const },
]

export default function Analytics() {
  return (
    <section className="bg-white px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
          <div><SectionEyebrow accent="mint">A clearer operating picture</SectionEyebrow><h2 className="mt-5 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">Use the information you already have to see what needs attention.</h2><p className="mt-5 text-lg leading-8 text-[#58718B]">SkillArc keeps practical views close to the teams responsible for acting on them. The examples below are illustrative workspace views, not customer metrics.</p></div>
          <ProductWindow title="University analytics" label="Illustrative workspace" accent="mint">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#6D8498]">Current institution</p><h3 className="mt-1 text-2xl font-bold text-[#14234B]">Progress at a glance</h3></div><StatusPill accent="mint">Illustrative view</StatusPill></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">{cards.map(({ label, value, detail, icon: Icon, accent }, index) => <motion.div key={label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.35, delay: index * 0.06 }} className="rounded-2xl border border-[#E2EAF0] bg-[#F8FBFD] p-4"><div className="flex items-center justify-between gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#31547A]"><Icon size={17} aria-hidden="true" /></div><span className={`h-2.5 w-2.5 rounded-full ${accent === "terracotta" ? "bg-[#C85D2E]" : accent === "navy" ? "bg-[#31547A]" : accent === "mint" ? "bg-[#087F62]" : "bg-[#A66314]"}`} aria-hidden="true" /></div><p className="mt-5 text-sm font-semibold text-[#6D8498]">{label}</p><p className="mt-1 text-lg font-bold text-[#14234B]">{value}</p><p className="mt-2 text-sm leading-6 text-[#6D8498]">{detail}</p></motion.div>)}</div>
            <div className="mt-6 flex items-center gap-2 border-t border-[#E4EBF1] pt-5 text-sm font-semibold text-[#31547A]"><Activity size={16} className="text-[#087F62]" aria-hidden="true" /> Designed to support practical follow-through</div>
          </ProductWindow>
        </div>
      </div>
    </section>
  )
}
