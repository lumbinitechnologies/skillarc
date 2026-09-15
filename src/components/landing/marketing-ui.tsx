import type { ReactNode } from "react"
import LandingNavbar from "@/components/landing/navbar"
import { CtaSection, Footer } from "@/components/landing/footer"
import type { MarketingAccent } from "@/components/landing/marketing-data"

const accentStyles: Record<MarketingAccent, { eyebrow: string; soft: string; line: string }> = {
  terracotta: { eyebrow: "text-[#C85D2E]", soft: "bg-[#FBECE5]", line: "bg-[#C85D2E]" },
  navy: { eyebrow: "text-[#31547A]", soft: "bg-[#EAF1F7]", line: "bg-[#31547A]" },
  mint: { eyebrow: "text-[#087F62]", soft: "bg-[#E7F6F0]", line: "bg-[#087F62]" },
  amber: { eyebrow: "text-[#A66314]", soft: "bg-[#FFF5DE]", line: "bg-[#A66314]" },
}

export function MarketingShell({ children, cta = true }: { children: ReactNode; cta?: boolean }) {
  return (
    <div className="marketing-site min-h-screen overflow-x-hidden bg-[#F7FAFC] text-[#14234B]">
      <LandingNavbar />
      {children}
      {cta ? <CtaSection /> : null}
      <Footer />
    </div>
  )
}

export function ProductWindow({
  title,
  label = "Illustrative workspace",
  accent = "navy",
  children,
  className = "",
}: {
  title: string
  label?: string
  accent?: MarketingAccent
  children: ReactNode
  className?: string
}) {
  const styles = accentStyles[accent]

  return (
    <div className={`product-window overflow-hidden rounded-[28px] border border-[#D9E3EC] bg-white shadow-[0_24px_70px_rgba(20,35,75,0.12)] ${className}`}>
      <div className="flex items-center justify-between gap-4 border-b border-[#E6EDF2] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#D5DFE8]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#D5DFE8]" />
            <span className={`h-2.5 w-2.5 rounded-full ${styles.line}`} />
          </div>
          <span className="truncate text-sm font-semibold text-[#31547A]">{title}</span>
        </div>
        <span className={`hidden shrink-0 rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex ${styles.soft} ${styles.eyebrow}`}>
          {label}
        </span>
      </div>
      <div className="p-5 sm:p-7">{children}</div>
    </div>
  )
}

export function SoftCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-[#DCE6EE] bg-white p-6 shadow-[0_12px_36px_rgba(20,35,75,0.06)] ${className}`}>{children}</div>
}
