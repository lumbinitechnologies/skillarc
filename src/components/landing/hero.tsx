"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUpRight, Check, Terminal, Activity, Briefcase } from "lucide-react"

const INSTRUMENTS = [
  {
    id: "01",
    title: "Visual Timetable Scheduler",
    subtitle: "Collision-free academic routing",
    desc: "Drag-and-drop course schedules with real-time collision-checking guardrails. Automatically reviews faculty workload and room capacity.",
    status: "ACTIVE",
    tag: "timetable_engine.sh",
  },
  {
    id: "02",
    title: "Real-Time Class Telemetry",
    subtitle: "Automated attendance tracking",
    desc: "Instant roll call with automated reports below the attendance threshold. Tracks progress logs and student engagement parameters.",
    status: "92.4% AVG",
    tag: "attendance_telemetry.sh",
  },
  {
    id: "03",
    title: "Unified Placements Registry",
    subtitle: "Direct corporate sync",
    desc: "Match student qualifications with active job requirements directly. Streamline recruiter onboarding, resume parsing, and interview feeds.",
    status: "34 APPS",
    tag: "placement_sync.sh",
  },
]

export default function Hero() {
  const [active, setActive] = useState(0)

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600;1,700&family=Space+Grotesk:wght@500;700;800;900&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <div className="bg-[#EFEAD8] text-[#0B132B] relative overflow-hidden font-['Space_Grotesk',sans-serif] selection:bg-[#E57D37] selection:text-[#EFEAD8]">

        {/* 1. Main Hero Section */}
        <section className="relative min-h-screen pt-32 px-6 sm:px-12 md:px-16 flex flex-col justify-between z-10 border-b border-[#0B132B]/20">

          {/* Headline Display Block */}
          <div className="my-auto py-16 z-10 relative">

            {/* Kinetic Floating Badge */}
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [2, 5, 2] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[8%] right-[5%] hidden lg:block select-none pointer-events-none"
            >
              <div className="px-5 py-2.5 rounded-xl bg-[#0B132B] text-[#EFEAD8] font-['Space_Mono',monospace] text-xs tracking-widest uppercase shadow-2xl border border-white/10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E57D37] animate-ping" />
                <span>Zero-Latency Sync</span>
              </div>
            </motion.div>

            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[105px] leading-[0.9] font-black uppercase tracking-tight text-[#0B132B]">
              <span>EVERYTHING YOUR </span>
              <br />
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#0B132B] text-[#EFEAD8] text-xs font-['Space_Mono',monospace] tracking-widest uppercase align-middle mr-4 shadow-xl select-none font-bold">
                <span className="w-2 h-2 rounded-full bg-[#E57D37]" />
                ✦ OS CORE
              </span>
              <span className="font-['Playfair_Display',serif] italic font-bold text-[#E57D37] lowercase text-6xl sm:text-8xl md:text-9xl tracking-normal">
                institution{" "}
              </span>
              <span className="text-[#0B132B]">NEEDS.</span>
              <br />
              <span className="font-light tracking-widest text-[#0B132B]/80">ONE PLATFORM.</span>
            </h1>

            {/* Subtext and Main CTA */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-end w-full">
              <p className="md:col-span-6 font-['Space_Mono',monospace] text-xs text-[#0B132B]/90 leading-relaxed uppercase tracking-wider font-bold">
                {"{ SkillArc unifies institutions, departments, programs, faculty, and students into a singular high-performance visual architecture. }"}
              </p>

              <div className="md:col-span-6 flex justify-start md:justify-end">
                <button
                  onClick={() => {
                    document.getElementById("instruments-section")?.scrollIntoView({ behavior: "smooth" })
                  }}
                  className="group relative flex items-center gap-4 px-8 py-4 rounded-full bg-[#0B132B] text-[#EFEAD8] hover:bg-[#E57D37] transition-all duration-300 shadow-2xl"
                >
                  <span className="font-['Space_Mono',monospace] text-xs uppercase tracking-widest font-bold">
                    EXPLORE SHOWCASE
                  </span>
                  <ArrowUpRight className="text-[#EAAD62] group-hover:text-[#EFEAD8] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="py-5 border-t border-[#0B132B]/20 flex justify-between items-center font-['Space_Mono',monospace] text-xs text-[#0B132B] font-bold">
            <span>SCROLL TO UNCOVER CORE INSTRUMENTS</span>
            <span>01 — 03</span>
          </div>
        </section>

        {/* 2. Structured Interactive Core Instruments Section */}
        <section id="instruments-section" className="relative z-10 py-28 bg-[#EFEAD8]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 pb-6 border-b border-[#0B132B]/20">
              <div>
                <div className="font-['Space_Mono',monospace] text-xs text-[#3A6DAF] tracking-[0.2em] uppercase mb-2 flex items-center gap-2 font-bold">
                  <span className="text-[#E57D37]">//</span>
                  <span>[ MODULE ARCHITECTURE ]</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-[#0B132B]">
                  Core Instruments.
                </h2>
              </div>
              <p className="font-['Space_Mono',monospace] text-xs text-[#0B132B]/70 max-w-xs mt-4 md:mt-0 uppercase font-bold">
                Hover over modules to inspect real-time node processing output.
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-12 items-start">

              {/* Left Column: Interactive Cards */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                {INSTRUMENTS.map((item, idx) => {
                  const isActive = active === idx
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => setActive(idx)}
                      className={`cursor-pointer p-8 rounded-3xl transition-all duration-300 border-2 ${isActive
                          ? "bg-[#0B132B] text-[#EFEAD8] border-[#0B132B] shadow-2xl scale-[1.02]"
                          : "bg-transparent text-[#0B132B] border-[#0B132B]/20 hover:border-[#0B132B]/60 hover:bg-white/40"
                        }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <span className={`font-['Space_Mono',monospace] text-xs font-bold px-3 py-1 rounded-full ${isActive ? "bg-white/10 text-[#EAAD62]" : "bg-[#0B132B]/10 text-[#3A6DAF]"}`}>
                            {item.id}
                          </span>
                          <span className={`font-['Space_Mono',monospace] text-[10px] uppercase tracking-widest font-bold ${isActive ? "text-[#EAAD62]" : "text-[#0B132B]/60"}`}>
                            {item.subtitle}
                          </span>
                        </div>
                        <span className={`font-['Space_Mono',monospace] text-[11px] uppercase px-3 py-1 rounded-full font-bold border ${isActive
                            ? "bg-[#E57D37] text-[#EFEAD8] border-[#E57D37]"
                            : "bg-transparent text-[#0B132B]/70 border-[#0B132B]/20"
                          }`}>
                          {item.status}
                        </span>
                      </div>

                      <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-3">
                        {item.title}
                      </h3>

                      <p className={`font-['Space_Mono',monospace] text-xs leading-relaxed font-bold ${isActive ? "text-[#EFEAD8]/80" : "text-[#0B132B]/70"}`}>
                        {item.desc}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Right Column: Embedded Dynamic Console */}
              <div className="lg:col-span-6 lg:sticky lg:top-32">
                <div className="w-full aspect-[4/3] bg-[#0B132B] text-[#EFEAD8] border-2 border-[#0B132B] rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">

                  {/* Console Top Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-white/15">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#E57D37]" />
                      <span className="w-3 h-3 rounded-full bg-[#EAAD62]" />
                      <span className="w-3 h-3 rounded-full bg-[#3A6DAF]" />
                      <span className="text-xs font-['Space_Mono',monospace] text-[#94BAC4] uppercase tracking-widest ml-2 font-bold">
                        {INSTRUMENTS[active].tag}
                      </span>
                    </div>
                    <span className="text-[10px] border border-white/20 bg-white/10 px-3 py-1 rounded-full font-['Space_Mono',monospace] text-[#EFEAD8] font-bold">
                      LIVE NODE ACTIVE
                    </span>
                  </div>

                  {/* Dynamic Console Body */}
                  <div className="flex-1 py-6 flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                      {active === 0 && (
                        <motion.div
                          key="t-engine"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="space-y-4 font-['Space_Mono',monospace] text-xs"
                        >
                          <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-[#94BAC4] pb-2 font-bold uppercase border-b border-white/10">
                            <span>Time Slot</span>
                            <span>Dept A</span>
                            <span>Dept B</span>
                            <span>Assigned Room</span>
                          </div>
                          {[
                            { time: "09:00 - 10:00", csa: "Algorithms", csb: "Databases", fac: "LH-101" },
                            { time: "10:00 - 11:00", csa: "Operating Sys", csb: "Networks", fac: "LH-204" },
                            { time: "11:00 - 12:00", csa: "AI / ML Lab", csb: "Cyber Security", fac: "Lab-03" },
                          ].map((row, idx) => (
                            <div key={idx} className="grid grid-cols-4 gap-2 text-center items-center py-3 bg-white/5 border border-white/10 rounded-xl">
                              <span className="text-[#94BAC4] text-[10px] font-bold">{row.time}</span>
                              <span className="text-[#E57D37] font-bold">{row.csa}</span>
                              <span className="text-[#EFEAD8]">{row.csb}</span>
                              <span className="text-[10px] text-[#EAAD62] font-bold">{row.fac}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-2 text-[10px] text-[#EAAD62] font-bold">
                            <span>Collision Guardrails: Verified</span>
                            <span className="flex items-center gap-1 text-[#94BAC4]">
                              <Check size={12} className="text-[#E57D37]" /> 0 Conflicts
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {active === 1 && (
                        <motion.div
                          key="t-telemetry"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="space-y-6 font-['Space_Mono',monospace]"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[#94BAC4] font-bold">Campus-Wide Attendance Index</span>
                            <span className="text-3xl font-black text-[#EAAD62]">92.4%</span>
                          </div>
                          <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden border border-white/10">
                            <div className="bg-gradient-to-r from-[#3A6DAF] via-[#EAAD62] to-[#E57D37] h-full w-[92.4%]" />
                          </div>
                          <div className="p-4 bg-[#E57D37]/15 border border-[#E57D37]/40 rounded-2xl flex justify-between items-center">
                            <div>
                              <span className="text-[10px] text-[#94BAC4] uppercase tracking-wider block font-bold">Automated Alert Dispatched</span>
                              <span className="text-xs text-[#EFEAD8] font-bold">Department of Computer Science (Batch A)</span>
                            </div>
                            <span className="text-[10px] text-[#E57D37] bg-[#E57D37]/20 px-3 py-1 rounded-full font-bold border border-[#E57D37]/40">
                              Threshold Met
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {active === 2 && (
                        <motion.div
                          key="t-placements"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="space-y-4 font-['Space_Mono',monospace]"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-white/10 text-xs text-[#94BAC4] font-bold">
                            <span>ACTIVE RECRUITER DRIVES</span>
                            <span className="text-[#E57D37]">Live Sync</span>
                          </div>
                          {[
                            { company: "Stripe", role: "Software Architect", match: "94% Match" },
                            { company: "Vercel", role: "Frontend Res. Engineer", match: "91% Match" },
                          ].map((job) => (
                            <div key={job.company} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-xl bg-[#3A6DAF]/40 text-[#EFEAD8] border border-white/20 flex items-center justify-center font-bold text-xs">
                                  {job.company[0]}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-[#EFEAD8]">{job.company}</h4>
                                  <p className="text-[10px] text-[#94BAC4]">{job.role}</p>
                                </div>
                              </div>
                              <span className="text-[10px] text-[#EAAD62] bg-[#EAAD62]/10 px-3 py-1 rounded-full font-bold border border-[#EAAD62]/30">
                                {job.match}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Console Footer */}
                  <div className="pt-4 border-t border-white/15 flex justify-between items-center text-[10px] font-['Space_Mono',monospace] text-[#94BAC4] font-bold">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#E57D37] animate-pulse" />
                      <span>Secure Uplink Connected</span>
                    </span>
                    <span>Port 443 // SSL</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Brand Ticker */}
            <div className="pt-24 mt-20 border-t border-[#0B132B]/20 text-center">
              <span className="inline-block text-[10px] font-bold tracking-[0.25em] text-[#0B132B]/60 uppercase mb-8 font-['Space_Mono',monospace]">
                &#123; TRUSTED BY LEADING ACADEMIC INSTITUTIONS &#125;
              </span>
              <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-80">
                <span className="text-xs font-bold tracking-widest uppercase font-['Space_Mono',monospace]">VERCEL UNIV</span>
                <span className="text-xs font-bold tracking-widest uppercase font-['Space_Mono',monospace]">SUPABASE TECH</span>
                <span className="text-xs font-bold tracking-widest uppercase font-['Space_Mono',monospace]">NEXTPOLYTECH</span>
                <span className="text-xs font-bold tracking-widest uppercase font-['Space_Mono',monospace]">Y-COMBINATOR ED</span>
              </div>
            </div>

          </div>
        </section>
      </div>
    </>
  )
}