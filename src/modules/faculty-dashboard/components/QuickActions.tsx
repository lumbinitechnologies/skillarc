"use client"

import { useRouter } from "next/navigation"
import {
  BookOpen,
  CalendarDays,
  Users,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

export default function QuickActions() {
  const router = useRouter()

  const actions = [
    {
      title: "My Subjects",
      description: "View assigned subjects",
      href: "/dashboard/faculty/subjects",
      icon: <BookOpen size={18} color="#166534" />,
      bg: "#ecfdf5",
    },
    {
      title: "Attendance",
      description: "Take attendance",
      href: "/dashboard/faculty/attendance",
      icon: <ClipboardCheck size={18} color="#2563eb" />,
      bg: "#eff6ff",
    },
    {
      title: "Students",
      description: "View students",
      href: "/dashboard/faculty",
      icon: <Users size={18} color="#d97706" />,
      bg: "#fff7ed",
    },
    {
      title: "Timetable",
      description: "View today's schedule",
      href: "/dashboard/faculty/timetable",
      icon: <CalendarDays size={18} color="#7c3aed" />,
      bg: "#f5f3ff",
    },
  ]

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        border: "1px solid #eef2f7",
        padding: 24,
        marginBottom: 20,
        fontFamily: font,
      }}
    >
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 18,
        }}
      >
        Quick Actions
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,1fr)",
          gap: 16,
        }}
      >
        {actions.map((action) => (
          <div
            key={action.title}
            onClick={() => router.push(action.href)}
            style={{
              border: "1px solid #eef2f7",
              borderRadius: 16,
              padding: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              transition: ".2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)"
              e.currentTarget.style.boxShadow =
                "0 10px 20px rgba(0,0,0,.06)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: action.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {action.icon}
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#111827",
                  }}
                >
                  {action.title}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginTop: 4,
                  }}
                >
                  {action.description}
                </div>
              </div>
            </div>

            <ChevronRight size={18} color="#9ca3af" />
          </div>
        ))}
      </div>
    </div>
  )
}