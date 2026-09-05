"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  GraduationCap,
  Building2,
  Calendar,
  Search,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Award,
  Users,
  Sparkles,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
} from "lucide-react"

type Institution = {
  id: string
  name: string
  domain?: string
}

type Program = {
  id: string
  name: string
  institution_id: string
}

export default function AdmissionsDirectoryPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDirectory() {
      try {
        const res = await fetch("/api/admissions/public-apply")
        const data = await res.json()
        if (res.ok) {
          setInstitutions(data.institutions || [])
          setPrograms(data.programs || [])
        }
      } catch (err) {
        console.error("Failed to load admissions directory:", err)
      } finally {
        setLoading(false)
      }
    }
    loadDirectory()
  }, [])

  const filtered = institutions.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.domain?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800;900&family=Space+Mono:wght@400;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-[#0B132B] text-[#EFEAD8] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#E57D37] selection:text-[#EFEAD8] relative overflow-hidden">
        {/* Background Glowing Ambient Orbs */}
        <div className="fixed inset-0 pointer-events-none opacity-30">
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#E57D37] blur-[120px]" />
          <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-[#00C2A8] to-[#14234B] blur-[140px]" />
        </div>

        {/* Top Navbar */}
        <header className="sticky top-0 z-40 border-b border-[#3A6DAF]/20 bg-[#0B132B]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-12 py-4">
            <Link href="/" className="group flex items-center gap-3">
              <img
                src="/skillarc_logo.svg"
                alt="SkillArc Logo"
                className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
              />
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#3A6DAF]/30 bg-[#14234B]/60 text-[#EAAD62] font-['Space_Mono',monospace] text-[10px] uppercase tracking-widest font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E57D37] animate-pulse" />
                Admissions Desk
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/apply/status"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#3A6DAF]/40 bg-[#14234B]/60 hover:bg-[#14234B] text-[#ECDFCB] hover:border-[#EAAD62] hover:text-[#EAAD62] backdrop-blur-md transition-all duration-300 font-['Space_Mono',monospace] text-xs uppercase tracking-wider font-bold"
              >
                <span>Track Application</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Main Directory Body */}
        <main className="relative z-10 mx-auto max-w-6xl px-6 lg:px-12 py-16 space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#3A6DAF]/30 bg-[#14234B]/60 text-[#EAAD62] font-['Space_Mono',monospace] text-xs uppercase tracking-widest font-bold">
              <Sparkles className="h-3.5 w-3.5 text-[#E57D37]" />
              <span>Direct College Applications & Portals</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight font-['Space_Grotesk',sans-serif] text-[#EFEAD8] leading-[1.05]">
              Select Your College & <span className="text-[#E57D37]">Apply Online</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-sans leading-relaxed">
              Browse accredited institutions, choose your desired qualification, and submit your official enrolment application directly through dedicated institutional portals.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto pt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search college by name or domain..."
                className="w-full rounded-2xl border border-[#3A6DAF]/40 bg-[#14234B]/70 py-3.5 pl-12 pr-4 text-sm text-[#EFEAD8] placeholder:text-slate-400 outline-none focus:border-[#E57D37] focus:ring-2 focus:ring-[#E57D37]/20 backdrop-blur-md transition-all shadow-xl"
              />
            </div>
          </div>

          {/* Directory Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="rounded-3xl border border-[#3A6DAF]/20 bg-[#14234B]/40 p-6 space-y-4 animate-pulse h-56"
                >
                  <div className="h-6 w-1/3 bg-slate-700/50 rounded-lg" />
                  <div className="h-4 w-3/4 bg-slate-700/30 rounded-lg" />
                  <div className="h-4 w-1/2 bg-slate-700/30 rounded-lg" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-[#3A6DAF]/30 bg-[#14234B]/40 p-12 text-center max-w-md mx-auto space-y-3">
              <Building2 className="h-10 w-10 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-[#EFEAD8]">No institutions found</h3>
              <p className="text-xs text-slate-400">
                Try searching for a different keyword or check back later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((inst) => {
                const slug = inst.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                const instPrograms = programs.filter((p) => p.institution_id === inst.id)

                return (
                  <motion.div
                    key={inst.id}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="rounded-3xl border border-[#3A6DAF]/30 bg-[#14234B]/70 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6 hover:border-[#EAAD62]/60 hover:shadow-2xl transition-all group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E57D37] to-[#FF5500] text-[#EFEAD8] shadow-lg shadow-[#E57D37]/25 font-bold font-['Space_Grotesk',sans-serif] text-lg">
                          {inst.name.charAt(0)}
                        </div>
                        <span className="rounded-full bg-[#0B132B] border border-[#3A6DAF]/40 px-2.5 py-1 text-[10px] font-['Space_Mono',monospace] font-bold text-[#00C2A8] uppercase tracking-wider">
                          Live Portal
                        </span>
                      </div>

                      <div>
                        <h2 className="text-lg font-extrabold text-[#EFEAD8] font-['Space_Grotesk',sans-serif] group-hover:text-[#EAAD62] transition-colors">
                          {inst.name}
                        </h2>
                        {inst.domain && (
                          <p className="text-xs text-slate-400 font-['Space_Mono',monospace] mt-1">
                            {inst.domain}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[#3A6DAF]/20">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <BookOpen className="h-3.5 w-3.5 text-[#E57D37]" /> Available Courses
                          </span>
                          <span className="font-['Space_Mono',monospace] font-bold text-[#EFEAD8]">
                            {instPrograms.length} Programs
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        href={`/apply/${slug}`}
                        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-[#E57D37] to-[#FF5500] px-4 py-3 text-xs font-bold text-[#EFEAD8] shadow-lg shadow-[#FF5500]/20 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all font-['Space_Grotesk',sans-serif] tracking-wider uppercase"
                      >
                        <span>Open Application Portal</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Quick Tracking Strip */}
          <div className="rounded-3xl border border-[#3A6DAF]/30 bg-gradient-to-r from-[#14234B]/80 via-[#0B132B]/80 to-[#14234B]/80 p-6 sm:p-8 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-1.5 max-w-xl">
              <span className="text-[10px] font-bold uppercase tracking-widest font-['Space_Mono',monospace] text-[#EAAD62]">
                Applied Recently?
              </span>
              <h3 className="text-xl font-black font-['Space_Grotesk',sans-serif] text-[#EFEAD8]">
                Check Application Status or Sign Your Offer Letter
              </h3>
              <p className="text-xs text-slate-300 font-sans">
                Review real-time admission decisions, examine academic fee payment schedules, and complete legal digital acceptance.
              </p>
            </div>

            <Link
              href="/apply/status"
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#EAAD62] bg-[#EAAD62]/10 hover:bg-[#EAAD62] text-[#EAAD62] hover:text-[#0B132B] px-6 py-3.5 text-xs font-bold font-['Space_Grotesk',sans-serif] uppercase tracking-wider transition-all shrink-0 shadow-lg shadow-[#EAAD62]/10"
            >
              <span>Application Tracker & E-Sign</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
      </div>
    </>
  )
}
