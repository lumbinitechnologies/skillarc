"use client"

import React, { useState } from "react"
import { CalendarDays, Clock3, MapPin, Calendar } from "lucide-react"

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface WeekInfo {
  id: string
  week_number: number
  title?: string | null
  start_date: string
  end_date: string
}

interface FacultySlotItem {
  id?: string
  day: string
  period: number
  subject: string
  section: string
  room: string
  time: string
  week_id?: string | null
}

interface FacultyTimetableClientProps {
  slots: FacultySlotItem[]
  weeks?: WeekInfo[]
  multiWeekEnabled?: boolean
}

export default function FacultyTimetableClient({
  slots,
  weeks = [],
  multiWeekEnabled = false,
}: FacultyTimetableClientProps) {
  // Auto-select current calendar week or first week
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(() => {
    if (!multiWeekEnabled || weeks.length === 0) return null
    const today = new Date().toISOString().split("T")[0]
    const matched = weeks.find((w) => w.start_date <= today && today <= w.end_date)
    return matched ? matched.id : weeks[0]?.id ?? null
  })

  const activeSlots = multiWeekEnabled && weeks.length > 0
    ? slots.filter((s) => s.week_id === selectedWeekId)
    : slots.filter((s) => !s.week_id) // Type 1 static timetable

  const activeWeek = weeks.find((w) => w.id === selectedWeekId)

  const timetableByDay = DAY_ORDER.map((day) => ({
    day,
    slots: activeSlots
      .filter((slot) => slot.day === day)
      .sort((a, b) => a.period - b.period),
  })).filter((dayEntry) => dayEntry.slots.length > 0)

  function formatDate(d: string) {
    if (!d) return ""
    try {
      const parts = d.split("-")
      if (parts.length === 3) {
        const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      }
      return d
    } catch {
      return d
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ margin: 0, color: "#4f46e5", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12 }}>
              Weekly schedule
            </p>
            {multiWeekEnabled && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", backgroundColor: "#ecfdf5", padding: "2px 8px", borderRadius: 99, border: "1px solid #a7f3d0", textTransform: "uppercase" }}>
                Multi-Week Active
              </span>
            )}
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: "#111827" }}>
            Your Timetable
          </h1>
          <p style={{ margin: "6px 0 0", color: "#6b7280", maxWidth: 640, fontSize: 14 }}>
            Review the classes assigned to you for the week and the sections they belong to.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 999, background: "#ecfeff", color: "#0f766e", fontWeight: 600, fontSize: 13 }}>
          <CalendarDays size={18} />
          {activeSlots.length} sessions
        </div>
      </div>

      {/* Week Selector Carousel if Multi-Week Enabled */}
      {multiWeekEnabled && weeks.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={16} color="#4f46e5" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Select Academic Week:</span>
            </div>
            {activeWeek && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "#4f46e5", backgroundColor: "#eef2ff", padding: "3px 12px", borderRadius: 99 }}>
                {formatDate(activeWeek.start_date)} – {formatDate(activeWeek.end_date)}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {weeks.map((w) => {
              const isSelected = selectedWeekId === w.id
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWeekId(w.id)}
                  style={{
                    flexShrink: 0,
                    padding: "8px 14px",
                    borderRadius: 12,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    border: isSelected ? "1.5px solid #4f46e5" : "1px solid #e2e8f0",
                    background: isSelected ? "#4f46e5" : "#f8fafc",
                    color: isSelected ? "#fff" : "#1e293b",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{w.title || `Week ${w.week_number}`}</div>
                  <div style={{ fontSize: 10, marginTop: 2, color: isSelected ? "#e0e7ff" : "#64748b" }}>
                    {formatDate(w.start_date)} – {formatDate(w.end_date)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Grid or Day List */}
      {activeSlots.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #ece7ff", borderRadius: 18, padding: 36, textAlign: "center", color: "#6b7280", fontSize: 14 }}>
          {multiWeekEnabled && weeks.length > 0
            ? "No classes assigned to you for this specific week."
            : "No timetable entries have been assigned to you yet."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {timetableByDay.map((dayEntry) => (
            <div key={dayEntry.day} style={{ background: "#fff", border: "1px solid #ece7ff", borderRadius: 20, padding: 18, boxShadow: "0 10px 25px rgba(79,70,229,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>{dayEntry.day}</h2>
                <span style={{ color: "#6b7280", fontWeight: 600, fontSize: 13 }}>{dayEntry.slots.length} classes</span>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {dayEntry.slots.map((slot, idx) => (
                  <div key={`${dayEntry.day}-${slot.period}-${idx}`} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", border: "1px solid #f3f4f6", borderRadius: 14, padding: "12px 14px", background: "#fafafa" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ede9fe", color: "#5b21b6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Clock3 size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>{slot.subject}</div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>{slot.time}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#4b5563", fontSize: 13, fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <MapPin size={15} />
                        <span>{slot.room}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <CalendarDays size={15} />
                        <span>{slot.section}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
