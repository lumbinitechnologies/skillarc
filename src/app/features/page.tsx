"use client"

import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import Analytics from "@/components/landing/analytics"
import TimetableDemo from "@/components/landing/timetable-demo"
import { MultiInstitutionSection } from "@/components/landing/cta"
import { FEATURE_GROUPS } from "@/components/landing/marketing-data"
import { MarketingShell, ProductWindow, SectionEyebrow, StatusPill } from "@/components/landing/marketing-ui"

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <main>
        <section className="relative overflow-hidden bg-white px-5 py-20 sm:px-8 lg:py-28">
          <div className="absolute right-[-8rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[#EAF1F7] blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl"><SectionEyebrow accent="terracotta">Features for everyday university work</SectionEyebrow><h1 className="mt-6 max-w-4xl text-5xl font-bold leading-[1.04] tracking-[-0.055em] text-[#14234B] sm:text-6xl lg:text-7xl">The features universities use. Less admin. More follow-through.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[#58718B]">From admissions and timetables to attendance, grades, fees, events, and placements, SkillArc gives each team a clear way to get work done.</p></div>
        </section>

        <section className="bg-[#F7FAFC] px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><SectionEyebrow accent="navy">Feature library</SectionEyebrow><h2 className="mt-5 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">A connected set of workflows, organized around the work.</h2></div><div className="mt-12 grid gap-5 lg:grid-cols-2">{FEATURE_GROUPS.map((group, index) => <motion.article key={group.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.4, delay: index * 0.05 }}><ProductWindow title={group.label} label="Product capability" accent={group.accent}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-[#6D8498]">{group.label}</p><h3 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[#14234B]">{group.title}</h3></div><StatusPill accent={group.accent}>Connected</StatusPill></div><p className="mt-4 text-base leading-7 text-[#58718B]">{group.description}</p><div className="mt-6 grid gap-2 sm:grid-cols-3">{group.features.map((feature) => <div key={feature} className="flex items-start gap-2 rounded-xl border border-[#E2EAF0] bg-[#F8FBFD] px-3 py-3 text-sm font-semibold leading-5 text-[#31547A]"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#087F62]" aria-hidden="true" />{feature}</div>)}</div></ProductWindow></motion.article>)}</div></div></section>

        <TimetableDemo />
        <Analytics />
        <MultiInstitutionSection />

        <section className="bg-white px-5 py-16 sm:px-8 lg:py-20"><div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl border border-[#DCE6EE] bg-[#F0F5F8] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10"><div><p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6D8498]">See the connected picture</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#14234B]">Explore how the platform fits your university.</h2></div><Link href="/platform" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#14234B] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#31547A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] focus-visible:ring-offset-2">Explore the platform <ArrowRight size={16} aria-hidden="true" /></Link></div></section>
      </main>
    </MarketingShell>
  )
}
