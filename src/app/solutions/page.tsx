"use client"

import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import Roles from "@/components/landing/roles"
import { SecuritySection } from "@/components/landing/cta"
import { MarketingShell, SectionEyebrow } from "@/components/landing/marketing-ui"

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <main>
        <section className="relative overflow-hidden bg-[#14234B] px-5 py-20 text-white sm:px-8 lg:py-28">
          <div className="absolute bottom-[-11rem] right-[-6rem] h-[32rem] w-[32rem] rounded-full bg-[#C85D2E]/20 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-20">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <SectionEyebrow accent="amber">University teams, working together</SectionEyebrow>
              <h1 className="mt-6 max-w-2xl text-5xl font-bold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">One clear view for every team supporting students.</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#D6E3EC]">Give each role the information and tools relevant to them while keeping the whole university connected around the student journey.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link href="#role-solutions" className="inline-flex items-center gap-2 rounded-full bg-[#C85D2E] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#E07A48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#14234B]">Explore role solutions <ArrowRight size={16} aria-hidden="true" /></Link><Link href="/features" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">View features</Link></div>
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-2">
              {["University leadership", "Institution administrators", "Department & program heads", "Faculty, students & families"].map((item, index) => <div key={item} className="rounded-3xl border border-white/15 bg-white/[0.08] p-5 backdrop-blur-sm"><span className="text-sm font-bold text-[#E07A48]">0{index + 1}</span><p className="mt-8 text-lg font-semibold leading-7 text-white">{item}</p><p className="mt-2 text-sm leading-6 text-[#A9C2D7]">A focused workspace with the context to act.</p></div>)}
            </div>
          </div>
        </section>

        <section id="role-solutions" className="scroll-mt-20"><Roles /></section>

        <section className="bg-white px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">{[{ title: "Less status-chasing", detail: "Keep the latest information in view for the team responsible.", icon: CheckCircle2 }, { title: "More useful follow-through", detail: "Turn attendance, assessments, admissions, and placements into clear next steps.", icon: ArrowRight }, { title: "A shared student journey", detail: "Connect the work across offices without flattening every role into one view.", icon: CheckCircle2 }].map(({ title, detail, icon: Icon }, index) => <motion.div key={title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.4, delay: index * 0.08 }} className="rounded-3xl border border-[#DCE6EE] bg-[#F8FBFD] p-6"><Icon size={20} className="text-[#C85D2E]" aria-hidden="true" /><h2 className="mt-5 text-xl font-bold text-[#14234B]">{title}</h2><p className="mt-2 text-base leading-7 text-[#6D8498]">{detail}</p></motion.div>)}</div></section>

        <SecuritySection />
      </main>
    </MarketingShell>
  )
}
