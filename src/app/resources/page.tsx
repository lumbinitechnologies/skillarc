"use client"

import { motion } from "framer-motion"
import { ArrowRight, BookOpen, FileText, ShieldCheck, Users } from "lucide-react"
import Link from "next/link"
import { DEMO_URL } from "@/components/landing/marketing-data"
import { MarketingShell, SectionEyebrow, SoftCard } from "@/components/landing/marketing-ui"

const resources = [
  { title: "Platform overview", description: "See how SkillArc connects university structure, role-based workspaces, and everyday follow-through.", label: "Start here", href: "/platform", icon: BookOpen, accent: "text-[#31547A] bg-[#EAF1F7]" },
  { title: "Solutions by role", description: "Explore what university leadership, administrators, department heads, faculty, students, and families see.", label: "For every team", href: "/solutions", icon: Users, accent: "text-[#C85D2E] bg-[#FBECE5]" },
  { title: "Feature library", description: "Review the capabilities behind admissions, timetables, attendance, grades, events, billing, and placements.", label: "Explore capabilities", href: "/features", icon: FileText, accent: "text-[#087F62] bg-[#E7F6F0]" },
  { title: "Security, privacy, and access", description: "Talk with our team about role-based workspaces and how information is kept relevant to each role.", label: "Talk to the team", href: DEMO_URL, external: true, icon: ShieldCheck, accent: "text-[#A66314] bg-[#FFF5DE]" },
]

export default function ResourcesPage() {
  return (
    <MarketingShell>
      <main>
        <section className="relative overflow-hidden bg-[#14234B] px-5 py-20 text-white sm:px-8 lg:py-28"><div className="absolute left-[-8rem] top-[-9rem] h-[30rem] w-[30rem] rounded-full bg-[#31547A]/50 blur-3xl" aria-hidden="true" /><div className="relative mx-auto max-w-7xl"><SectionEyebrow accent="amber">A useful starting point</SectionEyebrow><h1 className="mt-6 max-w-4xl text-5xl font-bold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Clear answers for university teams.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[#D6E3EC]">Start with the overview that matches your role, then explore the workflows behind a more connected student journey.</p></div></section>

        <section className="bg-[#F7FAFC] px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><SectionEyebrow accent="navy">Resource hub</SectionEyebrow><h2 className="mt-5 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">Find the next useful answer.</h2><p className="mt-5 text-lg leading-8 text-[#58718B]">A practical orientation to the platform, the people it supports, and the work it connects.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2">{resources.map((resource, index) => { const Icon = resource.icon; return <motion.div key={resource.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.4, delay: index * 0.06 }}><SoftCard className="flex h-full flex-col justify-between"><div><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${resource.accent}`}><Icon size={20} aria-hidden="true" /></div><p className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-[#6D8498]">{resource.label}</p><h3 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[#14234B]">{resource.title}</h3><p className="mt-4 text-base leading-7 text-[#58718B]">{resource.description}</p></div>{resource.external ? <a href={resource.href} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#C85D2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]">Open conversation <ArrowRight size={16} aria-hidden="true" /></a> : <Link href={resource.href} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#C85D2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]">Explore {resource.title.toLowerCase()} <ArrowRight size={16} aria-hidden="true" /></Link>}</SoftCard></motion.div>})}</div></div></section>

        <section className="bg-white px-5 py-16 sm:px-8 lg:py-20"><div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-3xl border border-[#DCE6EE] bg-[#F0F5F8] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10"><div><p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6D8498]">Need a university-specific conversation?</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#14234B]">Talk with the SkillArc team.</h2><p className="mt-3 max-w-xl text-base leading-7 text-[#58718B]">Bring your current workflow, campus structure, and student-support priorities. We’ll show you where the platform fits.</p></div><a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#C85D2E] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#A94B22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] focus-visible:ring-offset-2">Book a demo <ArrowRight size={16} aria-hidden="true" /></a></div></section>
      </main>
    </MarketingShell>
  )
}
