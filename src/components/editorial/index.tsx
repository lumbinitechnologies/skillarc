'use client'

import React from 'react'
import { cn } from '@/lib/utils'

// EditorialMetaTag - Small label/tag component
export const EditorialMetaTag = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn('text-[9px] font-medium uppercase tracking-[0.18em] text-[#D7A06A]', className)}>
    {children}
  </span>
)

// EditorialInput - Input field with icon support
interface EditorialInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
  rightSlot?: React.ReactNode
  error?: string
  meta?: string
}

export const EditorialInput = React.forwardRef<HTMLInputElement, EditorialInputProps>(
  ({ label, icon, rightSlot, error, meta, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="ed-label block text-sm font-semibold text-slate-100 mb-2">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300/80">{icon}</div>}
        {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg border border-[#1e2f4b] bg-[#0b1728] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#D7A06A]',
            icon && 'pl-11',
            rightSlot && 'pr-11',
            error && 'border-rose-500/50 bg-rose-500/10',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      {meta && !error && <p className="mt-2 text-xs text-slate-400">{meta}</p>}
    </div>
  )
)
EditorialInput.displayName = 'EditorialInput'

// EditorialSelect - Select field
interface EditorialSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Array<{ value: string; label: string }>
  error?: string
}

export const EditorialSelect = React.forwardRef<HTMLSelectElement, EditorialSelectProps>(
  ({ label, options, error, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="ed-label block text-sm font-semibold text-slate-100 mb-2">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-[#1e2f4b] bg-[#0b1728] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#D7A06A]',
          error && 'border-rose-500/50 bg-rose-500/10',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0f1d33] text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  )
)
EditorialSelect.displayName = 'EditorialSelect'

// EditorialButton - Button component
interface EditorialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outlined'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const EditorialButton = React.forwardRef<HTMLButtonElement, EditorialButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, children, className, disabled, ...props }, ref) => {
    const baseStyles = 'font-semibold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
      primary: 'bg-gradient-to-r from-[#F0C184] to-[#D98C4A] text-[#0e1729] shadow-[0_8px_16px_rgba(217,140,74,0.14)] hover:brightness-105 active:scale-[0.99]',
      secondary: 'bg-[#121f36] text-slate-100 border border-[#2a3d5a] hover:bg-[#162842] active:scale-[0.99]',
      outlined: 'border border-[#D7A06A] text-[#D7A06A] hover:bg-[#D7A06A]/5 active:scale-[0.99]',
    }

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-6 py-4 text-lg',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
EditorialButton.displayName = 'EditorialButton'

// EditorialCard - Card container
interface EditorialCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated'
}

export const EditorialCard = React.forwardRef<HTMLDivElement, EditorialCardProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-[#0c182b] border border-[#1f2f4b]',
      bordered: 'bg-[#0c182b] border border-[#233754]',
      elevated: 'bg-[#0c182b] border border-[#233754] shadow-[0_10px_24px_rgba(2,6,23,0.14)]',
    }

    return (
      <div
        ref={ref}
        className={cn('rounded-[18px] p-6 transition', variantStyles[variant], className)}
        {...props}
      />
    )
  }
)
EditorialCard.displayName = 'EditorialCard'

// EditorialCardContent - Card content wrapper
export const EditorialCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-4', className)} {...props} />
  )
)
EditorialCardContent.displayName = 'EditorialCardContent'
