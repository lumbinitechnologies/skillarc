"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { motion } from "framer-motion"
import LandingNavbar from "@/components/landing/navbar"
import Roles from "@/components/landing/roles"
import AiSection from "@/components/landing/ai-section"
import { SecuritySection } from "@/components/landing/cta"
import { CtaSection, Footer } from "@/components/landing/footer"

export default function SolutionsPage() {
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".solutions-word",
        { y: 140, opacity: 0, rotateZ: -7, scaleY: 1.25 },
        {
          y: 0,
          opacity: 1,
          rotateZ: 0,
          scaleY: 1,
          duration: 1.35,
          stagger: 0.15,
          ease: "power4.out",
          delay: 0.12,
        }
      )

      gsap.fromTo(
        ".solutions-subtext",
        { y: 18, opacity: 0, filter: "blur(10px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.9,
          ease: "power2.out",
          delay: 0.8,
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
          delay: 0.3,
        }
      )
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="editorial-page min-h-screen bg-[#EFEAD8] text-[#0B132B] antialiased overflow-x-hidden selection:bg-[#E57D37]/20 selection:text-[#E57D37] font-['Space_Grotesk',sans-serif]">
      <LandingNavbar />

      <section ref={heroRef} className="editorial-hero relative pt-40 pb-20 px-6 sm:px-12 md:px-16 flex flex-col justify-between overflow-hidden z-10 bg-[#0B132B] text-[#EFEAD8] border-b border-white/10">
        <div className="hero-glow absolute left-1/2 top-12 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#E57D37]/15 pointer-events-none" />
        <div className="absolute left-8 bottom-12 h-24 w-24 rounded-full bg-[#E57D37]/10 border border-[#E57D37]/20 drift" />
        
        {/* Ambient floating elements */}
        <div className="absolute right-16 top-40 w-28 h-28 rounded-full border border-[#EAAD62]/15 floating-element" style={{ animationDelay: '0s', animationDuration: '13s' }} />
        <div className="absolute left-1/4 bottom-24 w-20 h-20 rounded-full bg-[#EAAD62]/8 floating-accent" style={{ animationDelay: '1.2s' }} />
        <div className="absolute right-1/3 top-32 w-12 h-12 rounded-full border border-[#38BDF8]/10 floating-element" style={{ animationDelay: '2s', animationDuration: '14s' }} />

        <div className="max-w-7xl mx-auto w-full space-y-8 pt-12 relative z-10">
          <div className="editorial-label page-section-stagger flex items-center gap-3 text-[#EAAD62] text-[10px]">
            <span className="w-2 h-2 rounded-full bg-[#E57D37] pulse-soft" />
            <span>[ Academic workspaces & interaction ]</span>
          </div>

          <h1 className="max-w-5xl text-4xl sm:text-6xl md:text-7xl lg:text-[6rem] font-black uppercase tracking-[-0.06em] leading-[0.88] text-[#EFEAD8]">
            <span className="solutions-word editorial-word block"><span>Tailored</span></span>
            <span className="solutions-word editorial-word block text-[#EAAD62]"><span>experiences</span></span>
            <span className="solutions-word editorial-word block text-white/80"><span>for every academic role.</span></span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="solutions-subtext page-section-stagger max-w-2xl text-[#94BAC4] text-base sm:text-lg leading-relaxed font-['Space_Mono',monospace] uppercase tracking-[0.18em] font-bold"
          >
            From central organization admins to teachers, students, and parents — find the dedicated console built exactly for your workflow.
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
          <div className="editorial-card p-6 md:p-8 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#EAAD62]">Role engines</p>
                <h3 className="mt-3 text-3xl md:text-5xl font-black uppercase tracking-[-0.06em] text-[#EFEAD8]">Every workflow, tuned to the human behind it.</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "admins",
                  "teachers",
                  "students",
                  "parents",
                ].map((item, idx) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#EAAD62]/30 bg-[#EAAD62]/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.22em] text-[#F9E6C6] role-item"
                    style={{ animationDelay: `${idx * 0.08}s` }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <Roles />
      <AiSection />
      <SecuritySection />

      <div className="bg-[#0B132B] text-[#EFEAD8]">
        <CtaSection variant="amber" />
      </div>
      <Footer variant="amber" />
    </div>
  )
}