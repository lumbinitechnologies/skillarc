"use client"

import { useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Ensure GSAP ScrollTrigger tracks native hardware scroll without interception
    ScrollTrigger.refresh()
  }, [])

  return <>{children}</>
}
