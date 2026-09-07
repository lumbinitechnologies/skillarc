import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

export function Message({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex w-full gap-2.5", className)} {...props} />
}

export function MessageContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("max-w-[82%] rounded-2xl px-3.5 py-3 text-xs leading-relaxed", className)} {...props} />
}

export function MessageAvatar({ children, className, ...props }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl", className)} {...props}>{children}</div>
}
