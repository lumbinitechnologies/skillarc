"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUpRight, Check, Activity, Sparkles, Layers } from "lucide-react"

const INSTRUMENTS = [
  {
    id: "01",
    title: "Visual Timetable Scheduler",
    subtitle: "Collision-free academic routing",
    desc: "Drag-and-drop course schedules with real-time collision-checking guardrails. Automatically reviews faculty workload and room capacity.",
    status: "ACTIVE",
  },
  {
    id: "02",
    title: "Real-Time Class Telemetry",
    subtitle: "Automated attendance tracking",
    desc: "Instant roll call with automated reports below the attendance threshold. Tracks progress logs and student engagement parameters.",
    status: "92.4% AVG",
  },
  {
    id: "03",
    title: "Unified Placements Registry",
    subtitle: "Direct corporate sync",
    desc: "Match student qualifications with active job requirements directly. Streamline recruiter onboarding, resume parsing, and interview feeds.",
    status: "34 APPS",
  },
]

const heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
}

const lineVariants = {
  hidden: { y: 35, opacity: 0, filter: "blur(6px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 16,
    },
  },
}

export default function Hero() {
  const [active, setActive] = useState(0)

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600;1,700&family=Space+Grotesk:wght@500;700;800;900&display=swap"
        rel="stylesheet"
      />

      <div className="bg-[#EFEAD8] text-[#0B132B] relative overflow-hidden font-['Space_Grotesk',sans-serif] selection:bg-[#E57D37] selection:text-[#EFEAD8]">
        {/* Seamless Gradient Transition Bridge from Dark Book Sequence */}
        <div className="absolute top-0 inset-x-0 h-32 sm:h-48 bg-gradient-to-b from-[#050505] via-[#0B132B]/40 to-transparent pointer-events-none z-10" />

        {/* Subtle Architectural Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0B132B08_1px,transparent_1px),linear-gradient(to_bottom,#0B132B08_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

        {/* 1. Main Hero Section */}
        <section className="relative min-h-screen pt-36 sm:pt-44 px-6 sm:px-12 md:px-16 flex flex-col justify-between z-10 border-b border-[#0B132B]/15">
          {/* Top Ambient Light Flare */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#E57D37]/10 rounded-full blur-[140px] pointer-events-none" />

          {/* Headline Display Block */}
          <motion.div
            variants={heroVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="my-auto py-12 sm:py-16 z-10 relative"
          >
            {/* Kinetic Floating Live Sync Badge */}
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [2, 4, 2] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[4%] right-[4%] hidden lg:block select-none pointer-events-none"
            >
              <div className="px-5 py-3 rounded-2xl bg-[#0B132B] text-[#EFEAD8] text-xs tracking-widest uppercase shadow-[0_20px_40px_rgba(11,19,43,0.3)] border border-white/15 flex items-center gap-2.5 backdrop-blur-xl font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E57D37] animate-ping" />
                <span>Zero-Latency Sync</span>
              </div>
            </motion.div>

            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[108px] leading-[0.9] font-black uppercase tracking-tight text-[#0B132B]">
              <motion.span variants={lineVariants} className="block">
                EVERYTHING YOUR
              </motion.span>
              <motion.span variants={lineVariants} className="block mt-2 sm:mt-3">
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0B132B] text-[#EFEAD8] text-xs tracking-widest uppercase align-middle mr-4 shadow-xl select-none font-bold hover:scale-105 transition-transform">
                  <span className="w-2 h-2 rounded-full bg-[#E57D37]" />
                  ✦ OS CORE
                </span>
                <span className="font-['Playfair_Display',serif] italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#E57D37] via-[#EAAD62] to-[#E57D37] lowercase text-6xl sm:text-8xl md:text-9xl tracking-normal">
                  institution{" "}
                </span>
                <span className="text-[#0B132B]">NEEDS.</span>
              </motion.span>
              <motion.span variants={lineVariants} className="block mt-2 sm:mt-3 font-light tracking-widest text-[#0B132B]/85">
                ONE PLATFORM.
              </motion.span>
            </h1>

            {/* Subtext and Main CTA */}
            <motion.div variants={lineVariants} className="mt-14 sm:mt-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-end w-full">
              <p className="md:col-span-6 text-sm sm:text-base text-[#0B132B]/85 leading-relaxed font-semibold">
                SkillArc unifies institutions, departments, programs, faculty, and students into a singular high-performance academic architecture.
              </p>

              <div className="md:col-span-6 flex justify-start md:justify-end">
                <button
                  onClick={() => {
                    document.getElementById("instruments-section")?.scrollIntoView({ behavior: "smooth" })
                  }}
                  className="group relative flex items-center gap-4 px-9 py-4.5 rounded-full bg-[#0B132B] text-[#EFEAD8] hover:bg-[#E57D37] transition-all duration-300 shadow-[0_15px_35px_rgba(11,19,43,0.25)] hover:shadow-[0_15px_35px_rgba(229,125,55,0.4)] cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-xs uppercase tracking-widest font-bold">
                    EXPLORE SHOWCASE
                  </span>
                  <ArrowUpRight className="text-[#EAAD62] group-hover:text-[#EFEAD8] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </button>
              </div>
            </motion.div>
          </motion.div>

          {/* Section Indicator Bar */}
          <div className="py-5 border-t border-[#0B132B]/15 flex justify-between items-center text-xs text-[#0B132B] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E57D37]" />
              Core Institutional Modules
            </span>
            <span>01 — 03</span>
          </div>
        </section>

        {/* 2. Structured Interactive Core Instruments Section */}
        <section id="instruments-section" className="relative z-10 py-24 sm:py-28 bg-[#EFEAD8]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 pb-6 border-b border-[#0B132B]/15"
            >
              <div>
                <div className="text-xs text-[#3A6DAF] tracking-[0.2em] uppercase mb-2 flex items-center gap-2 font-bold">
                  <span className="text-[#E57D37]">//</span>
                  <span>MODULE ARCHITECTURE</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-[#0B132B]">
                  Core Instruments.
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#0B132B]/70 max-w-xs mt-4 md:mt-0 font-medium">
                Select an instrument to inspect real-time module performance and live telemetry output.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-12 gap-10 items-start">
              {/* Left Column: Interactive Cards */}
              <div className="lg:col-span-6 flex flex-col gap-5">
                {INSTRUMENTS.map((item, idx) => {
                  const isActive = active === idx
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 25 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.4, delay: idx * 0.08 }}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => setActive(idx)}
                      className={`cursor-pointer p-7 sm:p-8 rounded-3xl transition-all duration-300 border-2 ${
                        isActive
                          ? "bg-[#0B132B] text-[#EFEAD8] border-[#0B132B] shadow-[0_20px_50px_rgba(11,19,43,0.3)] scale-[1.02]"
                          : "bg-white/30 text-[#0B132B] border-[#0B132B]/15 hover:border-[#0B132B]/50 hover:bg-white/60 backdrop-blur-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${
                              isActive ? "bg-white/10 text-[#EAAD62]" : "bg-[#0B132B]/10 text-[#3A6DAF]"
                            }`}
                          >
                            {item.id}
                          </span>
                          <span
                            className={`text-xs uppercase tracking-wider font-semibold ${
                              isActive ? "text-[#EAAD62]" : "text-[#0B132B]/60"
                            }`}
                          >
                            {item.subtitle}
                          </span>
                        </div>
                        <span
                          className={`text-xs uppercase px-3 py-1 rounded-full font-bold border ${
                            isActive
                              ? "bg-[#E57D37] text-[#EFEAD8] border-[#E57D37] shadow-lg shadow-[#E57D37]/30"
                              : "bg-transparent text-[#0B132B]/70 border-[#0B132B]/20"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-3">
                        {item.title}
                      </h3>

                      <p
                        className={`text-xs sm:text-sm leading-relaxed font-medium ${
                          isActive ? "text-[#EFEAD8]/80" : "text-[#0B132B]/70"
                        }`}
                      >
                        {item.desc}
                      </p>
                    </motion.div>
                  )
                })}
              </div>

              {/* Right Column: Embedded Dynamic Console */}
              <div className="lg:col-span-6 lg:sticky lg:top-32">
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                  className="w-full aspect-[4/3] bg-[#070B14] text-[#EFEAD8] border-2 border-[#0B132B] rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.35)] flex flex-col justify-between relative overflow-hidden backdrop-blur-2xl"
                >
                  {/* Console Top Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-white/15">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#E57D37]" />
                      <span className="w-3 h-3 rounded-full bg-[#EAAD62]" />
                      <span className="w-3 h-3 rounded-full bg-[#1690C7]" />
                      <span className="text-xs uppercase tracking-wider ml-2 font-bold text-[#EFEAD8]/70">
                        {INSTRUMENTS[active].title}
                      </span>
                    </div>
                    <span className="text-xs border border-white/20 bg-white/10 px-3 py-1 rounded-full text-[#EFEAD8] font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                      Live Active
                    </span>
                  </div>

                  {/* Dynamic Console Body */}
                  <div className="flex-1 py-6 flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                      {active === 0 && (
                        <motion.div
                          key="t-engine"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-3 text-xs"
                        >
                          <div className="grid grid-cols-4 gap-2 text-center text-xs text-[#EFEAD8]/60 pb-2 font-bold uppercase border-b border-white/10">
                            <span>Time Slot</span>
                            <span>Dept A</span>
                            <span>Dept B</span>
                            <span>Room</span>
                          </div>
                          {[
                            { time: "09:00 - 10:00", csa: "Algorithms", csb: "Databases", fac: "LH-101" },
                            { time: "10:00 - 11:00", csa: "Operating Sys", csb: "Networks", fac: "LH-204" },
                            { time: "11:00 - 12:00", csa: "AI / ML Lab", csb: "Cyber Security", fac: "Lab-03" },
                          ].map((row, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-4 gap-2 text-center items-center py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                            >
                              <span className="text-white/60 text-xs font-semibold">{row.time}</span>
                              <span className="text-[#E57D37] font-bold">{row.csa}</span>
                              <span className="text-[#EFEAD8]">{row.csb}</span>
                              <span className="text-xs text-[#EAAD62] font-bold">{row.fac}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-2 text-xs text-[#EAAD62] font-bold">
                            <span>Collision Guardrails: Verified</span>
                            <span className="flex items-center gap-1.5 text-[#10B981]">
                              <Check size={13} className="text-[#10B981]" /> 0 Conflicts
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {active === 1 && (
                        <motion.div
                          key="t-telemetry"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-5"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-white/70 font-bold uppercase tracking-wider">
                              Campus-Wide Attendance Index
                            </span>
                            <span className="text-3xl font-black text-[#EAAD62]">92.4%</span>
                          </div>
                          <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden border border-white/10 p-[1px]">
                            <div className="bg-gradient-to-r from-[#1690C7] via-[#EAAD62] to-[#E57D37] h-full rounded-full w-[92.4%] shadow-[0_0_12px_#E57D37]" />
                          </div>
                          <div className="p-4 bg-[#E57D37]/15 border border-[#E57D37]/40 rounded-2xl flex justify-between items-center">
                            <div>
                              <span className="text-xs text-white/60 uppercase tracking-wider block font-bold">
                                Automated Report Generated
                              </span>
                              <span className="text-xs sm:text-sm text-[#EFEAD8] font-bold">
                                Department of Computer Science (Batch A)
                              </span>
                            </div>
                            <span className="text-xs text-[#E57D37] bg-[#E57D37]/20 px-3 py-1 rounded-full font-bold border border-[#E57D37]/40">
                              Threshold Met
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {active === 2 && (
                        <motion.div
                          key="t-placements"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-3"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-white/10 text-xs text-white/70 font-bold uppercase tracking-wider">
                            <span>Active Recruiter Drives</span>
                            <span className="text-[#E57D37] flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" /> Live Sync
                            </span>
                          </div>
                          {[
                            { company: "Stripe", role: "Software Architect", match: "94% Match" },
                            { company: "Vercel", role: "Frontend Res. Engineer", match: "91% Match" },
                          ].map((job) => (
                            <div
                              key={job.company}
                              className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-xl bg-[#1690C7]/30 text-[#EFEAD8] border border-white/20 flex items-center justify-center font-bold text-xs">
                                  {job.company[0]}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-[#EFEAD8]">{job.company}</h4>
                                  <p className="text-xs text-white/60">{job.role}</p>
                                </div>
                              </div>
                              <span className="text-xs text-[#EAAD62] bg-[#EAAD62]/10 px-3 py-1 rounded-full font-bold border border-[#EAAD62]/30">
                                {job.match}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Console Footer */}
                  <div className="pt-4 border-t border-white/15 flex justify-between items-center text-xs text-white/60 font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                      <span>Encrypted Campus Sync</span>
                    </span>
                    <span>99.98% Fidelity</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}