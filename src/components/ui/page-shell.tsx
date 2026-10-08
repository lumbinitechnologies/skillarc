/**
 * Shared page-level animation primitives used across all institution-admin list pages.
 * Import these instead of copy-pasting the same variants everywhere.
 */

import { motion } from "framer-motion"
import type { ReactNode } from "react"

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
}

export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 110, damping: 18 },
  },
}

/**
 * The top header card used on every list page (Students, Faculty, Parents, etc.)
 * Provides consistent layout: icon + eyebrow + animated title + count badge + optional actions slot.
 */
export function PageHeader({
  icon,
  eyebrow,
  title,
  count,
  countLabel = "Records",
  subtitle,
  actions,
}: {
  icon: ReactNode
  eyebrow: string
  title: string
  count?: number
  countLabel?: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col gap-5 rounded-3xl bg-white/80 backdrop-blur-sm p-6 shadow-[0_1px_3px_rgba(15,23,36,0.06),0_4px_16px_rgba(15,23,36,0.04)] border border-slate-100 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/8 text-[var(--primary)] border border-[var(--primary)]/12 shadow-sm">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--primary)]">
            {eyebrow}
          </p>
          <div className="mt-0.5 flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
              {title}
            </h1>
            {count !== undefined && (
              <span className="rounded-full bg-[var(--primary)]/8 border border-[var(--primary)]/12 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">
                {count.toLocaleString()} {countLabel}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </motion.div>
  )
}

/**
 * Outer page wrapper — handles max-width, padding, and stagger container.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6"
    >
      {children}
    </motion.div>
  )
}

/**
 * Shared action button styles — use these instead of ad-hoc button classes.
 */
export const actionButtonClass = {
  primary:
    "inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent)] transition-all hover:scale-[1.02] active:scale-[0.98] duration-150",
  secondary:
    "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98] duration-150",
}

/**
 * Reusable search bar — consistent across all list pages.
 */
export function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <motion.div variants={itemVariants} className="relative">
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all duration-150 shadow-sm"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-base leading-none"
        >
          ×
        </button>
      )}
    </motion.div>
  )
}

/**
 * Skeleton rows for list loading states — consistent shimmer style.
 */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-2xl bg-slate-100 animate-shimmer"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

/**
 * Empty state — consistent placeholder for list pages.
 */
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/8 text-[var(--primary)]">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">{description}</p>
      )}
    </div>
  )
}
