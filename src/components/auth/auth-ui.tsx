"use client"

import Image from "next/image"
import Link from "next/link"
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react"
import { forwardRef } from "react"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E] focus-visible:ring-offset-2"

export function AuthShell({
  title,
  description,
  presentation = "workspace",
  children,
}: {
  title: string
  description: string
  presentation?: "workspace" | "gradient"
  children: ReactNode
}) {
  const isGradient = presentation === "gradient"

  return (
    <main
      className={cn(
        "auth-page min-h-screen overflow-x-hidden text-[#14234B]",
        isGradient &&
          "bg-[radial-gradient(circle_at_10%_8%,rgba(22,145,200,0.34),transparent_30%),radial-gradient(circle_at_90%_88%,rgba(200,93,46,0.24),transparent_28%),linear-gradient(135deg,#14234B_0%,#203B68_55%,#172853_100%)]",
        !isGradient && "bg-[#F3F7FA]"
      )}
    >
      <div
        className={cn(
          "mx-auto grid min-h-screen",
          isGradient
            ? "max-w-[760px] lg:px-8"
            : "max-w-[1600px] lg:grid-cols-[minmax(440px,0.9fr)_minmax(560px,1.1fr)]"
        )}
      >
        <section
          className={cn(
            "relative flex min-h-screen flex-col px-5 py-6 sm:px-10 sm:py-8 lg:px-14 xl:px-20",
            isGradient && "lg:px-0"
          )}
        >
          <Link
            href="/"
            className={cn(
              "inline-flex w-fit shrink-0 rounded-xl",
              isGradient && "bg-white p-2.5 shadow-[0_12px_30px_rgba(5,15,35,0.18)]",
              focusRing,
              isGradient ? "focus-visible:ring-offset-[#14234B]" : "focus-visible:ring-offset-[#F3F7FA]"
            )}
          >
            <Image
              src="/skillarc_logo.svg"
              alt="SkillArc"
              width={172}
              height={64}
              className="h-14 w-auto object-contain sm:h-16"
              priority
            />
          </Link>

          <div className="flex flex-1 items-center justify-center py-10 sm:py-14 lg:py-16">
            <div className="mx-auto w-full max-w-[480px]">
              <div className="mb-8 space-y-3">
                <h1
                  className={cn(
                    "font-sans text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl",
                    isGradient ? "text-white" : "text-[#14234B]"
                  )}
                >
                  {title}
                </h1>
                <p
                  className={cn(
                    "max-w-[40rem] text-sm leading-7 sm:text-base",
                    isGradient ? "text-[#D4DFEC]" : "text-[#5B708A]"
                  )}
                >
                  {description}
                </p>
              </div>

              {children}

            </div>
          </div>

          <div
            className={cn(
              "flex items-center justify-end gap-4 border-t pt-5 text-xs",
              isGradient ? "border-white/15 text-white/70" : "border-[#DCE6EE] text-[#70849A]"
            )}
          >
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-1.5 font-semibold hover:text-[#14234B]",
                isGradient ? "text-white hover:text-white" : "text-[#31547A]",
                focusRing
              )}
            >
              Back to home <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {!isGradient ? <aside className="relative hidden overflow-hidden bg-[#14234B] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute -right-28 top-[-9rem] h-[34rem] w-[34rem] rounded-full bg-[#31547A]/35 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-[#C85D2E]/20 blur-3xl" aria-hidden="true" />

          <div className="relative z-10 flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-white">A connected university workspace</p>
              <p className="mt-1 text-sm text-[#B7C8D8]">One place for the work that keeps campus moving.</p>
            </div>
            <div className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 sm:flex" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-[#C85D2E]" />
            </div>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[640px] py-12 xl:py-20">
            <div className="overflow-hidden rounded-[30px] border border-white/15 bg-[#F7FAFC] text-[#14234B] shadow-[0_30px_100px_rgba(5,15,35,0.3)]">
              <div className="flex items-center justify-between border-b border-[#E2EAF0] px-5 py-4 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#D1DCE6]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#D1DCE6]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#C85D2E]" />
                  </div>
                  <span className="text-sm font-bold text-[#31547A]">University workspace</span>
                </div>
                <span className="text-xs font-semibold text-[#70849A]">Illustrative view</span>
              </div>

              <div className="space-y-5 p-5 sm:p-7">
                <div className="grid gap-3 sm:grid-cols-3">
                  <WorkspaceCard title="Admissions" detail="Applications and enrolment" accent="terracotta" />
                  <WorkspaceCard title="Academic operations" detail="Programs and timetables" accent="navy" />
                  <WorkspaceCard title="Student support" detail="Attendance and progress" accent="mint" />
                </div>

                <div className="rounded-2xl border border-[#DDE7EF] bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#14234B]">Shared context</p>
                      <p className="mt-1 text-xs leading-5 text-[#70849A]">Bring the right context into each conversation.</p>
                    </div>
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#C85D2E]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#A8D9C8]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#A8BED4]" />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2" aria-hidden="true">
                    <div className="h-16 rounded-xl border border-[#F0D3C5] bg-[#FBECE5]" />
                    <span className="h-px w-full bg-[#D5E0E9]" />
                    <div className="h-16 rounded-xl border border-[#C8DBEB] bg-[#EAF1F7]" />
                    <span className="h-px w-full bg-[#D5E0E9]" />
                    <div className="h-16 rounded-xl border border-[#C5E6D9] bg-[#E7F6F0]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="relative z-10 max-w-[30rem] text-sm leading-7 text-[#B7C8D8]">
            SkillArc gives university teams a shared view of admissions, academic operations, teaching, and student support.
          </p>
        </aside> : null}
      </div>
    </main>
  )
}

