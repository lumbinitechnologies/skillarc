"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Check, Calendar, Layers, Sparkles } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

export default function TimetableDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const daaRef = useRef<HTMLDivElement>(null)
  const dcnRef = useRef<HTMLDivElement>(null)
  const wtRef = useRef<HTMLDivElement>(null)
  const textNarrativeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Keyword Glow Reveal on Scroll
      const words = gsap.utils.toArray(".highlight-keyword")
      gsap.fromTo(
        words,
        { color: "rgba(236, 223, 203, 0.25)" },
        {
          color: "#E57D37",
          stagger: 0.15,
          duration: 0.6,
          scrollTrigger: {
            trigger: textNarrativeRef.current,
            start: "top 75%",
            end: "bottom 55%",
            scrub: true,
          },
        }
      )

      // 2. Timeline for Pinned Interactive Simulation
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          pin: true,
          scrub: 1,
          start: "top top",
          end: "+=120%",
        },
      })

      // DAA Slot Flying Entry
      tl.fromTo(
        daaRef.current,
        { x: -140, y: 100, opacity: 0, scale: 0.7, rotate: -6 },
        { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0, duration: 1.5, ease: "power3.out" }
      )

      // DCN Slot Flying Entry
      tl.fromTo(
        dcnRef.current,
        { x: -90, y: 140, opacity: 0, scale: 0.7, rotate: 4 },
        { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0, duration: 1.5, ease: "power3.out" },
        "+=0.2"
      )

      // WT Slot Flying Entry
      tl.fromTo(
        wtRef.current,
        { x: 140, y: 80, opacity: 0, scale: 0.7, rotate: -3 },
        { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0, duration: 1.5, ease: "power3.out" },
        "+=0.2"
      )

      // Visual Conflict Badge Popup
      tl.fromTo(
        ".conflict-badge",
        { scale: 0.8, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: "back.out(1.7)" }
      )

      // Checklist Fade Items
      tl.fromTo(
        ".checklist-item",
        { opacity: 0, x: -15 },
        { opacity: 1, x: 0, stagger: 0.2, duration: 0.8, ease: "power2.out" },
        "-=0.4"
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="bg-[#14234B] text-[#ECDFCB] border-t border-[#3A6DAF]/20 relative overflow-hidden font-sans">

      {/* Background Radial Ambiance */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#3A6DAF]/15 rounded-full blur-[180px] pointer-events-none z-0" />

      {/* FEATURE TYPOGRAPHY NARRATIVE BLOCK */}
      <section ref={textNarrativeRef} className="max-w-7xl mx-auto px-6 lg:px-8 py-32 text-center relative z-10">
        <span className="text-xs font-mono tracking-[0.25em] text-[#94BAC4] uppercase mb-8 block">
          [ PHILOSOPHY // RELATIONAL INTEGRITY ]
        </span>
        <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold uppercase tracking-tight leading-[0.95] max-w-5xl mx-auto font-sans text-[#ECDFCB]">
          We replace <span className="highlight-keyword">fragmented worksheets</span> with a unified <span className="highlight-keyword">relational schema</span> that catches conflicts, automates rosters, and connects <span className="highlight-keyword">students directly</span>.
        </h2>
      </section>

      {/* ACADEMIC MANAGEMENT PIPELINE */}
      <section className="border-t border-[#3A6DAF]/20 py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left Feature Column */}
          <div className="space-y-6 lg:col-span-5">
            <span className="text-[10px] font-mono tracking-[0.2em] text-[#E57D37] uppercase bg-[#E57D37]/10 border border-[#E57D37]/30 px-4 py-1.5 rounded-full inline-block">
              [ ACADEMIC OPERATIONS ]
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-[#ECDFCB] leading-tight">
              From departments to timetables.
            </h2>
            <p className="text-sm text-[#94BAC4] leading-relaxed font-sans font-light">
              Architect the logical structural hierarchy of your institution. Organize departments, assign program directors, map course syllabi, allocate faculty capacity, and build schedules without overlaps.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 font-sans">
              {[
                { title: "Departments", desc: "Organize structural branches." },
                { title: "Programs", desc: "Manage curriculum leaders." },
                { title: "Subjects", desc: "Connect syllabus & students." },
                { title: "Timetables", desc: "Build visual conflict tools." },
              ].map((item) => (
                <div key={item.title} className="p-4 bg-[#3A6DAF]/10 border border-[#3A6DAF]/30 rounded-2xl hover:border-[#EAAD62]/50 transition-all">
                  <h3 className="text-sm font-bold text-[#ECDFCB]">{item.title}</h3>
                  <p className="text-xs text-[#94BAC4] mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Operational Workflow HUD */}
          <div className="bg-[#3A6DAF]/10 border border-[#3A6DAF]/30 rounded-3xl p-8 space-y-6 lg:col-span-7 backdrop-blur-2xl relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3A6DAF]/20 pb-4">
              <span className="text-xs font-mono text-[#94BAC4] uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} className="text-[#3A6DAF]" />
                <span>OPERATIONAL WORKFLOW</span>
              </span>
              <span className="text-[10px] font-mono px-2.5 py-1 bg-[#EAAD62]/10 border border-[#EAAD62]/30 text-[#EAAD62] rounded-full uppercase">
                AUTOMATED
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 font-mono text-xs">
              {[
                "Department Hub Configuration",
                "Program Head Assignment",
                "Subject Curricular Mapping",
                "Faculty Roster Allocation",
                "Timetable Class Scheduling",
                "Real-Time Student Delivery",
              ].map((step, idx) => (
                <div key={step} className="flex items-center gap-3 p-3 rounded-xl bg-[#14234B]/60 border border-[#3A6DAF]/20 text-[#ECDFCB]">
                  <span className="h-6 w-6 rounded-lg bg-[#E57D37]/15 border border-[#E57D37]/40 text-[#E57D37] flex items-center justify-center text-xs font-bold shrink-0">
                    0{idx + 1}
                  </span>
                  <span className="text-[11px] font-sans font-medium">{step}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* PINNED TIMETABLE BUILDER SIMULATION */}
      <div ref={pinRef} className="h-screen w-full flex items-center justify-center overflow-hidden border-t border-[#3A6DAF]/20 relative z-10 bg-[#14234B]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">

          {/* Text narrative column */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-mono tracking-[0.2em] text-[#94BAC4] uppercase flex items-center gap-2">
              <Sparkles size={14} className="text-[#EAAD62]" />
              <span>CONFLICT RESOLVER ENGINE</span>
            </span>
            <h3 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-[#ECDFCB] leading-tight">
              Build timetables without calendar chaos.
            </h3>
            <p className="text-sm text-[#94BAC4] leading-relaxed font-sans font-light">
              Drag subjects, allocate periods, and resolve faculty constraints in real time. SkillArc evaluates double-booking rules instantly.
            </p>

            {/* Visual Conflict Guard Badge */}
            <div className="bg-[#E57D37]/10 border border-[#E57D37]/30 p-4 rounded-2xl conflict-badge opacity-0 flex items-center gap-4 backdrop-blur-xl">
              <div className="h-10 w-10 rounded-xl bg-[#E57D37] flex items-center justify-center text-[#14234B] shrink-0">
                <Check size={20} className="stroke-[3]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#ECDFCB] font-sans">Visual Conflict Guard Active</p>
                <p className="text-xs text-[#EAAD62] font-mono">// 0 SCHEDULING OVERLAPS DETECTED</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs text-[#94BAC4] font-sans">
              {[
                "Conflict-aware slot suggestions",
                "Instant faculty availability tracking",
                "Drag, Assign, Save, and Publish instantly",
              ].map((feat) => (
                <div key={feat} className="checklist-item opacity-0 flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-[#EAAD62]/20 border border-[#EAAD62]/40 text-[#EAAD62] flex items-center justify-center text-xs font-bold shrink-0">
                    ✓
                  </div>
                  <span className="text-[#ECDFCB]">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timetable Interactive Canvas */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-mono text-[#94BAC4] px-2">
              <span className="flex items-center gap-2">
                <Calendar size={14} className="text-[#E57D37]" />
                <span>SCHEDULING MATRIX SIMULATION</span>
              </span>
              <span className="text-[10px] text-[#E57D37]">// LIVE DRAG STATE</span>
            </div>

            <div className="bg-[#3A6DAF]/10 border border-[#3A6DAF]/30 rounded-3xl p-6 shadow-2xl overflow-x-auto backdrop-blur-2xl">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#3A6DAF]/20">
                    <th className="py-3 px-3 text-[#94BAC4] font-mono text-[10px] uppercase">TIME</th>
                    {["MON", "TUE", "WED", "THU", "FRI"].map((day) => (
                      <th key={day} className="py-3 px-3 text-[#94BAC4] font-mono text-[10px] uppercase text-center">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { time: "09:00 AM", key: "09" },
                    { time: "10:00 AM", key: "10" },
                    { time: "11:00 AM", key: "11" },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#3A6DAF]/10">
                      <td className="py-5 px-3 text-[10px] font-mono text-[#94BAC4] whitespace-nowrap">
                        {row.time}
                      </td>
                      {["MON", "TUE", "WED", "THU", "FRI"].map((day) => {
                        const isDAA = day === "MON" && row.key === "09"
                        const isDCN = day === "TUE" && row.key === "10"
                        const isWT = day === "WED" && row.key === "11"

                        return (
                          <td key={day} className="p-1.5 min-w-[100px] h-[75px]">
                            {isDAA && (
                              <div
                                ref={daaRef}
                                className="bg-[#E57D37]/20 border border-[#E57D37]/50 rounded-xl p-2.5 h-full flex flex-col justify-between shadow-lg shadow-[#E57D37]/10"
                              >
                                <span className="font-extrabold text-xs text-[#E57D37] font-sans">DAA</span>
                                <span className="text-[9px] text-[#ECDFCB]/70 font-mono">Dr. Roy • R304</span>
                              </div>
                            )}
                            {isDCN && (
                              <div
                                ref={dcnRef}
                                className="bg-[#3A6DAF]/30 border border-[#3A6DAF]/60 rounded-xl p-2.5 h-full flex flex-col justify-between shadow-lg shadow-[#3A6DAF]/20"
                              >
                                <span className="font-extrabold text-xs text-[#94BAC4] font-sans">DCN</span>
                                <span className="text-[9px] text-[#ECDFCB]/70 font-mono">Prof. Sen • R102</span>
                              </div>
                            )}
                            {isWT && (
                              <div
                                ref={wtRef}
                                className="bg-[#EAAD62]/20 border border-[#EAAD62]/50 rounded-xl p-2.5 h-full flex flex-col justify-between shadow-lg shadow-[#EAAD62]/10"
                              >
                                <span className="font-extrabold text-xs text-[#EAAD62] font-sans">WT</span>
                                <span className="text-[9px] text-[#ECDFCB]/70 font-mono">Dr. Minus • R201</span>
                              </div>
                            )}
                            {!isDAA && !isDCN && !isWT && (
                              <div className="border border-dashed border-[#3A6DAF]/20 rounded-xl h-full bg-[#14234B]/40 hover:bg-[#3A6DAF]/10 transition-colors" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-[#94BAC4] font-mono text-center pt-2">
              // DRAG. ASSIGN. RESOLVE. PUBLISH.
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}