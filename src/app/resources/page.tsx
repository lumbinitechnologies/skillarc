"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { motion } from "framer-motion"
import LandingNavbar from "@/components/landing/navbar"
import { CtaSection, Footer } from "@/components/landing/footer"
import { ArrowRight, BookOpen, Terminal, Activity, FileText } from "lucide-react"

export default function ResourcesPage() {
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".resources-word",
        { y: 130, opacity: 0, filter: "blur(14px)", rotateY: -45 },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          rotateY: 0,
          duration: 1.25,
          stagger: 0.12,
          ease: "power4.out",
          delay: 0.12,
        }
      )

      gsap.fromTo(
        ".resources-subtext",
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power2.out",
          delay: 0.75,
        }
      )

      gsap.fromTo(
        ".page-section-stagger",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.95,
          stagger: 0.08,
          ease: "power3.out",
          delay: 0.25,
        }
      )
    }, heroRef)

    return () => ctx.revert()
  }, [])

  const resourceCards = [
    {
      title: "Blueprints Documentation",
      desc: "Learn about the logical organizational hierarchy schema, curriculum blueprints, user mapping matrices, and tenant synchronization controls.",
      icon: <BookOpen size={20} className="text-[#38BDF8]" />,
      tag: "API blue-prints",
    },
    {
      title: "Developer API Guide",
      desc: "Comprehensive integration guide detailing REST endpoints, supabase relational tables, database partitions, and active webhooks setup.",
      icon: <Terminal size={20} className="text-[#FF5500]" />,
      tag: "DEVELOPER OS",
    },
    {
      title: "System Status Live",
      desc: "Monitor telemetry live connections, active client database updates, server latency benchmarks, and active postgres triggers.",
      icon: <Activity size={20} className="text-[#38BDF8]" />,
      tag: "System telemetry",
    },
    {
      title: "Legal Terms & Policies",
      desc: "Read our security blueprints, tenant isolation guidelines, data encryption rules, terms of service, and privacy policies.",
      icon: <FileText size={20} className="text-[#FF5500]" />,
      tag: "Security blueprints",
    },
  ]

  return (
    <div className="editorial-page min-h-screen bg-[#0A0A0A] text-[#F4F4F0] antialiased overflow-x-hidden selection:bg-[#FF5500]/20 selection:text-[#FF5500]">
      <LandingNavbar />

      <section ref={heroRef} className="editorial-hero relative pt-40 pb-20 px-6 sm:px-12 md:px-16 flex flex-col justify-between overflow-hidden z-10 border-b border-white/10">
        <div className="hero-glow absolute left-1/2 top-8 -translate-x-1/2 w-[720px] h-[720px] rounded-full bg-[#38BDF8]/12 pointer-events-none" />
        <div className="absolute right-8 top-20 h-24 w-24 rounded-full border border-[#38BDF8]/20 bg-[#38BDF8]/10 drift" />
        
        {/* Ambient floating elements */}
        <div className="absolute left-16 top-48 w-32 h-32 rounded-full border border-[#38BDF8]/12 floating-element" style={{ animationDelay: '0s', animationDuration: '12s' }} />
        <div className="absolute right-1/4 bottom-32 w-20 h-20 rounded-full bg-[#7DD3FC]/8 floating-accent" style={{ animationDelay: '1.5s' }} />
        <div className="absolute left-1/3 top-32 w-16 h-16 rounded-full border border-[#FF5500]/10 floating-element" style={{ animationDelay: '2.5s', animationDuration: '15s' }} />

        <div className="max-w-7xl mx-auto w-full space-y-8 pt-12 relative z-10">
          <div className="editorial-label page-section-stagger flex items-center gap-3 text-[#38BDF8] text-[10px]">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] pulse-soft" />
            <span>[ Comprehensive archive ]</span>
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[100px] font-black uppercase tracking-[-0.06em] leading-[0.88] max-w-5xl">
            <span className="resources-word editorial-word block text-white"><span>System telemetry</span></span>
            <span className="resources-word editorial-word block text-[#38BDF8]"><span>resources.</span></span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.85 }}
            className="resources-subtext page-section-stagger max-w-xl text-white/60 text-sm sm:text-base leading-relaxed font-mono uppercase tracking-[0.18em]"
          >
            A living library of architecture notes, security guides, API references, and live operating data.
          </motion.p>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative py-10 z-10"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="editorial-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#38BDF8]">Signal archive</p>
                <h3 className="mt-3 text-3xl md:text-5xl font-black uppercase tracking-[-0.06em] text-[#F4F4F0]">Built for fast reference and long thinking.</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "docs",
                  "api",
                  "status",
                  "policies",
                ].map((item, index) => (
                  <motion.span
                    key={item}
                    initial={{ opacity: 0, x: 18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.45, delay: index * 0.06 }}
                    className="rounded-full border border-[#38BDF8]/30 bg-[#38BDF8]/5 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#D8F3FF]"
                  >
                    {item}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="py-24 relative overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {resourceCards.map((card, index) => (
              <div
                key={card.title}
                className="editorial-card group p-8 min-h-[260px] flex flex-col justify-between resource-card"
                style={{ animationDelay: `${index * 0.12}s` }}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#38BDF8]/20 to-transparent blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center icon-animate group-hover:scale-110 transition-transform">
                        {card.icon}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-white/40 bg-white/5 border border-white/5 px-2.5 py-1 rounded">
                      [ {card.tag} ]
                    </span>
                  </div>
                  <h3 className="text-xl font-bold uppercase text-[#F4F4F0] font-sans tracking-tight pt-2">
                    {card.title}
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed font-mono">
                    {card.desc}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-[#FF5500] uppercase tracking-widest font-mono pt-6 cursor-pointer group-hover:underline">
                  <span>Access Documents</span>
                  <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection variant="cyan" />
      <Footer variant="cyan" />
    </div>
  )
}
