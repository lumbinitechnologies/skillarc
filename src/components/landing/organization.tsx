"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Landmark, Building2, FolderGit2, GraduationCap, ChevronRight, Cpu } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

export default function Organization() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedNode, setSelectedNode] = useState("Central Org")

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".tree-item",
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          stagger: 0.1,
          duration: 0.6,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 70%",
          },
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={containerRef} className="py-32 bg-[#050505] text-[#F4F4F0] border-t border-white/10 relative overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">

        <div className="grid lg:grid-cols-12 gap-12 items-center">

          {/* Left Text Narrative */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[10px] font-mono tracking-[0.25em] text-[#38BDF8] uppercase">
              [ RELATIONAL HIERARCHY ]
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight leading-none">
              Hierarchical Architecture Engine
            </h2>
            <p className="text-xs font-mono text-white/50 leading-relaxed uppercase">
              // DEFINE YOUR ENTIRE CAMPUS ECOSYSTEM FROM A SINGLE RELATIONAL TREE WITHOUT ISOLATION LOSS.
            </p>

            {/* Inspector Readout Card */}
            <div className="p-6 bg-[#0A0A0A] border border-white/10 rounded-2xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-[#FF5500]">
                <span>INSPECTOR: {selectedNode}</span>
                <Cpu size={14} />
              </div>
              <p className="text-white/60 text-[11px] leading-relaxed">
                Active tenant node maintaining isolated data schemas, role assignment contexts, and live schedule telemetry.
              </p>
            </div>
          </div>

          {/* Right Interactive Tree Node Console */}
          <div className="lg:col-span-7 bg-[#0A0A0A] border border-white/15 rounded-2xl p-8 shadow-2xl relative font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <span className="text-xs text-white/40 uppercase">// CAMPUS_SCHEMA_MAPPING</span>
              <span className="text-[9px] px-2 py-0.5 bg-[#38BDF8]/10 border border-[#38BDF8]/30 text-[#38BDF8] rounded uppercase">
                INTERACTIVE
              </span>
            </div>

            <div className="space-y-4">
              {/* Central Org Node */}
              <button
                onClick={() => setSelectedNode("Central Org")}
                className={`tree-item w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedNode === "Central Org"
                    ? "bg-[#FF5500]/10 border-[#FF5500] text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Landmark size={16} className="text-[#FF5500]" />
                  <span className="text-xs font-bold uppercase">Central University Organization</span>
                </div>
                <ChevronRight size={14} />
              </button>

              {/* Sub-Branch Institutions */}
              <div className="pl-6 border-l border-dashed border-white/15 space-y-3 ml-4">
                <button
                  onClick={() => setSelectedNode("Engineering Campus")}
                  className={`tree-item w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${selectedNode === "Engineering Campus"
                      ? "bg-[#38BDF8]/10 border-[#38BDF8] text-white"
                      : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 size={15} className="text-[#38BDF8]" />
                    <span className="text-xs uppercase">Institution A (Engineering Campus)</span>
                  </div>
                  <ChevronRight size={14} />
                </button>

                {/* Sub-Branch Departments */}
                <div className="pl-6 border-l border-dashed border-white/15 space-y-2 ml-3">
                  <button
                    onClick={() => setSelectedNode("Department of CS")}
                    className={`tree-item w-full flex items-center justify-between p-3 rounded-lg border transition-all ${selectedNode === "Department of CS"
                        ? "bg-[#FF5500]/10 border-[#FF5500] text-white"
                        : "bg-[#050505] border-white/10 text-white/50 hover:border-white/30"
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderGit2 size={14} className="text-[#FF5500]" />
                      <span className="text-[11px] uppercase">Department of Computer Science</span>
                    </div>
                    <ChevronRight size={12} />
                  </button>

                  <div className="pl-6 border-l border-dashed border-white/15 space-y-1.5 ml-2">
                    <div className="p-2 bg-white/5 rounded-md text-[10px] text-white/40 flex items-center gap-2">
                      <GraduationCap size={12} className="text-[#38BDF8]" />
                      <span>B.Tech CSE Program</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  )
}