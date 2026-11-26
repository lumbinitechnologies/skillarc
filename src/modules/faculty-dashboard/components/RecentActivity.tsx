"use client"

import { CheckCircle2, CalendarClock, BookOpen, UserCheck } from "lucide-react"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

interface Activity {
  id: string
  title: string
  description: string
  time: string
  type: "attendance" | "timetable" | "subject" | "profile"
}

interface RecentActivityProps {
  activities: Activity[]
}

const ICONS = {
  attendance: {
    icon: <CheckCircle2 size={18} color="#16a34a" />,
    bg: "#ecfdf5",
  },
  timetable: {
    icon: <CalendarClock size={18} color="#2563eb" />,
    bg: "#eff6ff",
  },
  subject: {
    icon: <BookOpen size={18} color="#d97706" />,
    bg: "#fff7ed",
  },
  profile: {
    icon: <UserCheck size={18} color="#7c3aed" />,
    bg: "#f5f3ff",
  },
}

export default function RecentActivity({
  activities,
}: RecentActivityProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eef2f7",
        borderRadius: 20,
        padding: 24,
        fontFamily: font,
      }}
    >
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 20,
        }}
      >
        Recent Activity
      </h3>

      {activities.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "36px 0",
            color: "#9ca3af",
            fontSize: 14,
          }}
        >
          No recent activity.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {activities.map((activity) => {
            const item = ICONS[activity.type]

            return (
              <div
                key={activity.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  paddingBottom: 16,
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: item.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {activity.title}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    {activity.description}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activity.time}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}