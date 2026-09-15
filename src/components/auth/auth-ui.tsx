"use client"

import Image from "next/image"
import Link from "next/link"
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
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
  utilityLabel = "SkillArc access",
  children,
}: {
  title: string
  description: string
  utilityLabel?: string
  children: ReactNode
}) {
  return (
    <main className="auth-page min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(22,145,200,0.12),transparent_30%),radial-gradient(circle_at_92%_100%,rgba(200,93,46,0.12),transparent_28%),linear-gradient(145deg,#F8FBFD_0%,#F1F6F9_55%,#FFF8F3_100%)] text-[#14234B]">
      <div className="grid min-h-screen w-full lg:grid-cols-[minmax(440px,0.88fr)_minmax(520px,1.12fr)]">
        <section className="relative flex min-h-screen flex-col px-5 py-6 sm:px-10 sm:py-8 lg:px-14 lg:py-10 xl:px-20">
          <Link
            href="/"
            className={cn(
              "inline-flex w-fit shrink-0 rounded-xl",
              focusRing,
              "focus-visible:ring-offset-[#F3F7FA]"
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
              <div className="mb-7 space-y-3 sm:mb-8">
                <h1
                  className="font-sans text-3xl font-extrabold tracking-[-0.04em] text-[#14234B] sm:text-4xl"
                >
                  {title}
                </h1>
                <p
                  className="max-w-[40rem] text-sm leading-7 text-[#5B708A] sm:text-base"
                >
                  {description}
                </p>
              </div>

              {children}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 border-t border-[#DCE6EE] pt-5 text-xs text-[#70849A]">
            <Link
              href="/"
              className={cn("inline-flex items-center gap-1.5 font-semibold text-[#31547A] hover:text-[#14234B]", focusRing)}
            >
              Back to home <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <aside className="relative hidden min-h-screen overflow-hidden bg-[#14234B] text-white lg:block" aria-label="University campus">
          <Image
            src="/images/auth/university-campus.jpg"
            alt="University campus building"
            fill
            sizes="(min-width: 1024px) 55vw, 0px"
            className="object-cover object-[center_42%]"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(155deg,rgba(20,35,75,0.2)_0%,rgba(20,35,75,0.54)_54%,rgba(20,35,75,0.82)_100%)]" aria-hidden="true" />
          <div className="absolute -right-32 top-[-8rem] h-[34rem] w-[34rem] rounded-full bg-[#1691C8]/25 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-[#C85D2E]/30 blur-3xl" aria-hidden="true" />

          <div className="relative z-10 flex h-full min-h-screen flex-col justify-between px-10 py-10 xl:px-16">
            <div className="flex items-center gap-3 text-sm font-semibold text-white">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FC8402]" aria-hidden="true" />
              <span>{utilityLabel}</span>
            </div>
            <div className="flex justify-end">
              <span className="h-20 w-20 rounded-full border border-white/15 bg-white/5 blur-[1px]" aria-hidden="true" />
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

export const AuthCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
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
