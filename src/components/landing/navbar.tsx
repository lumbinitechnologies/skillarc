"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"

const NAV_ITEMS = [
  { label: "Platform", index: "01" },
  { label: "Solutions", index: "02" },
  { label: "Features", index: "03" },
  { label: "Resources", index: "04" },
  { label: "About", index: "05" },
]

export default function EditorialNavbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      {/* Fixed Ultra-Minimal Screen Frame */}
      <header className="fixed top-0 left-0 w-full z-50 px-6 lg:px-12 py-3 md:py-4 flex justify-between items-center pointer-events-none">
        {/* Brand Logo Container with Form-Fitted Silhouette Blur */}
        <div className="relative pointer-events-auto flex items-center">
          {/* Ultra-smooth multi-stop radial fade blur - zero hard edges, dissolves naturally */}
          <div
            className="absolute -inset-12 sm:-inset-20 pointer-events-none -z-10 backdrop-blur-xl"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 75% 65% at 48% 50%, #000 0%, rgba(0,0,0,0.75) 25%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.12) 75%, transparent 100%)",
              maskImage:
                "radial-gradient(ellipse 75% 65% at 48% 50%, #000 0%, rgba(0,0,0,0.75) 25%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.12) 75%, transparent 100%)",
            }}
          />

          <Link href="/" className="cursor-pointer group flex items-center">
            <img
              src="/skillarc_logo.svg"
              alt="SkillArc Logo"
              className="h-16 sm:h-20 md:h-24 w-auto object-contain group-hover:scale-105 transition-transform duration-200 drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]"
            />
          </Link>
        </div>

        {/* Unique Magnetic "Menu" Trigger & Log In Pills */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 font-sans">
          <Link
            href="/auth/login"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border border-[#3A6DAF]/30 bg-[#14234B]/60 hover:bg-[#14234B]/80 text-[#ECDFCB] hover:border-[#EAAD62] hover:text-[#EAAD62] backdrop-blur-md transition-all duration-300 font-mono text-[10px] sm:text-xs uppercase tracking-widest font-bold shadow-sm"
          >
            <span>Log In</span>
          </Link>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`group relative flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-2 rounded-full border bg-[#14234B]/60 backdrop-blur-md transition-all duration-500 overflow-hidden shadow-sm ${
              isOpen
                ? "border-[#E57D37] text-[#E57D37]"
                : "border-[#3A6DAF]/30 hover:border-[#EAAD62]"
            }`}
          >
            {/* Glow Indicator: Orange when open, Amber when closed */}
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOpen ? "bg-[#E57D37]" : "bg-[#EAAD62]"
              } animate-pulse`}
            />

            <span
              className={`font-mono text-xs uppercase tracking-widest transition-transform duration-300 group-hover:-translate-y-6 ${
                isOpen ? "text-[#E57D37]" : "text-[#ECDFCB]"
              }`}
            >
              {isOpen ? "Close" : "Menu"}
            </span>
            <span
              className={`font-mono text-xs uppercase tracking-widest absolute left-7 sm:left-8 translate-y-6 transition-transform duration-300 group-hover:translate-y-0 ${
                isOpen ? "text-[#E57D37]" : "text-[#EAAD62]"
              }`}
            >
              {isOpen ? "Close" : "Menu"}
            </span>

            {/* Kinetic Hamburger Lines */}
            <div className="flex flex-col gap-1 w-4">
              <span
                className={`h-[1px] transition-all duration-300 ${
                  isOpen ? "bg-[#E57D37] rotate-45 translate-y-[2.5px]" : "bg-[#ECDFCB]"
                }`}
              />
              <span
                className={`h-[1px] transition-all duration-300 ${
                  isOpen ? "bg-[#E57D37] -rotate-45 -translate-y-[2.5px]" : "bg-[#ECDFCB]"
                }`}
              />
            </div>
          </button>
        </div>
      </header>

      {/* Full-Screen Kinetic Editorial Curtain Menu */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="editorial-curtain-menu"
            initial={{ y: "-100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 bg-[#14234B] z-40 pt-28 pb-12 flex flex-col justify-between text-[#ECDFCB] font-sans"
          >
            {/* Fine Wireframe Lines */}
            <div className="absolute inset-0 border-x border-[#3A6DAF]/20 max-w-7xl mx-auto pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full flex flex-col justify-between h-full relative z-10">
              {/* Main Navigation List: Vertically Centered */}
              <div className="flex-1 flex flex-col justify-center my-auto">
                <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div className="md:col-span-3 font-mono text-xs uppercase text-[#94BAC4] tracking-widest flex items-center gap-2">
                    <span className="text-[#EAAD62]">//</span>
                    <span>[ Navigation Index ]</span>
                  </div>

                  <nav className="md:col-span-9 flex flex-col gap-2">
                    {NAV_ITEMS.map((item) => (
                      <motion.div
                        key={item.label}
                        whileHover={{ x: 12 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <Link
                          href={`/${item.label.toLowerCase()}`}
                          onClick={() => setIsOpen(false)}
                          className="group relative flex items-baseline gap-6 border-b border-[#3A6DAF]/30 py-4 overflow-hidden"
                        >
                          <span className="font-mono text-xs text-[#94BAC4] group-hover:text-[#EAAD62] transition-colors">
                            {item.index}
                          </span>
                          <span className="font-sans font-bold uppercase tracking-tight text-4xl sm:text-6xl md:text-7xl text-[#ECDFCB] group-hover:text-[#E57D37] transition-colors duration-300">
                            {item.label}
                          </span>
                          <ArrowUpRight className="opacity-0 group-hover:opacity-100 text-[#E57D37] transition-all duration-300 transform -translate-x-4 group-hover:translate-x-0" />
                        </Link>
                      </motion.div>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Editorial Curtain Footer */}
              <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center pt-8 border-t border-[#3A6DAF]/30 font-mono text-xs text-[#94BAC4]">
                <div>SKILLARC</div>
                <div className="flex gap-6 mt-4 sm:mt-0 text-[#ECDFCB]">
                  <Link
                    href="/auth/login"
                    onClick={() => setIsOpen(false)}
                    className="hover:text-[#EAAD62] transition-colors flex items-center gap-1"
                  >
                    <span>ACCOUNT LOG IN</span>
                    <span className="text-[#E57D37]">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}