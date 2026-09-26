"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { motion } from "framer-motion"
import LandingNavbar from "@/components/landing/navbar"
import { CtaSection, Footer } from "@/components/landing/footer"

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".about-word",
        { y: 180, opacity: 0, filter: "blur(18px)", rotateX: -70, skewY: 8 },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          rotateX: 0,
          skewY: 0,
          duration: 1.3,
          stagger: 0.16,
          ease: "power4.out",
          delay: 0.1,
        }
      )

      gsap.fromTo(
        ".about-subtext",
        { y: 20, opacity: 0, filter: "blur(8px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 1,
          ease: "power2.out",
          delay: 0.75,
        }
      )

      gsap.fromTo(
        ".page-section-stagger",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.08,
          ease: "power3.out",
          delay: 0.45,
        }
      )
    }, heroRef)

    return () => ctx.revert()
  }, [])

  const metrics = [
    { title: "300+", desc: "Websites & portals deployed" },
    { title: "7+ Years", desc: "Experience in academic UI/UX" },
    { title: "14k+", desc: "Daily active student users" },
    { title: "0 Error", desc: "Timetable scheduling clashes" },
  ]

  const contacts = [
    { label: "PHONE LINE", val: "+45 223 323 665" },
    { label: "EMAIL INBOX", val: "info@skillarc.com" },
    { label: "HQ LOCATION", val: "Copenhagen, Denmark" },
  ]

  return (
    <div className="editorial-page min-h-screen bg-[#0A0A0A] text-[#F4F4F0] antialiased selection:bg-[#FF5500]/20 selection:text-[#FF5500] font-['Space_Grotesk',sans-serif]">
      <LandingNavbar />

      <section ref={heroRef} className="editorial-hero relative pt-40 pb-20 px-6 sm:px-12 md:px-16 flex flex-col justify-between overflow-hidden z-10 border-b border-white/10">
        <div className="hero-glow absolute left-1/2 top-10 -translate-x-1/2 w-[680px] h-[680px] rounded-full bg-[#FF5500]/20 pointer-events-none" />
        <div className="absolute left-16 top-28 h-24 w-24 rounded-full border border-[#FF5500]/20 bg-[#FF5500]/5 blur-sm drift" />
        
        {/* Ambient floating elements */}
        <div className="absolute right-20 top-48 w-32 h-32 rounded-full border border-[#FF5500]/10 floating-element" style={{ animationDelay: '0s', animationDuration: '12s' }} />
        <div className="absolute left-1/3 bottom-32 w-20 h-20 rounded-full bg-[#FF5500]/8 floating-accent" style={{ animationDelay: '1s' }} />
        <div className="absolute right-1/4 top-64 w-16 h-16 rounded-full border border-[#38BDF8]/20 floating-element" style={{ animationDelay: '2s', animationDuration: '14s' }} />

        <div className="max-w-7xl mx-auto w-full space-y-8 pt-12 relative z-10">
          <div className="editorial-label page-section-stagger flex items-center gap-3 text-[#FF5500] text-[10px]">
            <span className="w-2 h-2 rounded-full bg-[#FF5500] pulse-soft" />
            <span>[ System mission & vision ]</span>
          </div>

          <div className="relative flex flex-col gap-3">
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[100px] font-black uppercase tracking-[-0.06em] leading-[0.88] max-w-5xl">
              <span className="about-word editorial-word block"><span>Redefining</span></span>
              <span className="about-word editorial-word block text-white/90"><span>academic</span></span>
              <span className="about-word editorial-word block text-[#FF5500]"><span>operations.</span></span>
            </h1>
            <p className="about-subtext page-section-stagger max-w-xl text-sm sm:text-base text-white/60 leading-relaxed font-mono uppercase tracking-[0.18em]">
              More than software. An academic operating system built around clarity, scale, and calm design.
            </p>
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="relative py-10 overflow-hidden z-10"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Design systems", color: "#FF5500" },
              { title: "Campus intelligence", color: "#38BDF8" },
              { title: "Operational clarity", color: "#FF5500" },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="editorial-card px-5 py-4 relative overflow-visible group hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
                    <span>0{index + 1}</span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                  <p className="text-2xl font-black uppercase tracking-[-0.05em] text-[#F4F4F0]">{item.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="relative py-24 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="lg:col-span-6 space-y-6 page-section-stagger"
          >
            <span className="text-[10px] font-mono tracking-[0.25em] text-[#38BDF8] uppercase font-bold">
              // The system ethos
            </span>
            <h3 className="text-3xl font-sans font-black uppercase text-[#F4F4F0] tracking-tight">
              We believe education deserves modern, logical software.
            </h3>
            <p className="text-base text-white/50 leading-relaxed font-mono font-bold">
              Academic management shouldn&apos;t live across worksheets and disconnected emails. Our team is dedicated to designing a unified academic operating system (OS) that handles structural scaling, conflict-free scheduling, and student learning records dynamically.
            </p>
            <p className="text-xs text-white/40 leading-relaxed font-mono font-bold">
              Designed in Denmark, optimized globally. SkillArc serves more than 300 campuses, bringing students, faculty, and administrators under a single relational dashboard.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-6 space-y-6 page-section-stagger"
          >
            <span className="text-[10px] font-mono tracking-[0.25em] text-white/30 uppercase block font-bold">
              // Operations by the numbers
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {metrics.map((metric, index) => (
                <div
                  key={metric.title}
                  className="editorial-card p-5 metric-card"
                  style={{ animationDelay: `${index * 0.12}s` }}
                >
                  <span className="text-2xl font-black font-mono text-[#FF5500]">{metric.title}</span>
                  <p className="text-xs text-white/40 font-mono mt-1 uppercase tracking-wider font-bold">{metric.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative py-20 border-t border-white/10 overflow-hidden z-10">
        {/* Section divider accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#FF5500]/20 to-transparent section-divider" />
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#FF5500]/50 glow-accent" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="text-center max-w-xl mx-auto space-y-4 page-section-stagger"
          >
            <span className="text-[10px] font-mono tracking-[0.25em] text-[#38BDF8] uppercase font-bold">
              // Telemetry contact
            </span>
            <h4 className="text-2xl font-sans font-black uppercase text-[#F4F4F0]">Get in touch with us</h4>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-center">
            {contacts.map((card, index) => (
              <div
                key={card.label}
                className="editorial-card p-6 contact-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="text-[10px] text-[#FF5500] font-bold block tracking-widest">{card.label}</span>
                <p className="text-sm font-black text-[#F4F4F0] mt-3 uppercase tracking-wider">{card.val}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-[#0B132B] text-[#EFEAD8]">
        <CtaSection variant="orange" />
      </div>
      <Footer variant="orange" />
    </div>
  )
}