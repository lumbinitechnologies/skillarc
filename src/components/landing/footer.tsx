"use client"

import { ArrowRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { DEMO_URL, MARKETING_NAV } from "@/components/landing/marketing-data"

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#14234B] px-5 py-20 text-white sm:px-8 lg:py-24">
      <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#C85D2E]/20 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#A9C2D7]">See SkillArc in context</p>
          <h2 className="max-w-3xl text-4xl font-bold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Make university work easier to see, manage, and move forward.
          </h2>
        </div>
        <div className="lg:justify-self-end">
          <p className="max-w-md text-lg leading-8 text-[#D6E3EC]">
            Talk with our team about admissions, academic operations, student support, and placements in one connected workspace.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#C85D2E] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#E07A48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#14234B]"
            >
              Book a demo <ArrowRight size={16} aria-hidden="true" />
            </a>
            <Link
              href="/platform"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#14234B]"
            >
              Explore the platform
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  const columns = [
    { title: "Platform", links: MARKETING_NAV.slice(0, 3).map(({ label, href }) => ({ label, href })) },
    {
      title: "Company",
      links: [
        { label: "About SkillArc", href: "/about" },
        { label: "Contact our team", href: DEMO_URL, external: true },
        { label: "Sign in", href: "/auth/login" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Resource hub", href: "/resources" },
        { label: "Admissions portal", href: "/apply" },
        { label: "Application status", href: "/apply/status" },
      ],
    },
  ]

  return (
    <footer className="bg-[#F0F5F8] px-5 py-14 text-[#31547A] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]">
              <Image src="/skillarc_logo.svg" alt="SkillArc" width={172} height={48} className="h-12 w-auto object-contain" />
            </Link>
            <p className="mt-5 max-w-sm text-base leading-7 text-[#58718B]">
              A connected university management platform for clearer operations and better student support.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#14234B]">{column.title}</h3>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md text-base text-[#58718B] transition hover:text-[#C85D2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]"
                      >
                        {link.label} <ArrowUpRight size={14} aria-hidden="true" />
                      </a>
                    ) : (
                      <Link href={link.href} className="inline-flex rounded-md text-base text-[#58718B] transition hover:text-[#C85D2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[#D7E2EA] pt-6 text-sm text-[#6D8498] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SkillArc. All rights reserved.</p>
          <p>
            Developed by <a href="https://www.lumbinitechnologies.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#31547A] underline decoration-[#C85D2E]/40 underline-offset-4 hover:text-[#C85D2E]">Lumbini Technologies</a>.
          </p>
        </div>
      </div>
    </footer>
  )
}
