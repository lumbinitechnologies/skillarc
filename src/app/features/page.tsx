"use client"

import { motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"
import Analytics from "@/components/landing/analytics"
import TimetableDemo from "@/components/landing/timetable-demo"
import { MultiInstitutionSection } from "@/components/landing/cta"
import { FEATURE_GROUPS } from "@/components/landing/marketing-data"
import { MarketingShell, ProductWindow } from "@/components/landing/marketing-ui"

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <main>
        <section className="relative overflow-hidden bg-white px-5 py-20 sm:px-8 lg:py-28">
          <div className="absolute right-[-8rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[#EAF1F7] blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl"><h1 className="mt-0 max-w-4xl text-5xl font-bold leading-[1.04] tracking-[-0.055em] text-[#14234B] sm:text-6xl lg:text-7xl">The features universities use. Less admin. More follow-through.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[#58718B]">From admissions and timetables to attendance, grades, fees, events, and placements, SkillArc gives each team a clear way to get work done.</p></div>
        </section>

        <section className="bg-[#F7FAFC] px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><h2 className="mt-0 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">A connected set of workflows, organized around the work.</h2></div><div className="mt-12 grid gap-5 lg:grid-cols-2">{FEATURE_GROUPS.map((group, index) => <motion.article key={group.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.4, delay: index * 0.05 }}><ProductWindow title={group.label} label="Product capability" accent={group.accent}><div><p className="text-sm font-semibold text-[#6D8498]">{group.label}</p><h3 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[#14234B]">{group.title}</h3></div><p className="mt-4 text-base leading-7 text-[#58718B]">{group.description}</p><div className="mt-6 grid gap-2 sm:grid-cols-3">{group.features.map((feature) => <div key={feature} className="flex items-start gap-2 rounded-xl border border-[#E2EAF0] bg-[#F8FBFD] px-3 py-3 text-sm font-semibold leading-5 text-[#31547A]"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#087F62]" aria-hidden="true" />{feature}</div>)}</div></ProductWindow></motion.article>)}</div></div></section>

        <TimetableDemo />
        <Analytics />
        <MultiInstitutionSection />

      </main>
    </MarketingShell>
  )
}
