"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { TrendingUp, Users, BookOpen, Clock, ArrowUpRight, Activity } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

export default function Analytics() {
  const containerRef = useRef<HTMLDivElement>(null)

  const studentValRef = useRef<HTMLSpanElement>(null)
  const facultyValRef = useRef<HTMLSpanElement>(null)
  const programValRef = useRef<HTMLSpanElement>(null)
  const attendanceValRef = useRef<HTMLSpanElement>(null)

  const lineChartPathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Kinetic Counter Animation
      const counters = [
        { ref: studentValRef, target: 12420, suffix: "" },
        { ref: facultyValRef, target: 684, suffix: "" },
        { ref: programValRef, target: 126, suffix: "" },
        { ref: attendanceValRef, target: 92, suffix: "%" },
      ]

      counters.forEach((c) => {
        if (!c.ref.current) return
        const valObj = { val: 0 }
        gsap.to(valObj, {
          val: c.target,
          duration: 2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: c.ref.current,
            start: "top 85%",
          },
          onUpdate: () => {
            if (c.ref.current) {
              c.ref.current.innerText =
                Math.floor(valObj.val).toLocaleString() + c.suffix
            }
          },
        })
      })

      // 2. SVG Line Draw Animation
      if (lineChartPathRef.current) {
        const pathLength = lineChartPathRef.current.getTotalLength()
        gsap.set(lineChartPathRef.current, {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
        })
        gsap.to(lineChartPathRef.current, {
          strokeDashoffset: 0,
          duration: 2.2,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: lineChartPathRef.current,
            start: "top 80%",
          },
        })
      }

      // 3. Bar Chart Scale Animation
      gsap.fromTo(
        ".analytics-bar",
        { scaleY: 0 },
        {
          scaleY: 1,
          transformOrigin: "bottom",
          duration: 1.4,
          stagger: 0.08,
          ease: "elastic.out(1, 0.75)",
          scrollTrigger: {
            trigger: ".bar-chart-container",
            start: "top 80%",
          },
        }
      )

      // 4. Staggered Card Entrance
      gsap.fromTo(
        ".analytics-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".analytics-cards-grid",
            start: "top 85%",
          },
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={containerRef}
      className="py-32 bg-[#14234B] text-[#ECDFCB] border-t border-[#3A6DAF]/20 relative overflow-hidden font-sans"
    >
      {/* Diffuse Atmospheric Glows */}
      <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-[#E57D37]/15 rounded-full blur-[180px] pointer-events-none z-0" />
      <div className="absolute -bottom-20 left-10 w-[500px] h-[500px] bg-[#3A6DAF]/20 rounded-full blur-[180px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-20 relative z-10">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#3A6DAF]/30 pb-12">
          <div className="space-y-4 max-w-2xl">
            <div className="font-mono text-xs uppercase text-[#94BAC4] tracking-[0.25em] flex items-center gap-2">
              <Activity size={14} className="animate-pulse text-[#EAAD62]" />
              <span>[ SYSTEM TELEMETRY ]</span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-sans uppercase leading-[0.95] text-[#ECDFCB]">
              Turn raw data into <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E57D37] to-[#EAAD62]">institutional foresight.</span>
            </h2>
          </div>
          <p className="text-[#94BAC4] font-sans text-sm md:text-base max-w-md leading-relaxed">
            Eliminate operational blindness. Monitor real-time student trajectories, attendance patterns, and departmental throughput from a unified interface.
          </p>
        </div>

        {/* Counter KPI Cards */}
        <div className="analytics-cards-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {[
            { label: "Active Students", ref: studentValRef, icon: <Users size={16} className="text-[#E57D37]" />, change: "+12.4%" },
            { label: "Faculty Members", ref: facultyValRef, icon: <BookOpen size={16} className="text-[#94BAC4]" />, change: "+4.1%" },
            { label: "Programs Offered", ref: programValRef, icon: <TrendingUp size={16} className="text-[#EAAD62]" />, change: "OPTIMAL" },
            { label: "Average Attendance", ref: attendanceValRef, icon: <Clock size={16} className="text-[#3A6DAF]" />, change: "STABLE" },
          ].map((item) => (
            <div
              key={item.label}
              className="analytics-card bg-[#3A6DAF]/10 border border-[#3A6DAF]/30 p-6 rounded-3xl backdrop-blur-2xl flex flex-col justify-between h-44 hover:border-[#EAAD62]/50 hover:bg-[#3A6DAF]/20 transition-all duration-300 group"
            >
              <div className="flex justify-between items-start">
                <div className="h-9 w-9 rounded-xl bg-[#14234B]/60 border border-[#3A6DAF]/30 flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#14234B]/60 border border-[#3A6DAF]/30 text-[#94BAC4] group-hover:text-[#ECDFCB] transition-colors">
                  {item.change}
                </span>
              </div>

              <div>
                <span className="text-xs font-sans text-[#94BAC4] uppercase tracking-wider block font-medium">
                  {item.label}
                </span>
                <span
                  ref={item.ref}
                  className="text-3xl sm:text-4xl font-extrabold font-sans tracking-tight text-[#ECDFCB] mt-1 block"
                >
                  0
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts & Interactive Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">

          {/* SVG Line Chart Card */}
          <div className="lg:col-span-7 bg-[#3A6DAF]/10 border border-[#3A6DAF]/30 p-8 rounded-3xl backdrop-blur-2xl space-y-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#EAAD62]/50 transition-all">
            <div className="flex justify-between items-center pb-4 border-b border-[#3A6DAF]/20">
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-sans text-[#ECDFCB]">Student Enrollment Trajectory</h3>
                <p className="text-xs font-mono text-[#94BAC4]">// MULTI-TERM GROWTH TELEMETRY</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#E57D37] bg-[#E57D37]/10 border border-[#E57D37]/30 px-3 py-1.5 rounded-full">
                <ArrowUpRight size={14} />
                <span>+14.2% YoY</span>
              </div>
            </div>

            {/* SVG Line Canvas */}
            <div className="relative pt-6">
              <svg viewBox="0 0 400 140" className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3A6DAF" />
                    <stop offset="50%" stopColor="#EAAD62" />
                    <stop offset="100%" stopColor="#E57D37" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(148,186,196,0.15)" strokeDasharray="4 4" />
                <line x1="0" y1="70" x2="400" y2="70" stroke="rgba(148,186,196,0.15)" strokeDasharray="4 4" />
                <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(148,186,196,0.15)" strokeDasharray="4 4" />

                {/* Graph Smooth Spline Path */}
                <path
                  ref={lineChartPathRef}
                  d="M 10 110 Q 90 90, 140 60 T 260 50 T 380 15"
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Interactive Endpoint Node */}
                <circle cx="380" cy="15" r="6" fill="#E57D37" className="animate-ping opacity-75" />
                <circle cx="380" cy="15" r="5" fill="#E57D37" stroke="#14234B" strokeWidth="2" />
              </svg>
            </div>

            <div className="flex justify-between text-xs font-mono text-[#94BAC4] pt-2 border-t border-[#3A6DAF]/20">
              <span>TERM_01</span>
              <span>TERM_02</span>
              <span>TERM_03</span>
              <span className="text-[#E57D37]">CURRENT</span>
            </div>
          </div>

          {/* Custom Bar Chart Card */}
          <div className="lg:col-span-5 bg-[#3A6DAF]/10 border border-[#3A6DAF]/30 p-8 rounded-3xl backdrop-blur-2xl space-y-6 flex flex-col justify-between bar-chart-container hover:border-[#EAAD62]/50 transition-all">
            <div className="flex justify-between items-center pb-4 border-b border-[#3A6DAF]/20">
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-sans text-[#ECDFCB]">Weekly Attendance Matrix</h3>
                <p className="text-xs font-mono text-[#94BAC4]">// ACTIVE TARGET: 90%</p>
              </div>
              <span className="text-xs font-mono text-[#EAAD62] bg-[#EAAD62]/10 border border-[#EAAD62]/30 px-3 py-1.5 rounded-full">
                92% AVG
              </span>
            </div>

            {/* Equal-Width Animated Bars */}
            <div className="h-40 flex items-end justify-between gap-3 px-2 pt-4">
              {[72, 85, 94, 91, 89, 93, 95].map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    style={{ height: `${val}%` }}
                    className="analytics-bar w-full rounded-lg bg-gradient-to-t from-[#3A6DAF]/40 via-[#EAAD62]/70 to-[#E57D37] group-hover:from-[#E57D37]/30 group-hover:to-[#EAAD62] transition-colors duration-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between text-xs font-mono text-[#94BAC4] pt-2 border-t border-[#3A6DAF]/20">
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}