"use client"

import { Fragment } from "react"
import TimetableCell from "./timetable-cell"
import AcademicEventsBanner from "./academic-events-banner"
import { useTimetable } from "../context/timetable-context"
import { Calendar, ShieldAlert } from "lucide-react"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const font = "'Plus Jakarta Sans', 'Inter', sans-serif"

const headerCell: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  border: "1px solid #f3f4f6",
  borderRadius: 10,
  padding: "6px 10px",
  textAlign: "center",
}

const dayLabelCell: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  border: "1px solid #f3f4f6",
  borderRadius: 10,
  padding: "0 12px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  minHeight: 88,
}

export default function TimetableGrid() {
  const { periods, academicEvents = [], selectedWeek, clashes = [] } = useTimetable()

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 20,
        border: "1px solid #f1f5f9",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        padding: 22,
        minWidth: 0,
        fontFamily: font,
      }}
    >
      {/* Top Banner for Academic Events / Holidays */}
      <AcademicEventsBanner
        events={academicEvents}
        activeWeekStartDate={selectedWeek?.start_date}
        activeWeekEndDate={selectedWeek?.end_date}
      />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", letterSpacing: "-0.01em" }}>
            Timetable Schedule Grid
          </p>
          <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            Drag subjects from the sidebar to assign class slots · Real-time conflict checking active
          </p>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `116px repeat(${periods.length || 5}, minmax(0, 1fr))`,
            gap: 6,
          }}
        >
          {/* Header row */}
          <div style={{ ...headerCell, textAlign: "left" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Day
            </p>
            <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>/ Period Time</p>
          </div>
          {periods.map((p) => (
            <div key={p.id} style={headerCell}>
              <p style={{ fontSize: 10.5, fontWeight: 800, color: "#1e293b" }}>{p.label}</p>
              <p style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{p.time}</p>
            </div>
          ))}

          {/* Day rows */}
          {DAYS.map((day) => (
            <Fragment key={day}>
              <div style={dayLabelCell}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{day}</span>
              </div>
              {periods.map((p) => (
                <TimetableCell key={`${day}-${p.id}`} day={day} period={p.id} />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}