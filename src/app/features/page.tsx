"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import LandingNavbar from "@/components/landing/navbar"
import TimetableDemo from "@/components/landing/timetable-demo"
import Analytics from "@/components/landing/analytics"
import { MultiInstitutionSection } from "@/components/landing/cta"
import { CtaSection, Footer } from "@/components/landing/footer"

export default function FeaturesPage() {
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Cinematic text reveal on page load
      gsap.fromTo(
        ".reveal-word",
        { y: 100, opacity: 0, rotateX: -45 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 1.2,
          stagger: 0.1,
          ease: "power4.out",
          delay: 0.2
        }
      )

      gsap.fromTo(
        ".reveal-fade",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, delay: 0.8, ease: "power2.out" }
      )
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen bg-[#0E0F12] text-[#F4F4F0] antialiased selection:bg-[#FF5500]/20 selection:text-[#FF5500]">
      <LandingNavbar />

      {/* GSAP EDITORIAL HERO */}
      <section ref={heroRef} className="relative pt-48 pb-32 px-6 sm:px-12 md:px-16 flex flex-col justify-between overflow-hidden z-10 border-b border-white/5">
        {/* Soft, diffuse background glow instead of hard circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[80vh] bg-gradient-to-b from-[#38BDF8]/10 to-transparent blur-[120px] pointer-events-none z-0 opacity-60" />

        <div className="max-w-7xl mx-auto w-full space-y-12 relative z-10">

          <div className="reveal-fade font-mono text-[10px] uppercase text-[#38BDF8] tracking-[0.25em] flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
            <span>[ SYSTEM ENGINES & TELEMETRY ]</span>
          </div>

          {/* Mixed Typography: Breaking the HUD rigidity */}
          <h1 className="text-5xl sm:text-7xl md:text-[6.5rem] font-sans font-extrabold tracking-tighter leading-[0.9] max-w-5xl" style={{ perspective: "1000px" }}>
            <div className="overflow-hidden inline-block"><span className="reveal-word inline-block origin-bottom text-white">CONFLICT-FREE</span></div>{" "}
            <div className="overflow-hidden inline-block"><span className="reveal-word inline-block origin-bottom text-[#FF5500]">SCHEDULING.</span></div>
            <br />
            <div className="overflow-hidden inline-block"><span className="reveal-word inline-block origin-bottom text-white/90">LIVE</span></div>{" "}
            <div className="overflow-hidden inline-block"><span className="reveal-word inline-block origin-bottom text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">TELEMETRY.</span></div>
          </h1>

          <p className="reveal-fade text-white/60 text-lg md:text-xl max-w-2xl leading-relaxed font-sans font-light">
            Drop the spreadsheets. Utilize our visual conflict resolver, run real-time calendar audits, and monitor spatial analytics to optimize classroom parameters instantly.
          </p>
        </div>
      </section>

      {/* INTERACTIVE TIMETABLE CLASH BUILDER */}
      <TimetableDemo />

      {/* DATA ANALYTICS KPI DASHBOARD */}
      <Analytics />

      {/* SYSTEM MULTI-INSTITUTION SCALE */}
      <MultiInstitutionSection />

      {/* CALL TO ACTION */}
      <CtaSection />

      {/* FOOTER */}
      <Footer />
    </div>
  )
}