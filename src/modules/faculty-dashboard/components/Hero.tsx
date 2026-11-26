"use client"

import { useCurrentTime } from "@/hooks/use-current-time"


import { GraduationCap, CalendarDays, BookOpen } from "lucide-react"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

interface HeroProps {
  faculty: {
    name?: string
    email: string
    institution: string
  }
  subjectCount: number
  todayClasses: number
}

export default function Hero({
  faculty,
  subjectCount,
  todayClasses,
}: HeroProps) {
  const currentTime = useCurrentTime()
  const hour = new Date(currentTime).getHours()

  const greeting =
    hour < 12
      ? "Good Morning"
      : hour < 17
      ? "Good Afternoon"
      : "Good Evening"

  const displayName =
    faculty.name ||
    faculty.email.split("@")[0].replace(/\./g, " ")

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg,#065f46 0%,#059669 50%,#10b981 100%)",
        borderRadius: 22,
        padding: "30px 34px",
        color: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: font,
        boxShadow: "0 12px 30px rgba(5,150,105,.18)",
        marginBottom: 20,
      }}
    >
      <div>
        <p
          style={{
            fontSize: 14,
            opacity: .85,
            marginBottom: 6,
          }}
        >
          {greeting} 👋
        </p>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-0.03em",
          }}
        >
          {displayName}
        </h1>

        <p
          style={{
            marginTop: 8,
            fontSize: 14,
            opacity: .9,
            lineHeight: 1.6,
          }}
        >
          Faculty Dashboard
          <br />
          {faculty.institution}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,.12)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 18,
            padding: "16px 18px",
            minWidth: 150,
          }}
        >
          <BookOpen size={18} />

          <p
            style={{
              marginTop: 12,
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            {subjectCount}
          </p>

          <p
            style={{
              fontSize: 12,
              opacity: .8,
            }}
          >
            Assigned Subjects
          </p>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,.12)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 18,
            padding: "16px 18px",
            minWidth: 150,
          }}
        >
          <CalendarDays size={18} />

          <p
            style={{
              marginTop: 12,
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            {todayClasses}
          </p>

          <p
            style={{
              fontSize: 12,
              opacity: .8,
            }}
          >
            Classes Today
          </p>
        </div>

        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "rgba(255,255,255,.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
          }}
        >
          <GraduationCap size={34} />
        </div>
      </div>
    </div>
  )
}