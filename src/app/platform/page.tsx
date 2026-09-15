"use client"

import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, Network, ShieldCheck } from "lucide-react"
import Link from "next/link"
import Organization from "@/components/landing/organization"
import { InfrastructureSection } from "@/components/landing/cta"
import { MarketingShell, ProductWindow, SectionEyebrow, StatusPill } from "@/components/landing/marketing-ui"

export default function PlatformPage() {
  return (
    <MarketingShell>
      <main>
        <section className="relative overflow-hidden bg-[#14234B] px-5 py-20 text-white sm:px-8 lg:py-28">
          <div className="absolute -right-24 top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[#31547A]/50 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <SectionEyebrow accent="amber">How SkillArc fits your university</SectionEyebrow>
              <h1 className="mt-6 max-w-2xl text-5xl font-bold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">One connected workspace for every team.</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#D6E3EC]">Connect leadership, administrators, departments, faculty, students, and families around the work that keeps your university moving.</p>
              <Link href="/solutions" className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#14234B]">Explore solutions <ArrowRight size={16} aria-hidden="true" /></Link>
            </motion.div>

            <ProductWindow title="Shared university view" label="Illustrative workspace" accent="amber" className="bg-white/95">
              <div className="flex items-start justify-between gap-5"><div><p className="text-sm font-semibold text-[#6D8498]">University group overview</p><h2 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#14234B]">The right information, in the right hands.</h2></div><StatusPill accent="mint">Up to date</StatusPill></div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[{ label: "Institutions", value: "Connected" }, { label: "Teams", value: "Focused" }, { label: "Reports", value: "In one view" }].map((item) => <div key={item.label} className="rounded-2xl border border-[#E2EAF0] bg-[#F8FBFD] p-4"><p className="text-sm text-[#6D8498]">{item.label}</p><p className="mt-3 text-lg font-bold text-[#14234B]">{item.value}</p></div>)}
              </div>
              <div className="mt-6 flex items-center gap-2 border-t border-[#E4EBF1] pt-5 text-sm font-semibold text-[#31547A]"><Network size={16} className="text-[#C85D2E]" aria-hidden="true" /> Shared structure, role-aware workspaces</div>
            </ProductWindow>
          </div>
        </section>

        <section className="bg-[#F7FAFC] px-5 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3">
            {[{ title: "Shared records", description: "Keep the latest information together across the university.", icon: CheckCircle2 }, { title: "Role-based workspaces", description: "Give each team the context and tasks relevant to them.", icon: ShieldCheck }, { title: "Room to grow", description: "Support more programs, departments, and institutions without changing the whole workflow.", icon: Network }].map(({ title, description, icon: Icon }, index) => <motion.div key={title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.4, delay: index * 0.08 }} className="rounded-3xl border border-[#DCE6EE] bg-white p-6 shadow-[0_12px_36px_rgba(20,35,75,0.05)]"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF1F7] text-[#31547A]"><Icon size={18} aria-hidden="true" /></div><h2 className="mt-5 text-xl font-bold text-[#14234B]">{title}</h2><p className="mt-2 text-base leading-7 text-[#6D8498]">{description}</p></motion.div>)}
          </div>
        </section>

        <Organization />
        <InfrastructureSection />
      </main>
    </MarketingShell>
  )
}
