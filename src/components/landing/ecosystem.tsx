"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ShieldAlert, RefreshCw, EyeOff, Users, Terminal, Cpu, Activity, Lock, Layers } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

export default function Ecosystem() {
  const containerRef = useRef<HTMLDivElement>(null)
  const pinSectionRef = useRef<HTMLDivElement>(null)
  const [activePillar, setActivePillar] = useState<"management" | "academics" | "learning">("academics")

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Kinetic Text Scrub reveal
      gsap.fromTo(
        ".scrub-text span",
        { opacity: 0.1, y: 20 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.05,
          scrollTrigger: {
            trigger: ".scrub-text-container",
            start: "top 80%",
            end: "bottom 40%",
            scrub: 0.5,
          },
        }
      )

      // Interactive HUD Node Stagger
      gsap.fromTo(
        ".hud-node",
        { scale: 0.8, opacity: 0, y: 30 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: "elastic.out(1, 0.75)",
          scrollTrigger: {
            trigger: ".hud-matrix-section",
            start: "top 70%",
          },
        }
      )

      // Card Stack Float Effect
      gsap.to(".floating-card-1", {
        y: -15,
        rotation: -1,
        repeat: -1,
        yoyo: true,
        duration: 3,
        ease: "sine.inOut",
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const pillars = {
    management: {
      tag: "CORE_SYSTEM // 01",
      title: "Central Administrative OS",
      code: "sys.config.tenant_isolation = STRICT;\nsys.audit_log.stream(REALTIME);",
      features: [
        "Multi-Institution Multi-Tenant Schema",
        "Role-Based Access Guardrails (RBAC)",
        "Global Telemetry & Institutional Audits",
      ],
      color: "#FF5500",
    },
    academics: {
      tag: "CORE_SYSTEM // 02",
      title: "Algorithmic Academic Hub",
      code: "engine.timetable.resolve_conflicts();\nsyllabus.sync_status == 100%;",
      features: [
        "Conflict-Free Timetable Resolver",
        "Program & Department Tree Mapping",
        "Faculty Load & Resource Allocation",
      ],
      color: "#38BDF8",
    },
    learning: {
      tag: "CORE_SYSTEM // 03",
      title: "Active Learning Mesh",
      code: "student.analytics.push_gpa_metric();\ngradebook.auto_compile();",
      features: [
        "Live Course Outlines & Progress Tracking",
        "Automated Grading & Assessment Grids",
        "Direct Parent-Faculty Telemetry Loop",
      ],
      color: "#FF5500",
    },
  }

  return (
    <div ref={containerRef} className="bg-[#0B132B] text-[#EFEAD8] relative overflow-hidden font-['Space_Grotesk',sans-serif] border-t border-[#EFEAD8]/10">

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Hero Kinetic Typography Header */}
      <section className="scrub-text-container max-w-7xl mx-auto px-6 lg:px-8 py-32 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFEAD8]/5 border border-[#EFEAD8]/10 text-[10px] font-mono text-[#38BDF8] uppercase tracking-widest mb-8 font-black">
          <Terminal size={12} />
          <span>[ OPERATIONAL REVOLUTION ]</span>
        </div>

        <h2 className="scrub-text text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-[0.95] max-w-5xl mx-auto text-[#EFEAD8]">
          {"We kill administrative friction with a ".split(" ").map((word, i) => (
            <span key={i} className="inline-block mr-3">{word}</span>
          ))}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5500] via-[#FF8800] to-[#38BDF8] inline-block">
            relational telemetry engine.
          </span>
        </h2>
      </section>

      {/* Problem Showcase: Pinned HUD Terminal vs. Legacy Chaos */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16 relative z-10">
        <div className="grid lg:grid-cols-12 gap-8 items-center">

          {/* Legacy Chaos Left Side */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[10px] font-mono tracking-[0.25em] text-[#FF5500] uppercase font-black">
              [ THE FRAGMENTATION PROBLEM ]
            </span>
            <h3 className="text-3xl font-black uppercase tracking-tight text-[#EFEAD8]">
              Legacy spreadsheets break at scale.
            </h3>
            <p className="text-xs font-mono text-[#EFEAD8]/70 leading-relaxed uppercase font-black">
              // DISCONNECTED PORTALS, MANUAL CONFLICT CHECKING, AND SILOED DATA CAUSE CONTINUOUS OPERATIONAL CHAOS.
            </p>

            <div className="space-y-3 pt-4">
              {[
                { title: "Siloed Student Records", err: "CRITICAL_ERR: 404 DATA_MISMATCH" },
                { title: "Manual Timetable Overlaps", err: "CONFLICT: FACULTY_DOUBLE_BOOKED" },
                { title: "Zero Real-Time Visibility", err: "WARN: NO_TELEMETRY_FOUND" },
              ].map((item) => (
                <div key={item.title} className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black text-red-200">{item.title}</h4>
                    <p className="text-[9px] font-mono text-red-400 mt-0.5 font-black">{item.err}</p>
                  </div>
                  <ShieldAlert size={16} className="text-red-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Next-Gen Solution HUD Console Right Side */}
          <div className="lg:col-span-7">
            <div className="floating-card-1 bg-[#050B1E] border border-[#EFEAD8]/15 rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative">

              {/* Terminal Titlebar */}
              <div className="flex items-center justify-between border-b border-[#EFEAD8]/10 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-green-500/80 inline-block" />
                  <span className="text-[10px] font-mono text-[#EFEAD8]/50 ml-2 font-black">skillarc_kernel_v2.6.sh</span>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] rounded uppercase font-black">
                  LIVE ENGINE
                </span>
              </div>

              {/* Terminal Code Preview */}
              <div className="font-mono text-xs space-y-3 text-[#EFEAD8]/90 bg-[#0B132B] p-5 rounded-xl border border-[#EFEAD8]/10 font-black">
                <p className="text-[#38BDF8]">// Initializing Relational Operational Schema...</p>
                <p className="text-[#00FF66]">✓ Tenant isolation verified (Org_ID: 0x8F9A)</p>
                <p className="text-[#EFEAD8]/70">→ Loading timetables across 14 Departments...</p>
                <p className="text-[#FF5500]">⚡ Conflict Guard active: 0 Scheduling overlaps detected</p>
                <div className="pt-2 border-t border-[#EFEAD8]/10 flex items-center justify-between text-[10px] text-[#EFEAD8]/50">
                  <span>LATENCY: 12ms</span>
                  <span>STATUS: SYNCED</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Interactive Core Matrix HUD */}
      <section className="hud-matrix-section py-32 border-t border-[#EFEAD8]/10 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto space-y-4 mb-20">
            <span className="text-[10px] font-mono tracking-[0.25em] text-[#38BDF8] uppercase font-black">
              [ SYSTEM ARCHITECTURE ]
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#EFEAD8]">
              Modular Ecosystem Pillars
            </h2>
          </div>

          {/* Interactive Selector Matrix */}
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">

            {/* Matrix Controls */}
            <div className="lg:col-span-4 space-y-4">
              {(["management", "academics", "learning"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setActivePillar(key)}
                  className={`hud-node w-full text-left p-6 rounded-2xl border font-mono transition-all duration-300 relative overflow-hidden ${activePillar === key
                    ? "bg-[#EFEAD8]/10 border-[#FF5500] shadow-[0_0_30px_rgba(255,85,0,0.2)]"
                    : "bg-[#050B1E] border-[#EFEAD8]/10 hover:border-[#EFEAD8]/20 text-[#EFEAD8]/70"
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[#38BDF8] uppercase font-black">{pillars[key].tag}</span>
                    <Layers size={16} style={{ color: pillars[key].color }} />
                  </div>
                  <h4 className="text-lg font-black text-[#EFEAD8] font-sans uppercase">{pillars[key].title}</h4>
                </button>
              ))}
            </div>

            {/* Matrix Console Display */}
            <div className="lg:col-span-8 bg-[#050B1E] border border-[#EFEAD8]/15 rounded-2xl p-8 flex flex-col justify-between shadow-2xl relative">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#EFEAD8]/10 pb-4">
                  <span className="text-xs font-mono font-black text-[#FF5500] uppercase">
                    [ ACTIVE_VIEW: {pillars[activePillar].title} ]
                  </span>
                  <Activity size={18} className="text-[#38BDF8] animate-pulse" />
                </div>

                <div className="font-mono bg-[#0B132B] p-4 rounded-xl border border-[#EFEAD8]/10 text-xs text-[#38BDF8] font-black">
                  <pre>{pillars[activePillar].code}</pre>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 pt-4">
                  {pillars[activePillar].features.map((feat, i) => (
                    <div key={i} className="p-4 bg-[#EFEAD8]/5 border border-[#EFEAD8]/10 rounded-xl font-mono text-xs">
                      <span className="text-[#FF5500] block mb-2 font-black">// 0{i + 1}</span>
                      <p className="text-[#EFEAD8]/90 font-black">{feat}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#EFEAD8]/10 flex justify-between items-center text-[10px] font-mono text-[#EFEAD8]/50 font-black">
                <span>SECURITY: ENCRYPTED_TENANT</span>
                <span>STATE: OPTIMAL</span>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  )
}