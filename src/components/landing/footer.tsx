"use client"

import { motion } from "framer-motion"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"

type FooterVariant = "orange" | "blue" | "amber" | "cyan"

const variantStyles: Record<FooterVariant, {
  title: string
  body: string
  primary: string
  secondary: string
  border: string
  glow: string
  hoverText: string
  hoverDecoration: string
  accentBadge: string
}> = {
  orange: {
    title: "text-[#FF5500]",
    body: "text-[#F4F4F0]/70",
    primary: "bg-[#FF5500] text-[#0B132B] border-[#FF5500] hover:bg-[#FF6A1A]",
    secondary: "border-[#EFEAD8]/20 text-[#EFEAD8] hover:bg-[#FF5500] hover:text-[#0B132B] hover:border-[#FF5500]",
    border: "border-[#FF5500]/30",
    glow: "bg-[#FF5500]/15",
    hoverText: "hover:text-[#FF5500]",
    hoverDecoration: "hover:decoration-[#FF5500]",
    accentBadge: "bg-[#FF5500]/10 text-[#FF5500] border-[#FF5500]/20",
  },
  blue: {
    title: "text-[#38BDF8]",
    body: "text-[#E7F7FF]/70",
    primary: "bg-[#38BDF8] text-[#07141F] border-[#38BDF8] hover:bg-[#58C9F9]",
    secondary: "border-[#E7F7FF]/20 text-[#E7F7FF] hover:bg-[#38BDF8] hover:text-[#07141F] hover:border-[#38BDF8]",
    border: "border-[#38BDF8]/30",
    glow: "bg-[#38BDF8]/15",
    hoverText: "hover:text-[#38BDF8]",
    hoverDecoration: "hover:decoration-[#38BDF8]",
    accentBadge: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20",
  },
  amber: {
    title: "text-[#EAAD62]",
    body: "text-[#EFEAD8]/70",
    primary: "bg-[#EAAD62] text-[#0B132B] border-[#EAAD62] hover:bg-[#F3BD7B]",
    secondary: "border-[#EFEAD8]/20 text-[#EFEAD8] hover:bg-[#EAAD62] hover:text-[#0B132B] hover:border-[#EAAD62]",
    border: "border-[#EAAD62]/30",
    glow: "bg-[#EAAD62]/15",
    hoverText: "hover:text-[#EAAD62]",
    hoverDecoration: "hover:decoration-[#EAAD62]",
    accentBadge: "bg-[#EAAD62]/10 text-[#EAAD62] border-[#EAAD62]/20",
  },
  cyan: {
    title: "text-[#7DD3FC]",
    body: "text-[#EAFDFD]/70",
    primary: "bg-[#7DD3FC] text-[#07141F] border-[#7DD3FC] hover:bg-[#9BE2FD]",
    secondary: "border-[#EAFDFD]/20 text-[#EAFDFD] hover:bg-[#7DD3FC] hover:text-[#07141F] hover:border-[#7DD3FC]",
    border: "border-[#7DD3FC]/30",
    glow: "bg-[#7DD3FC]/15",
    hoverText: "hover:text-[#7DD3FC]",
    hoverDecoration: "hover:decoration-[#7DD3FC]",
    accentBadge: "bg-[#7DD3FC]/10 text-[#7DD3FC] border-[#7DD3FC]/20",
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
        <Link
          href="/auth/login"
          className={`px-8 py-3.5 border font-black text-xs font-mono uppercase tracking-wider rounded-full transition-all duration-300 shadow-lg ${styles.primary}`}
        >
          Request a Demo
        </Link>
        <a
          href="https://www.lumbinitechnologies.com/Contact"
          target="_blank"
          rel="noopener noreferrer"
          className={`px-8 py-3.5 border font-black text-xs font-mono uppercase tracking-wider rounded-full transition-all duration-300 flex items-center gap-2 shadow-lg ${styles.secondary}`}
        >
          <span>Talk to our team</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </motion.section>
  )
}

type FooterLink = {
  label: string
  href: string
  external?: boolean
}

type FooterColumn = {
  title: string
  links: FooterLink[]
}

export function Footer({ variant = "orange" }: { variant?: FooterVariant }) {
  const styles = variantStyles[variant]

  const columns: FooterColumn[] = [
    {
      title: "Platform",
      links: [
        { label: "Platform Architecture", href: "/platform" },
        { label: "Role Solutions", href: "/solutions" },
        { label: "Core Engines", href: "/features" },
        { label: "Admissions Portal", href: "/apply" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About SkillArc", href: "/about" },
        { label: "Contact Us", href: "https://www.lumbinitechnologies.com/Contact", external: true },
        { label: "Lumbini Technologies", href: "https://www.lumbinitechnologies.com", external: true },
        { label: "Account Sign In", href: "/auth/login" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Resource Library", href: "/resources" },
        { label: "Application Status", href: "/apply/status" },
        { label: "Request Access", href: "/auth/login" },
      ],
    },
  ]

  return (
    <motion.footer
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`bg-[#EFEAD8] text-[#0B132B]/70 border-t ${styles.border} py-16 relative z-10 font-['Space_Grotesk',sans-serif]`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
        {/* Brand Col */}
        <div className="sm:col-span-2 space-y-4">
          <Link href="/" className="inline-block group cursor-pointer">
            <img
              src="/skillarc_logo.svg"
              alt="SkillArc Logo"
              className="h-16 md:h-20 w-auto object-contain brightness-0 contrast-200 group-hover:opacity-85 transition-opacity"
            />
          </Link>
          <p className="text-xs text-[#0B132B]/80 max-w-sm leading-relaxed font-mono font-bold">
            The unified academic operating system designed for modern educational institutions, multi-campus organizations, and student success.
          </p>
        </div>

        {/* Link Columns */}
        {columns.map((col) => (
          <div key={col.title} className="space-y-4">
            <h4 className="text-[10px] font-black text-[#0B132B]/60 uppercase tracking-widest font-mono">
              [ {col.title} ]
            </h4>
            <ul className="space-y-2.5 text-xs text-[#0B132B]/85 font-black font-mono">
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 ${styles.hoverText} transition-colors duration-150 group`}
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight size={11} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className={`inline-block ${styles.hoverText} transition-colors duration-150`}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-10 mt-12 border-t border-[#0B132B]/10 flex flex-col md:flex-row justify-between items-center gap-5 text-xs text-[#0B132B]/70 font-mono font-bold">
        <p>© {new Date().getFullYear()} SkillArc. All rights reserved.</p>

        <div className="flex items-center gap-2">
          <span>Developed by</span>
          <a
            href="https://www.lumbinitechnologies.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-black text-[#0B132B] ${styles.hoverText} underline underline-offset-4 decoration-[#0B132B]/30 ${styles.hoverDecoration} transition-all inline-flex items-center gap-1`}
          >
            <span>Lumbini Technologies</span>
            <ArrowUpRight size={12} />
          </a>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link href="/resources" className="hover:text-[#0B132B] transition-colors">
            Resources
          </Link>
          <span>•</span>
          <Link href="/apply" className="hover:text-[#0B132B] transition-colors">
            Admissions
          </Link>
          <span>•</span>
          <a
            href="https://www.lumbinitechnologies.com/Contact"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#0B132B] transition-colors inline-flex items-center gap-0.5"
          >
            <span>Contact</span>
            <ArrowUpRight size={10} />
          </a>
        </div>
      </div>
    </motion.footer>
  )
}