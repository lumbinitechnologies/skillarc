"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, BarChart3, ClipboardCheck, LayoutGrid, ShieldCheck } from "lucide-react"
import { FEATURE_GROUPS } from "@/components/landing/marketing-data"
import { ProductWindow } from "@/components/landing/marketing-ui"

export default function Ecosystem() {
  const [activeId, setActiveId] = useState(FEATURE_GROUPS[1].id)
  const active = FEATURE_GROUPS.find((group) => group.id === activeId) ?? FEATURE_GROUPS[1]

  return (
    <section className="bg-[#14234B] px-5 py-20 text-white sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-20">
          <div>
            <h2 className="mt-0 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">One platform, the priorities your teams actually manage.</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#D6E3EC]">Keep the whole university in view without asking every role to work from the same dashboard.</p>

            <div className="mt-9 space-y-2" role="tablist" aria-label="Connected university priorities">
              {FEATURE_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={active.id === group.id}
                  onClick={() => setActiveId(group.id)}
                  className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A48] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14234B] ${active.id === group.id ? "border-white/30 bg-white/12" : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.08]"}`}
                >
                  <span className="text-base font-semibold text-white">{group.label}</span>
                  <ArrowRight size={17} className={active.id === group.id ? "text-[#E07A48]" : "text-[#A9C2D7]"} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          <ProductWindow title="SkillArc university workspace" label="Illustrative workspace" accent={active.accent}>
            <AnimatePresence mode="wait">
              <motion.div key={active.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.24 }}>
                <div>
                  <div>
                    <p className="text-sm font-semibold text-[#6D8498]">{active.label}</p>
                    <h3 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-[#14234B]">{active.title}</h3>
                  </div>
                </div>
                <p className="mt-5 max-w-2xl text-base leading-7 text-[#58718B]">{active.description}</p>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {active.features.map((feature, index) => (
                    <div key={feature} className="rounded-2xl border border-[#E2EAF0] bg-[#F8FBFD] p-4">
                      <span className="text-sm font-bold text-[#C85D2E]">0{index + 1}</span>
                      <p className="mt-5 text-sm font-semibold leading-6 text-[#31547A]">{feature}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: LayoutGrid, label: "Organised work" },
                    { icon: ClipboardCheck, label: "Visible follow-up" },
                    { icon: BarChart3, label: "Useful reporting" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-[#E2EAF0] px-4 py-3 text-sm font-semibold text-[#31547A]">
                      <Icon size={16} className="text-[#087F62]" aria-hidden="true" /> {label}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-2 border-t border-[#E4EBF1] pt-5 text-sm font-semibold text-[#087F62]
                "><ShieldCheck size={16} aria-hidden="true" /> Access is matched to the role</div>
              </motion.div>
            </AnimatePresence>
          </ProductWindow>
        </div>
      </div>
    </section>
  )
}
