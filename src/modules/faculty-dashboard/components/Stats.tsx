"use client"

import { BookOpen, Users, CalendarDays, CheckCircle2 } from "lucide-react"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

interface StatsProps {
  subjectCount: number
  studentCount: number
  todayClasses: number
  weeklyClasses: number
}

export default function Stats({
  subjectCount,
  studentCount,
  todayClasses,
  weeklyClasses,
}: StatsProps) {
  const stats = [
    {
      title: "Subjects",
      value: subjectCount,
      icon: <BookOpen size={18} color="#166534" />,
      bg: "#ecfdf5",
      color: "#166534",
    },
    {
      title: "Students",
      value: studentCount,
      icon: <Users size={18} color="#1d4ed8" />,
      bg: "#eff6ff",
      color: "#1d4ed8",
    },
    {
      title: "Today's Classes",
      value: todayClasses,
      icon: <CalendarDays size={18} color="#b45309" />,
      bg: "#fffbeb",
      color: "#b45309",
    },
    {
      title: "Weekly Classes",
      value: weeklyClasses,
      icon: <CheckCircle2 size={18} color="#7c3aed" />,
      bg: "#f5f3ff",
      color: "#7c3aed",
    },
  ]

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 16,
        marginBottom: 20,
        fontFamily: font,
      }}
    >
      {stats.map((card) => (
        <div
          key={card.title}
          style={{
            background: "#fff",
            border: "1px solid #eef2f7",
            borderRadius: 18,
            padding: 20,
            boxShadow: "0 2px 10px rgba(0,0,0,.04)",
            transition: "all .2s ease",
            cursor: "default",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)"
            e.currentTarget.style.boxShadow =
              "0 12px 25px rgba(0,0,0,.08)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)"
            e.currentTarget.style.boxShadow =
              "0 2px 10px rgba(0,0,0,.04)"
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: card.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            {card.icon}
          </div>

          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: card.color,
              lineHeight: 1,
            }}
          >
            {card.value}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "#6b7280",
              fontWeight: 500,
            }}
          >
            {card.title}
          </div>
        </div>
      ))}
    </div>
  )
}