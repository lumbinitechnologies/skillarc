"use client"

import { CheckCircle2, Layers3, LockKeyhole, Users, Workflow } from "lucide-react"
import { ProductWindow } from "@/components/landing/marketing-ui"

export function SecuritySection() {
  return (
    <section className="bg-white px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
        <div>
          <h2 className="mt-0 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">The right people see the right information.</h2>
          <p className="mt-5 text-lg leading-8 text-[#58718B]">University administrators, department heads, faculty, students, and parents each get a focused view of the information relevant to their work and relationship.</p>
        </div>

        <ProductWindow title="Role-based workspace access" label="Illustrative workspace" accent="mint">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E7F6F0] text-[#087F62]"><LockKeyhole size={20} aria-hidden="true" /></div><div><p className="text-sm font-semibold text-[#6D8498]">Access matched to</p><h3 className="text-xl font-bold text-[#14234B]">Institution administrator</h3></div></div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {["Admissions", "Academic administration", "Student progress", "Placements"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#E2EAF0] bg-[#F8FBFD] px-4 py-4 text-sm font-semibold text-[#31547A]"><CheckCircle2 size={17} className="text-[#087F62]" aria-hidden="true" />{item}</div>
            ))}
          </div>
        </ProductWindow>
      </div>
    </section>
  )
}

export function MultiInstitutionSection() {
  return (
    <section className="bg-[#F0F5F8] px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:gap-20">
          <div>
            <h2 className="mt-0 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">One organization. Local control where it matters.</h2>
            <p className="mt-5 text-lg leading-8 text-[#58718B]">Keep a shared overview across institutions while each campus and department manages the daily work in its own context.</p>
          </div>

          <ProductWindow title="University group overview" label="Illustrative workspace" accent="terracotta">
            <div className="flex items-center gap-3 rounded-2xl bg-[#FBECE5] px-5 py-4"><Layers3 size={19} className="text-[#C85D2E]" aria-hidden="true" /><span className="text-sm font-bold text-[#14234B]">University group overview</span></div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {["Institution A", "Institution B", "Institution C"].map((institution) => (
                <div key={institution} className="rounded-2xl border border-[#DCE6EE] bg-white p-5"><p className="text-sm font-bold text-[#14234B]">{institution}</p><div className="mt-5 space-y-2 text-sm text-[#58718B]"><p className="flex items-center gap-2"><Workflow size={14} className="text-[#31547A]" aria-hidden="true" /> Departments</p><p className="flex items-center gap-2"><Users size={14} className="text-[#C85D2E]" aria-hidden="true" /> Programs & courses</p></div></div>
              ))}
            </div>
            <p className="mt-6 flex items-center gap-2 border-t border-[#E4EBF1] pt-5 text-sm font-semibold text-[#31547A]"><CheckCircle2 size={16} className="text-[#087F62]" aria-hidden="true" /> One shared view, local control</p>
          </ProductWindow>
        </div>
      </div>
    </section>
  )
}

export function InfrastructureSection() {
  const items = [
    { label: "One shared view", sub: "Keep important updates together", icon: Workflow },
    { label: "Clear responsibilities", sub: "Give each team the right view", icon: Users },
    { label: "Consistent records", sub: "Work from the same information", icon: CheckCircle2 },
    { label: "Room to grow", sub: "Support more programs and campuses", icon: Layers3 },
  ]

  return (
    <section className="bg-[#F7FAFC] px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
        <div>
          <h2 className="mt-0 text-4xl font-bold tracking-[-0.05em] text-[#14234B] sm:text-5xl">A dependable workspace for the way universities work.</h2>
          <p className="mt-5 text-lg leading-8 text-[#58718B]">Organize the structure behind the university, then give each team a practical way to act on what they see.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(({ label, sub, icon: Icon }) => (
            <div key={label} className="rounded-3xl border border-[#DCE6EE] bg-white p-6 shadow-[0_12px_36px_rgba(20,35,75,0.05)]"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF1F7] text-[#31547A]"><Icon size={18} aria-hidden="true" /></div><h3 className="mt-5 text-lg font-bold text-[#14234B]">{label}</h3><p className="mt-2 text-base leading-7 text-[#6D8498]">{sub}</p></div>
          ))}
        </div>
      </div>
    </section>
  )
}
