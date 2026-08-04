"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export default function DashboardRouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isRouteLoading, setIsRouteLoading] = useState(false)

  useEffect(() => {
    setIsRouteLoading(true)

    const progressTimer = window.setTimeout(() => {
      setIsRouteLoading(false)
    }, 240)

    return () => window.clearTimeout(progressTimer)
  }, [pathname])

  return (
    <>
      <motion.div
        className="fixed inset-x-0 top-0 z-[80] h-[3px] origin-left rounded-b-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 shadow-[0_0_18px_rgba(99,102,241,0.45)]"
        initial={false}
        animate={
          isRouteLoading
            ? { opacity: 1, scaleX: 1 }
            : { opacity: 0, scaleX: 0.2 }
        }
        transition={{ duration: 0.22, ease: "easeOut" }}
      />

      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="p-6 md:p-8 lg:p-10 flex-1 min-w-0"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </>
  )
}
