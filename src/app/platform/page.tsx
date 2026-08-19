"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { motion } from "framer-motion"
import LandingNavbar from "@/components/landing/navbar"
import Organization from "@/components/landing/organization"
import { InfrastructureSection } from "@/components/landing/cta"
import { CtaSection, Footer } from "@/components/landing/footer"

export default function PlatformPage() {
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".platform-word",
        { x: -80, opacity: 0, scale: 0.88 },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 1.15,
          stagger: 0.14,
          ease: "expo.out",
          delay: 0.08,
        }
      )

      gsap.fromTo(
        ".platform-subtext",
        { x: 30, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power2.out",
          delay: 0.65,
        }
      )

      gsap.fromTo(
        ".page-section-stagger",
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
          delay: 0.28,
        }
      )
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="editorial-page min-h-screen bg-[#0A0A0A] text-[#F4F4F0] antialiased overflow-x-hidden selection:bg-[#38BDF8]/20 selection:text-[#38BDF8]">
      <LandingNavbar />

      <section ref={heroRef} className="editorial-hero relative pt-40 pb-20 px-6 sm:px-12 md:px-16 flex flex-col justify-between overflow-hidden z-10 border-b border-white/10">
        <div className="hero-glow absolute left-1/2 top-12 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#38BDF8]/15 pointer-events-none" />
        <div className="absolute right-12 top-28 h-28 w-28 rounded-full border border-[#38BDF8]/20 bg-[#38BDF8]/5 drift" />
        
        {/* Ambient floating elements */}
        <div className="absolute left-24 top-32 w-24 h-24 rounded-full border border-[#38BDF8]/15 floating-element" style={{ animationDelay: '0s', animationDuration: '13s' }} />
        <div className="absolute right-1/3 bottom-40 w-28 h-28 rounded-full bg-[#38BDF8]/6 floating-accent" style={{ animationDelay: '1.5s' }} />
        <div className="absolute left-1/2 top-56 w-16 h-16 rounded-full border border-[#FF5500]/10 floating-element" style={{ animationDelay: '2.5s', animationDuration: '15s' }} />

        <div className="max-w-7xl mx-auto w-full space-y-8 pt-12 relative z-10">
          <div className="editorial-label page-section-stagger flex items-center gap-3 text-[#38BDF8] text-[10px]">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] pulse-soft" />
            <span>[ System infrastructure & architecture ]</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[6rem] font-black uppercase tracking-[-0.06em] leading-[0.88] max-w-5xl">
            <span className="platform-word editorial-word block text-white"><span>The platform</span></span>
            <span className="platform-word editorial-word block text-[#38BDF8]"><span>architecture</span></span>
            <span className="platform-word editorial-word block text-white/75"><span>for modern institutions.</span></span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="platform-subtext page-section-stagger max-w-2xl text-white/55 text-base sm:text-lg leading-relaxed font-mono uppercase tracking-[0.16em]"
          >
            Explore the core structural mappings, database partitions, and logical hierarchies that keep multi-campus data secure and synchronized.
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
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#38BDF8]">System rails</p>
                <h3 className="mt-3 text-3xl md:text-5xl font-black uppercase tracking-[-0.06em] text-white">Built to scale without friction.</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  "Multi-campus sync",
                  "Role isolation",
                  "Live data mesh",
                ].map((chip, idx) => (
                  <span
                    key={chip}
                    className="rounded-full border border-[#38BDF8]/30 bg-[#38BDF8]/5 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#BFE7FF] chip-animate"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <Organization />
      <InfrastructureSection />

      <CtaSection variant="blue" />
      <Footer variant="blue" />
    </div>
  )
}
