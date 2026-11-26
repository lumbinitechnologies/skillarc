"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

export default function DashboardRouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PERF_DIAGNOSTICS !== "true") return

    const navigationStart = "dashboard-navigation:start"
    const markName = `dashboard-navigation:${pathname}`
    if (!performance.getEntriesByName(navigationStart).length) {
      performance.mark(navigationStart)
    }
    performance.mark(`${markName}:ready`)
    performance.measure(markName, navigationStart, `${markName}:ready`)
  }, [pathname])

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PERF_DIAGNOSTICS !== "true") return

    const handleNavigationStart = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!target) return
      performance.clearMarks("dashboard-navigation:start")
      performance.clearMeasures("dashboard-navigation")
      performance.mark("dashboard-navigation:start")
    }

    document.addEventListener("click", handleNavigationStart)
    return () => document.removeEventListener("click", handleNavigationStart)
  }, [])

  return (
    <>
      <motion.main
        initial={{ opacity: 0.94, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        className="p-6 md:p-8 lg:p-10 flex-1 min-w-0"
      >
        {children}
      </motion.main>
    </>
  )
}
