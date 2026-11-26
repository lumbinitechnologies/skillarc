"use client"

import { CalendarDays, Clock, MapPin } from "lucide-react"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

interface ScheduleItem {
  id: string
  subject: string
  section: string
  room: string
  time: string
}

interface TodayScheduleProps {
  schedule: ScheduleItem[]
}

export default function TodaySchedule({
  schedule,
}: TodayScheduleProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eef2f7",
        borderRadius: 20,
        padding: 24,
        fontFamily: font,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <CalendarDays size={20} color="#059669" />

        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
        >
          Today&apos;s Schedule
        </h3>
      </div>

      {schedule.length === 0 ? (
        <div
          style={{
            border: "2px dashed #e5e7eb",
            borderRadius: 16,
            padding: 36,
            textAlign: "center",
          }}
        >
          <CalendarDays
            size={34}
            color="#9ca3af"
            style={{ marginBottom: 12 }}
          />

          <h4
            style={{
              margin: 0,
              fontSize: 17,
              color: "#111827",
            }}
          >
            No Classes Today
          </h4>

          <p
            style={{
              marginTop: 10,
              color: "#6b7280",
              fontSize: 14,
            }}
          >
            Enjoy your free day 🎉
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {schedule.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 18px",
                borderRadius: 16,
                border: "1px solid #eef2f7",
                transition: ".2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f9fafb"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff"
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#111827",
                  }}
                >
                  {item.subject}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    gap: 18,
                    color: "#6b7280",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Clock size={14} />
                    {item.time}
                  </span>

                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <MapPin size={14} />
                    {item.room}
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: "#ecfdf5",
                  color: "#065f46",
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {item.section}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}