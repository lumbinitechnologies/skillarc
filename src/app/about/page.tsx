"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, CheckCircle2, HeartHandshake, Lightbulb, Workflow } from "lucide-react"
import { DEMO_URL } from "@/components/landing/marketing-data"
import { MarketingShell, SectionEyebrow, SoftCard } from "@/components/landing/marketing-ui"

const principles = [
  { title: "Clearer operations", description: "Give university teams one place to manage the work in front of them.", icon: Workflow, accent: "bg-[#EAF1F7] text-[#31547A]" },
  { title: "Connected student support", description: "Help staff, students, and families stay aligned around progress.", icon: HeartHandshake, accent: "bg-[#E7F6F0] text-[#087F62]" },
  { title: "Practical innovation", description: "Use technology where it makes everyday university work simpler.", icon: Lightbulb, accent: "bg-[#FBECE5] text-[#C85D2E]" },
]

export default function AboutPage() {
  return (
    <MarketingShell>
      <main>
        <section className="relative overflow-hidden bg-white px-5 py-20 sm:px-8 lg:py-28"><div className="absolute right-[-9rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[#FBECE5] blur-3xl" aria-hidden="true" /><div className="relative mx-auto max-w-7xl"><SectionEyebrow>Our mission</SectionEyebrow><h1 className="mt-6 max-w-4xl text-5xl font-bold leading-[1.04] tracking-[-0.055em] text-[#14234B] sm:text-6xl lg:text-7xl">Built for better university experiences.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[#58718B]">SkillArc helps universities spend less time reconciling disconnected processes and more time supporting students.</p></div></section>

        <section className="bg-[#F7FAFC] px-5 py-16 sm:px-8 lg:py-20"><div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">{principles.map(({ title, description, icon: Icon, accent }, index) => <motion.div key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.4, delay: index * 0.08 }}><SoftCard className="h-full"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}><Icon size={20} aria-hidden="true" /></div><p className="mt-6 text-sm font-bold text-[#6D8498]">0{index + 1}</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[#14234B]">{title}</h2><p className="mt-3 text-base leading-7 text-[#58718B]">{description}</p></SoftCard></motion.div>)}</div></section>

        <section className="bg-white px-5 py-20 sm:px-8 lg:py-28"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-start lg:gap-20"><div><SectionEyebrow accent="navy">Why we build SkillArc</SectionEyebrow><h2 className="mt-5 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">Universities deserve software that respects the people doing the work.</h2></div><div className="space-y-5 text-lg leading-8 text-[#58718B]"><p>Academic management should not depend on scattered spreadsheets, repeated email chains, or different answers in different offices.</p><p>SkillArc brings the everyday work of admissions, academic administration, teaching, attendance, student progress, and placements into one connected experience.</p><p>We focus on making complex university processes easier to understand, easier to manage, and easier for students and families to follow.</p></div></div></section>

        <section className="bg-[#F0F5F8] px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><SectionEyebrow accent="terracotta">What we focus on</SectionEyebrow><h2 className="mt-5 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">The work behind a better student journey.</h2></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{ title: "Admissions", detail: "Move applications toward enrolment." }, { title: "Academic work", detail: "Keep programs, courses, faculty, and schedules aligned." }, { title: "Student progress", detail: "Make attendance, learning, and grades easier to follow." }, { title: "University community", detail: "Connect families, events, and placements to the student journey." }].map((item) => <div key={item.title} className="rounded-2xl border border-[#DCE6EE] bg-white p-5"><CheckCircle2 size={18} className="text-[#087F62]" aria-hidden="true" /><h3 className="mt-5 text-lg font-bold text-[#14234B]">{item.title}</h3><p className="mt-2 text-base leading-7 text-[#6D8498]">{item.detail}</p></div>)}</div></div></section>

        <section className="bg-white px-5 py-16 sm:px-8 lg:py-20"><div className="mx-auto flex max-w-3xl flex-col items-center text-center"><SectionEyebrow accent="terracotta">Talk with our team</SectionEyebrow><h2 className="mt-5 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">See what SkillArc could do for your university.</h2><a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#C85D2E] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#A94B22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] focus-visible:ring-offset-2">Book a demo <ArrowUpRight size={16} aria-hidden="true" /></a></div></section>
      </main>
    </MarketingShell>
  )
}
