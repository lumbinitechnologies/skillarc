"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, Menu, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { DEMO_URL, MARKETING_NAV } from "@/components/landing/marketing-data"

export default function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-[#DDE7EF]/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-6 px-5 sm:px-8 lg:px-10">
        <Link href="/" className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] focus-visible:ring-offset-2">
          <Image src="/skillarc_logo.svg" alt="SkillArc" width={172} height={44} className="h-11 w-auto object-contain" preload />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
          {MARKETING_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-1 py-2 text-sm font-semibold text-[#4D6480] transition-colors hover:text-[#14234B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/auth/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#31547A] transition-colors hover:text-[#14234B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]"
          >
            Sign in
          </Link>
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#C85D2E] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(200,93,46,0.2)] transition hover:bg-[#A94B22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] focus-visible:ring-offset-2"
          >
            Book a demo <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>

        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="mobile-marketing-nav"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#D9E3EC] text-[#14234B] transition hover:bg-[#F4F8FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] lg:hidden"
        >
          {isOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            id="mobile-marketing-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#E6EDF2] bg-white lg:hidden"
          >
            <nav aria-label="Mobile navigation" className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-5 sm:px-8">
              {MARKETING_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-semibold text-[#31547A] hover:bg-[#F4F8FB] hover:text-[#14234B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/auth/login"
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-semibold text-[#31547A] hover:bg-[#F4F8FB] hover:text-[#14234B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]"
              >
                Sign in
              </Link>
              <a
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#C85D2E] px-5 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] focus-visible:ring-offset-2"
              >
                Book a demo <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