function WorkspaceCard({
  title,
  detail,
  accent,
}: {
  title: string
  detail: string
  accent: "terracotta" | "navy" | "mint"
}) {
  const styles = {
    terracotta: "border-[#F0D3C5] bg-[#FBECE5] text-[#A94B22]",
    navy: "border-[#C8DBEB] bg-[#EAF1F7] text-[#31547A]",
    mint: "border-[#C5E6D9] bg-[#E7F6F0] text-[#087F62]",
  }

  return (
    <div className={cn("rounded-2xl border p-4", styles[accent])}>
      <span className="mb-8 block h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#5B708A]">{detail}</p>
    </div>
  )
}

export const AuthCard = forwardRef<HTMLDivElement, { children: ReactNode; className?: string }>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[24px] border border-[#DCE6EE] bg-white p-5 shadow-[0_18px_50px_rgba(20,35,75,0.08)] sm:p-7",
        className
      )}
    >
      {children}
    </div>
  )
)
AuthCard.displayName = "AuthCard"

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: ReactNode
  rightSlot?: ReactNode
  hint?: string
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, icon, rightSlot, hint, className, id, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "auth-field")
    const hintId = hint ? `${inputId}-hint` : undefined

    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-[#31547A]">
            {label}
          </label>
        ) : null}
        <div className="relative">
          {icon ? <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7890A7]">{icon}</span> : null}
          <input
            ref={ref}
            id={inputId}
            aria-describedby={hintId}
            className={cn(
              "h-12 w-full rounded-xl border border-[#CBD9E4] bg-white px-4 text-sm text-[#14234B] outline-none transition placeholder:text-[#9AAABD] focus:border-[#C85D2E] focus:ring-4 focus:ring-[#C85D2E]/10",
              icon && "pl-11",
              rightSlot && "pr-12",
              className
            )}
            {...props}
          />
          {rightSlot ? <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span> : null}
        </div>
        {hint ? <p id={hintId} className="mt-2 text-xs leading-5 text-[#70849A]">{hint}</p> : null}
      </div>
    )
  }
)
AuthField.displayName = "AuthField"

interface AuthSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: Array<{ value: string; label: string }>
}

export const AuthSelect = forwardRef<HTMLSelectElement, AuthSelectProps>(
  ({ label, options, className, id, ...props }, ref) => {
    const selectId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-")

    return (
      <div className="w-full">
        <label htmlFor={selectId} className="mb-2 block text-sm font-semibold text-[#31547A]">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "h-12 w-full rounded-xl border border-[#CBD9E4] bg-white px-4 text-sm text-[#14234B] outline-none transition focus:border-[#C85D2E] focus:ring-4 focus:ring-[#C85D2E]/10",
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    )
  }
)
AuthSelect.displayName = "AuthSelect"

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  variant?: "primary" | "secondary" | "danger"
}

export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({ children, className, isLoading = false, variant = "primary", disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-[#C85D2E] text-white shadow-[0_10px_24px_rgba(200,93,46,0.2)] hover:bg-[#A94B22]",
      secondary: "border border-[#B8C9D8] bg-white text-[#31547A] hover:bg-[#F4F8FB]",
      danger: "bg-[#B84A4A] text-white shadow-[0_10px_24px_rgba(184,74,74,0.18)] hover:bg-[#963B3B]",
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55",
          focusRing,
          variants[variant],
          className
        )}
        {...props}
      >
        {isLoading ? <span className="motion-safe:animate-spin h-4 w-4 rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : null}
        {children}
      </button>
    )
  }
)
AuthButton.displayName = "AuthButton"

export function AuthMessage({
  title,
  children,
  tone = "error",
}: {
  title?: string
  children: ReactNode
  tone?: "error" | "success" | "warning" | "info"
}) {
  const styles = {
    error: "border-[#F0CACA] bg-[#FFF5F5] text-[#9B3B3B]",
    success: "border-[#BFE4D4] bg-[#F0FBF6] text-[#087F62]",
    warning: "border-[#F2D8A7] bg-[#FFF9EA] text-[#8B5A16]",
    info: "border-[#C8DBEB] bg-[#F2F8FC] text-[#31547A]",
  }

  return (
    <div className={cn("mb-5 rounded-xl border px-4 py-3 text-sm leading-6", styles[tone])} role={tone === "error" ? "alert" : "status"}>
      {title ? <p className="font-bold">{title}</p> : null}
      <div className={title ? "mt-1" : undefined}>{children}</div>
    </div>
  )
}

export function AuthLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("font-bold text-[#A94B22] underline decoration-[#E8B39D] underline-offset-4 hover:text-[#7F351A]", focusRing, className)}>
      {children}
    </Link>
  )
}
