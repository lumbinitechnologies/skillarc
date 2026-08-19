"use client"

import { ShieldCheck, ArrowRight, Layers, Database, Lock, Cpu, Server } from "lucide-react"

export function SecuritySection() {
  return (
    <section className="border-b border-white/5 py-32 relative overflow-hidden bg-[#0E0F12] text-[#F4F4F0] font-sans">

      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-[#38BDF8]/5 rounded-full blur-[180px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">

        {/* Left Copy */}
        <div className="space-y-6 lg:col-span-5">
          <span className="text-xs font-mono tracking-[0.25em] text-[#38BDF8] uppercase flex items-center gap-2">
            <Lock size={14} />
            <span>[ SYSTEM SECURITY ]</span>
          </span>

          <h3 className="text-3xl sm:text-5xl font-extrabold uppercase text-white font-sans tracking-tight leading-tight">
            The right people see the right information.
          </h3>

          <p className="text-sm text-white/60 leading-relaxed font-sans font-light">
            Role-based access controls keep academic information strictly partitioned according to staff responsibilities, department boundaries, and institutional hierarchy.
          </p>

          {/* Breadcrumb Hierarchy Trail */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-2">
            {["Organization", "Institution", "Department", "Program", "Role"].map((tag, idx) => (
              <div key={tag} className="flex items-center gap-2">
                <span className="bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full text-white/80 hover:border-white/20 transition-colors">
                  {tag}
                </span>
                {idx < 4 && <ArrowRight size={12} className="text-[#FF5500]" />}
              </div>
            ))}
          </div>
        </div>

        {/* Right Glass Card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl space-y-6 lg:col-span-7 hover:border-white/20 transition-all">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center text-[#FF5500] shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white font-sans">Strict Tenant Isolation</h4>
              <p className="text-xs font-mono text-[#38BDF8]">// DATABASE-LEVEL ROW SECURITY</p>
            </div>
          </div>

          <p className="text-sm text-white/60 leading-relaxed font-sans font-light border-t border-white/5 pt-6">
            Institutional records are partitioned at the database schema layer. Department Heads are constrained strictly to their subject scopes, and students can only view their own registered courses and grades.
          </p>
        </div>

      </div>
    </section>
  )
}

export function MultiInstitutionSection() {
  return (
    <section className="border-b border-white/5 py-32 relative overflow-hidden bg-[#0A0B0E] text-[#F4F4F0] font-sans">

      {/* Background Central Atmospheric Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF5500]/10 rounded-full blur-[200px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-20 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono tracking-[0.25em] text-[#38BDF8] uppercase block">
            [ SYSTEM SCALABILITY ]
          </span>
          <h2 className="text-4xl sm:text-6xl font-extrabold font-sans uppercase tracking-tight text-white leading-tight">
            One organization. <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5500] to-[#FF8800]">Multiple institutions.</span>
          </h2>
          <p className="text-sm text-white/60 font-sans font-light max-w-xl mx-auto">
            Scale your academic ecosystem smoothly without losing unified administrative overviews or cross-campus analytics.
          </p>
        </div>

        {/* Scalability Architecture Flow Tree */}
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 sm:p-12 w-full max-w-4xl mx-auto shadow-2xl backdrop-blur-2xl space-y-10 hover:border-white/20 transition-all">

          {/* Top Parent Node */}
          <div className="text-center relative">
            <span className="inline-flex items-center gap-2 text-xs font-mono font-bold text-black bg-[#FF5500] px-6 py-3 rounded-full uppercase tracking-wider shadow-[0_0_25px_rgba(255,85,0,0.35)]">
              <Layers size={14} />
              <span>Central Organization Hub</span>
            </span>
          </div>

          {/* Connected Children Branches */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center relative pt-4">
            {["Institution A", "Institution B", "Institution C"].map((inst) => (
              <div key={inst} className="space-y-4 group">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white group-hover:border-[#38BDF8]/50 group-hover:bg-[#38BDF8]/5 transition-all">
                  {inst}
                </div>
                <div className="w-0.5 h-6 bg-gradient-to-b from-white/20 to-white/5 mx-auto" />
                <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-xs font-medium text-white/60 font-mono">
                  Departments
                </div>
                <div className="w-0.5 h-6 bg-gradient-to-b from-white/20 to-white/5 mx-auto" />
                <div className="p-2.5 bg-white/[0.01] border border-white/5 rounded-lg text-[11px] font-mono text-white/40">
                  Programs & Courses
                </div>
              </div>
            ))}
          </div>

          {/* Footer Callout */}
          <div className="text-center pt-6 border-t border-white/5">
            <span className="text-xs font-bold text-[#38BDF8] font-mono uppercase tracking-widest">
              // ZERO PERFORMANCE DEGRADATION AT SCALE
            </span>
          </div>

        </div>
      </div>
    </section>
  )
}

export function InfrastructureSection() {
  return (
    <section className="border-b border-white/5 py-32 relative overflow-hidden bg-[#0E0F12] text-[#F4F4F0] font-sans">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

        {/* Left Copy */}
        <div className="space-y-4 lg:col-span-5">
          <span className="text-xs font-mono tracking-[0.25em] text-white/40 uppercase block">
            // TELEMETRY INFRASTRUCTURE
          </span>
          <h3 className="text-3xl sm:text-4xl font-extrabold uppercase text-white font-sans tracking-tight">
            Built on modern cloud architecture.
          </h3>
          <p className="text-sm text-white/60 leading-relaxed font-sans font-light">
            SkillArc pairs serverless relational databases with low-latency client state synchronization to deliver fast timetable calculations and reliable updates.
          </p>
        </div>

        {/* Right Tech Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-7">
          {[
            { label: "Next.js & React 19", sub: "Speed & SEO optimized", icon: <Cpu size={18} className="text-[#FF5500]" /> },
            { label: "Supabase DB", sub: "Real-time query engine", icon: <Database size={18} className="text-[#38BDF8]" /> },
            { label: "PostgreSQL Engine", sub: "Strict relational integrity", icon: <Server size={18} className="text-[#FF5500]" /> },
            { label: "Role Security Auth", sub: "Identity & tenant bounds", icon: <Lock size={18} className="text-[#38BDF8]" /> },
          ].map((tech) => (
            <div key={tech.label} className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-2xl hover:border-white/20 transition-all flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                {tech.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-sans">{tech.label}</h4>
                <p className="text-xs text-white/40 mt-1 font-mono">{tech.sub}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}