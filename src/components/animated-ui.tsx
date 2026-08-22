import { motion } from "framer-motion"
import { ReactNode } from "react"
import { springBounce, slideInLeft, slideInRight, elasticPop } from "@/lib/animations"

// Animated card with spring bounce
export function AnimatedCard({
  children,
  index = 0,
  className = "",
  variant = "spring" as "spring" | "elastic" | "slideInLeft" | "slideInRight",
}: {
  children: ReactNode
  index?: number
  className?: string
  variant?: "spring" | "elastic" | "slideInLeft" | "slideInRight"
}) {
  const variants = {
    spring: springBounce,
    elastic: elasticPop,
    slideInLeft,
    slideInRight,
  }

  return (
    <motion.div
      custom={index}
      variants={variants[variant]}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Animated stat counter
export function AnimatedCounter({
  value,
  duration = 1.5,
  prefix = "",
  suffix = "",
}: {
  value: number | string
  duration?: number
  prefix?: string
  suffix?: string
}) {
  const numValue = typeof value === "string" ? parseInt(value) : value

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.span>
        {prefix}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration }}
        >
          {numValue}
        </motion.span>
        {suffix}
      </motion.span>
    </motion.div>
  )
}

// Animated list with staggered items
export function AnimatedList({
  items,
  children,
  staggerDelay = 0.08,
}: {
  items: any[]
  children: (item: any, index: number) => ReactNode
  staggerDelay?: number
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.05,
          },
        },
      }}
    >
      {items.map((item, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, x: -20, y: 10 },
            visible: {
              opacity: 1,
              x: 0,
              y: 0,
              transition: { duration: 0.4, ease: "easeOut" },
            },
          }}
        >
          {children(item, i)}
        </motion.div>
      ))}
    </motion.div>
  )
}

// Page transition wrapper
export function PageTransition({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
