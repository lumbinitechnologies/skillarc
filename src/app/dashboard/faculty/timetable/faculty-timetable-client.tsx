"use client"

import React, { useState } from "react"
import { CalendarDays, Clock3, MapPin, Calendar, Video, Printer, ExternalLink, Sparkles } from "lucide-react"
import AcademicEventsBanner from "@/modules/timetable/components/academic-events-banner"
import TimetablePrintModal from "@/modules/timetable/components/timetable-print-modal"
import { AcademicEvent, Slot } from "@/modules/timetable/types/timetable.types"

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
  subject_name?: string
  subject_code?: string
  section: string
  room: string
  delivery_mode?: string
  meeting_link?: string | null
  notes?: string | null
  time: string
  week_id?: string | null
}

interface FacultyTimetableClientProps {
  trainerName?: string
  slots: FacultySlotItem[]
  weeks?: WeekInfo[]
  academicEvents?: AcademicEvent[]
  periods?: Array<{ id: string; label: string; time: string }>
  multiWeekEnabled?: boolean
}

export default function FacultyTimetableClient({
  trainerName = "Trainer",
  slots,
  weeks = [],
  academicEvents = [],
  periods = [
    { id: "P1", label: "Period 1", time: "8:45 – 9:45" },
    { id: "P2", label: "Period 2", time: "9:45 – 10:45" },
    { id: "P3", label: "Period 3", time: "11:00 – 12:00" },
    { id: "P4", label: "Period 4", time: "12:00 – 1:00" },
    { id: "P5", label: "Period 5", time: "2:00 – 3:00" },
  ],
  multiWeekEnabled = false,
}: FacultyTimetableClientProps) {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

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

  // Convert activeSlots into generic Slot[] for the print modal
  const genericSlots: Slot[] = activeSlots.map((s) => ({
    id: s.id,
    day: s.day,
    period: `P${s.period}`,
    faculty_id: null,
    faculty_name: trainerName,
    room: s.room,
    delivery_mode: s.delivery_mode,
    meeting_link: s.meeting_link,
    subject: {
      id: s.id || "",
      code: s.subject_code || s.subject,
      name: s.subject_name || s.subject,
      semester: 1,
      institution_id: "",
      program_id: null,
      faculty_name: trainerName,
    },
  }))

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
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Top Header */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ margin: 0, color: "#6C63FF", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 11 }}>
              Trainer Class Schedule
            </p>
            {multiWeekEnabled && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", backgroundColor: "#ecfdf5", padding: "2px 8px", borderRadius: 99, border: "1px solid #a7f3d0", textTransform: "uppercase" }}>
                Multi-Week Active
              </span>
            )}
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
            Faculty Teaching Timetable
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", maxWidth: 640, fontSize: 13 }}>
            Scheduled classes, designated lecture rooms, and online video session links for your assigned units.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setIsPrintModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <Printer size={15} className="text-[#6C63FF]" /> Export & Print
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 999, background: "#f5f3ff", color: "#6d28d9", fontWeight: 700, fontSize: 12, border: "1px solid #ddd6fe" }}>
            <CalendarDays size={16} />
            {activeSlots.length} {activeSlots.length === 1 ? "Session" : "Sessions"}
          </div>
        </div>
      </div>

      {/* Academic Events & Public Holidays Banner */}
      <AcademicEventsBanner
        events={academicEvents}
        activeWeekStartDate={activeWeek?.start_date}
        activeWeekEndDate={activeWeek?.end_date}
      />

      {/* Week Selector Carousel if Multi-Week Enabled */}
      {multiWeekEnabled && weeks.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 20, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={16} color="#6C63FF" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Select Academic Week:</span>
            </div>
            {activeWeek && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6C63FF", backgroundColor: "#f5f3ff", padding: "3px 12px", borderRadius: 99, border: "1px solid #ddd6fe" }}>
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
                    padding: "10px 16px",
                    borderRadius: 14,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    border: isSelected ? "1.5px solid #6C63FF" : "1px solid #e2e8f0",
                    background: isSelected ? "linear-gradient(135deg, #6C63FF, #8B5CF6)" : "#ffffff",
                    color: isSelected ? "#fff" : "#0f172a",
                    boxShadow: isSelected ? "0 4px 12px rgba(108, 99, 255, 0.25)" : "none",
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
        <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 20, padding: 48, textAlign: "center", color: "#64748b", fontSize: 14 }}>
          {multiWeekEnabled && weeks.length > 0
            ? "No teaching sessions scheduled for this specific week."
            : "No classes are currently scheduled for your profile."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {timetableByDay.map(({ day, slots: daySlots }) => (
            <div
              key={day}
              style={{
                background: "#ffffff",
                border: "1px solid #f1f5f9",
                borderRadius: 20,
                padding: "20px 24px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, borderBottom: "1px solid #f8fafc", paddingBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                  {day}
                </h3>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", backgroundColor: "#f1f5f9", padding: "2px 10px", borderRadius: 99 }}>
                  {daySlots.length} {daySlots.length === 1 ? "Class" : "Classes"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {daySlots.map((slot) => {
                  const isOnline = slot.delivery_mode === "ONLINE"
                  const isHybrid = slot.delivery_mode === "HYBRID"

                  return (
                    <div
                      key={slot.id || `${slot.day}-${slot.period}`}
                      style={{
                        padding: 16,
                        borderRadius: 16,
                        border: "1px solid #e2e8f0",
                        background: "#fafafa",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 12,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                            {slot.subject}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#6C63FF", backgroundColor: "#ede9fe", padding: "2px 8px", borderRadius: 8 }}>
                            {slot.section}
                          </span>
                        </div>
                        {slot.subject_name && (
                          <p style={{ fontSize: 11, color: "#64748b", margin: "3px 0 0 0" }}>
                            {slot.subject_name}
                          </p>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "#475569", borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Clock3 size={13} className="text-slate-400" />
                          <span>{slot.time}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <MapPin size={13} className="text-slate-400" />
                          <span>{slot.room || (isOnline ? "Online Session" : "On Campus")}</span>
                          {isOnline && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#065f46", backgroundColor: "#d1fae5", padding: "1px 6px", borderRadius: 4 }}>
                              Online Session
                            </span>
                          )}
                          {isHybrid && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#5b21b6", backgroundColor: "#ede9fe", padding: "1px 6px", borderRadius: 4 }}>
                              Hybrid
                            </span>
                          )}
                        </div>

                        {slot.meeting_link && (
                          <a
                            href={slot.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              marginTop: 4,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              padding: "6px 12px",
                              borderRadius: 10,
                              fontSize: 11,
                              fontWeight: 700,
                              backgroundColor: "#6C63FF",
                              color: "#ffffff",
                              textDecoration: "none",
                            }}
                          >
                            <Video size={13} /> Launch Online Meeting <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Timetable Print Modal */}
      <TimetablePrintModal
        open={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        institutionName="SkillArc Institute of Management"
        programName={`Trainer Schedule: ${trainerName}`}
        sectionName="Faculty Teaching Schedule"
        week={activeWeek}
        slots={genericSlots}
        periods={periods}
      />
    </div>
  )
}
