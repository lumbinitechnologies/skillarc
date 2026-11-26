import { forwardRef, type HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export const MessageScroller = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function MessageScroller({ className, ...props }, ref) {
  return <div ref={ref} className={cn("flex-1 overflow-y-auto", className)} {...props} />
})
