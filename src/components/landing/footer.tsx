"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

type FooterVariant = "orange" | "blue" | "amber" | "cyan"

const variantStyles: Record<FooterVariant, {
  title: string
  body: string
  primary: string
  secondary: string
  border: string
  glow: string
}> = {
  orange: {
    title: "text-[#FF5500]",
    body: "text-[#F4F4F0]/70",
    primary: "bg-[#FF5500] text-[#0B132B] border-[#FF5500]",
    secondary: "border-[#EFEAD8]/20 text-[#EFEAD8] hover:bg-[#FF5500] hover:text-[#0B132B] hover:border-[#FF5500]",
    border: "border-[#FF5500]/30",
    glow: "bg-[#FF5500]/15",
  },
  blue: {
    title: "text-[#38BDF8]",
    body: "text-[#E7F7FF]/70",
    primary: "bg-[#38BDF8] text-[#07141F] border-[#38BDF8]",
    secondary: "border-[#E7F7FF]/20 text-[#E7F7FF] hover:bg-[#38BDF8] hover:text-[#07141F] hover:border-[#38BDF8]",
    border: "border-[#38BDF8]/30",
    glow: "bg-[#38BDF8]/15",
  },
  amber: {
    title: "text-[#EAAD62]",
    body: "text-[#EFEAD8]/70",
    primary: "bg-[#EAAD62] text-[#0B132B] border-[#EAAD62]",
    secondary: "border-[#EFEAD8]/20 text-[#EFEAD8] hover:bg-[#EAAD62] hover:text-[#0B132B] hover:border-[#EAAD62]",
    border: "border-[#EAAD62]/30",
    glow: "bg-[#EAAD62]/15",
  },
  cyan: {
    title: "text-[#7DD3FC]",
    body: "text-[#EAFDFD]/70",
    primary: "bg-[#7DD3FC] text-[#07141F] border-[#7DD3FC]",
    secondary: "border-[#EAFDFD]/20 text-[#EAFDFD] hover:bg-[#7DD3FC] hover:text-[#07141F] hover:border-[#7DD3FC]",
    border: "border-[#7DD3FC]/30",
    glow: "bg-[#7DD3FC]/15",
  },
}

export function CtaSection({ variant = "orange" }: { variant?: FooterVariant }) {
  const styles = variantStyles[variant]

  return (
    <motion.section
      id="cta"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative py-32 max-w-5xl mx-auto px-6 lg:px-8 text-center space-y-6 z-10 font-['Space_Grotesk',sans-serif]"
    >
      <div className={`absolute inset-x-10 top-10 h-40 rounded-full blur-3xl ${styles.glow} pointer-events-none`} />
      <h2 className={`relative text-4xl sm:text-5xl font-sans font-black uppercase tracking-tight ${styles.title} leading-tight`}>
        Ready to simplify academic management?
      </h2>
      <p className={`relative text-xs sm:text-sm max-w-lg mx-auto leading-relaxed font-mono uppercase tracking-wider font-bold ${styles.body}`}>
        Bring your institutions, teams and students onto one connected platform. Set up your custom academic operating system today.
      </p>
      <div className="relative flex flex-wrap justify-center gap-4 pt-4">
        <button className={`px-8 py-3.5 border font-black text-xs font-mono uppercase tracking-wider rounded-full transition-all duration-300 shadow-lg ${styles.primary}`}>
          Request a Demo
        </button>
        <button className={`px-8 py-3.5 border font-black text-xs font-mono uppercase tracking-wider rounded-full transition-all duration-300 flex items-center gap-2 shadow-lg ${styles.secondary}`}>
          <span>Talk to our team</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </motion.section>
  )
}

export function Footer({ variant = "orange" }: { variant?: FooterVariant }) {
  const styles = variantStyles[variant]

  return (
    <motion.footer
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`bg-[#EFEAD8] text-[#0B132B]/70 border-t ${styles.border} py-16 relative z-10 font-['Space_Grotesk',sans-serif]`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <img
              src="/skillarc_logo.svg"
              alt="SkillArc Logo"
              className="h-8 w-auto object-contain brightness-0 contrast-200"
            />
            <div>
              <span className="text-xl font-black uppercase tracking-tight text-[#0B132B] block leading-none">SkillArc</span>
              <span className="text-[9px] font-mono text-[#0B132B]/50 uppercase tracking-widest font-black">Academic OS</span>
            </div>
          </div>
          <p className="text-xs text-[#0B132B]/70 max-w-xs leading-relaxed font-mono font-bold">
            The complete academic operating system for modern educational institutions.
          </p>
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-black uppercase tracking-widest text-[#0B132B]/60 block">
              [ Subscribe to our newsletter ]
            </label>
            <div className="flex border border-[#0B132B]/15 rounded-full overflow-hidden bg-[#0B132B]/5 px-3.5 py-1.5 focus-within:border-[#FF5500] max-w-sm transition-all">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 bg-transparent border-none outline-none text-xs text-[#0B132B] placeholder:text-[#0B132B]/40 font-mono font-bold"
              />
              <button className="text-[#0B132B]/70 hover:text-[#FF5500] shrink-0 font-black pl-2 transition-colors">
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {[
          {
            title: "Platform",
            links: [
              "Organization Management",
              "Institution Management",
              "Academic Management",
              "Timetable Builder",
              "Learning Hub",
              "Analytics",
              "AI Assistant",
            ],
          },
          {
            title: "Company",
            links: ["About Us", "Careers", "Contact Support"],
          },
          {
            title: "Resources",
            links: ["Documentation", "System Status", "Privacy Policy", "Terms of Service"],
          },
        ].map((col) => (
          <div key={col.title} className="space-y-4">
            <h4 className="text-[9px] font-black text-[#0B132B]/60 uppercase tracking-widest font-mono">
              [ {col.title} ]
            </h4>
            <ul className="space-y-2 text-xs text-[#0B132B]/80 font-black font-mono">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-[#FF5500] transition-colors duration-150">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-12 mt-12 border-t border-[#0B132B]/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#0B132B]/60 font-mono font-bold">
        <p>© {new Date().getFullYear()} SkillArc Academic OS. All rights reserved.</p>
        <p className="flex gap-4">
          <a href="#" className="hover:text-[#0B132B] transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-[#0B132B] transition-colors">Terms of Service</a>
        </p>
      </div>
    </motion.footer>
  )
}