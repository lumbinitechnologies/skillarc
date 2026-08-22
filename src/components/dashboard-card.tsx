import { motion } from "framer-motion"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

const CARD_CONFIG: Record<string, {
  bg: string; border: string; iconBg: string; barColor: string; trendColor: string; icon: React.ReactNode
}> = {
  "Total Courses": {
    bg: "#dbeafe", border: "#bfdbfe", iconBg: "#3b82f6", barColor: "#3b82f6", trendColor: "#1d4ed8",
    icon: (
      <svg width="16" height="16" fill="none" stroke="#fff" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  "Total Students": {
    bg: "#d1fae5", border: "#a7f3d0", iconBg: "#10b981", barColor: "#10b981", trendColor: "#065f46",
    icon: (
      <svg width="16" height="16" fill="none" stroke="#fff" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  "Assignments Due": {
    bg: "#fef3c7", border: "#fde68a", iconBg: "#f59e0b", barColor: "#f59e0b", trendColor: "#b45309",
    icon: (
      <svg width="16" height="16" fill="none" stroke="#fff" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  "Completion Rate": {
    bg: "#ede9fe", border: "#ddd6fe", iconBg: "#7c3aed", barColor: "#7c3aed", trendColor: "#6d28d9",
    icon: (
      <svg width="16" height="16" fill="none" stroke="#fff" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
}

const FALLBACK = {
  bg: "#f3f4f6", border: "#e5e7eb", iconBg: "#6b7280", barColor: "#6b7280", trendColor: "#374151",
  icon: (
    <svg width="16" height="16" fill="none" stroke="#fff" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
    </svg>
  ),
}

interface DashboardCardProps {
  title: string
  value: string | number
  index?: number
}

export default function DashboardCard({ title, value, index = 0 }: DashboardCardProps) {
  const c = CARD_CONFIG[title] ?? FALLBACK
  const strVal = String(value)
  const isPercent = strVal.includes("%")
  const numeric = parseFloat(strVal.replace("%", ""))
  const barFill = isPercent ? `${Math.min(numeric, 100)}%` : "55%"

  // Four different animation patterns for variety
  const animations = [
    // Spring bounce
    { initial: { scale: 0.8, opacity: 0, y: 20 }, animate: { scale: 1, opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 12, delay: index * 0.1 } } },
    // Slide left
    { initial: { x: -60, opacity: 0, filter: "blur(6px)" }, animate: { x: 0, opacity: 1, filter: "blur(0px)", transition: { delay: index * 0.08, duration: 0.6 } } },
    // Rotate zoom
    { initial: { scale: 0.5, rotate: -180, opacity: 0 }, animate: { scale: 1, rotate: 0, opacity: 1, transition: { delay: index * 0.09, duration: 0.8 } } },
    // Slide right
    { initial: { x: 60, opacity: 0, filter: "blur(6px)" }, animate: { x: 0, opacity: 1, filter: "blur(0px)", transition: { delay: index * 0.08, duration: 0.6 } } },
  ]

  const anim = animations[index % animations.length]

  return (
    <motion.div
      initial={anim.initial}
      animate={anim.animate}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        border: "1px solid #f3f4f6",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        overflow: "hidden",
        fontFamily: font,
      }}
    >
      {/* Pastel header band */}
      <div style={{
        backgroundColor: c.bg,
        borderBottom: `1px solid ${c.border}`,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          backgroundColor: c.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 2px 8px ${c.iconBg}44`,
          flexShrink: 0,
        }}>
          {c.icon}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: c.trendColor,
          backgroundColor: "#fff",
          border: `1px solid ${c.border}`,
          padding: "2px 8px",
          borderRadius: 999,
        }}>
          ↑ This month
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px 16px" }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", marginBottom: 4 }}>
          {title}
        </p>
        <p style={{ fontSize: 26, fontWeight: 800, color: "#111827", lineHeight: 1, marginBottom: 14 }}>
          {value}
        </p>
        <div style={{ height: 5, borderRadius: 999, backgroundColor: "#f3f4f6", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 999,
            backgroundColor: c.barColor,
            width: barFill,
            transition: "width 0.5s ease",
          }} />
        </div>
        {isPercent && (
          <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 5 }}>{value} complete</p>
        )}
      </div>
    </motion.div>
  )
}