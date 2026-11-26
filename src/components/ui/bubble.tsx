import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export function Bubble({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl", className)} {...props} />
}
