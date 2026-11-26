"use client"

import { useTimetable } from "../context/timetable-context"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

function getStatus(used: number, total: number): "available" | "busy" | "full" {
  const r = used / total
  if (r >= 1) return "full"
  if (r >= 0.6) return "busy"
  return "available"
}

const STATUS = {
  available: { dot: "#34d399", bg: "#d1fae5", text: "#065f46", label: "AVAILABLE" },
  busy:      { dot: "#fbbf24", bg: "#fef3c7", text: "#92400e", label: "BUSY" },
  full:      { dot: "#f87171", bg: "#fee2e2", text: "#991b1b", label: "FULL" },
}

function barColor(used: number, total: number) {
  const r = used / total
  if (r >= 1) return "#f87171"
  if (r >= 0.7) return "#fbbf24"
  return "#34d399"
}

export default function FacultyPanel() {
  const { faculty, slots, loading } = useTimetable()

  // Count assigned slots per faculty directly from the slot's own faculty_id
  const usageMap: Record<string, number> = {}
  slots.forEach((slot) => {
    if (slot.faculty_id) {
      usageMap[slot.faculty_id] = (usageMap[slot.faculty_id] ?? 0) + 1
    }
  })

  return (
    <div style={{
      backgroundColor: "#ffffff", borderRadius: 16,
      border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: font, height: "100%",
    }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>Faculty</p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Workload overview</p>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 600, color: "#6b7280",
            backgroundColor: "#f3f4f6", padding: "2px 8px", borderRadius: 999,
          }}>
            {faculty.length} members
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 24 }}>Loading…</p>
        ) : faculty.map((f) => {
          const used  = usageMap[f.id] ?? 0
          const total = f.total ?? 5
          const status = getStatus(used, total)
          const sc  = STATUS[status]
          const bc  = barColor(used, total)
          const pct = Math.min(Math.round((used / total) * 100), 100)
          const initials = f.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

          return (
            <div key={f.id} style={{
              borderRadius: 12, border: "1px solid #f3f4f6",
              backgroundColor: "#fafafa", padding: 12,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "linear-gradient(135deg, #e0e7ff, #bfdbfe)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#4338ca" }}>{initials}</span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 12, color: "#111827" }}>{f.name}</p>
                    <p style={{ fontSize: 10, color: "#9ca3af" }}>{f.role}</p>
                  </div>
                </div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 6px", borderRadius: 6,
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  backgroundColor: sc.bg, color: sc.text,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: sc.dot, display: "inline-block" }} />
                  {sc.label}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>Workload</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#374151" }}>{used} / {total} hrs</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, backgroundColor: "#e5e7eb", overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", borderRadius: 999, backgroundColor: bc, width: `${pct}%`, transition: "width 0.5s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 10, color: "#6b7280" }}>
                  Remaining: <strong>{Math.max(total - used, 0)} hrs</strong>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}