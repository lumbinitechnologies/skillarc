// src/components/placements-ui.tsx — Self-contained UI components for Placements (Upgraded to SkillArc Design System)

import React from "react";
import { cn } from "@/lib/utils";

// ── Card ───────────────────────────────────────────────────────────
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-100/80 bg-white p-6 shadow-[0_2px_12px_rgba(15,23,42,0.015)] transition-all duration-300 hover:shadow-[0_20px_45px_rgba(22,144,199,0.06)] hover:border-indigo-100/80",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaUp?: boolean;
  icon?: React.ReactNode;
  accent?: string;
}

export function StatCard({ label, value, delta, deltaUp, icon, accent }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-slate-100/80 bg-white p-6 shadow-[0_2px_12px_rgba(15,23,42,0.015)] flex flex-col justify-between gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(108,99,255,0.06)] hover:border-indigo-100/80">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </span>
        {icon && (
          <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-sm border border-slate-100/50", accent ?? "bg-indigo-50 text-[#6C63FF]")}>
            {icon}
          </span>
        )}
      </div>
      <div>
        <span className="text-3xl font-bold font-['Space_Grotesk'] text-slate-900 tracking-tight">{value}</span>
        {delta && (
          <span className={cn("text-xs font-semibold flex items-center gap-1 mt-1.5", deltaUp ? "text-[#00C2A8]" : "text-[#F04438]")}>
            {deltaUp ? "▲" : "▼"} {delta}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────
type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

export function Badge({ variant = "neutral", className, children, ...props }: {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const styles: Record<BadgeVariant, string> = {
    success: "bg-[#00C2A8]/5 text-[#00C2A8] border-[#00C2A8]/15",
    warning: "bg-[#FFB020]/5 text-[#FFB020] border-[#FFB020]/15",
    danger: "bg-[#F04438]/5 text-[#F04438] border-[#F04438]/15",
    info: "bg-[#6C63FF]/5 text-[#6C63FF] border-[#6C63FF]/15",
    neutral: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border", styles[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}

// ── Button ─────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, className, children, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
    const styles = {
      primary: "bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] hover:from-[#5C53EF] hover:to-[#7B4CE6] text-white shadow-sm hover:shadow-md hover:shadow-indigo-100/50",
      secondary: "bg-slate-50 border border-slate-200/60 text-slate-700 hover:bg-slate-100",
      ghost: "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
    };

    return (
      <button
        ref={ref}
        className={cn(base, styles[variant], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// ── Input ──────────────────────────────────────────────────────────
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 text-xs shadow-sm focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/10 transition-all placeholder:text-slate-400 font-semibold",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

// ── Select ─────────────────────────────────────────────────────────
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 text-xs shadow-sm focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/10 transition-all font-semibold",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

// ── Skeleton loader ────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-slate-100 rounded-3xl", className)} />
  );
}

// ── Section header ─────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="pb-6 border-b border-slate-100/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black font-['Plus_Jakarta_Sans'] tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 font-semibold mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────
export function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
      {icon && <div className="mb-3 text-[#6C63FF]/60">{icon}</div>}
      <p className="text-slate-800 text-sm font-bold">{message}</p>
      <p className="text-slate-400 text-xs mt-1">Try adjusting filters or checking back later.</p>
    </div>
  );
}
