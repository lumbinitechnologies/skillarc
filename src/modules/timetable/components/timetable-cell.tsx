"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { useTimetable } from "../context/timetable-context"
import { Video, MapPin, AlertTriangle, ExternalLink } from "lucide-react"

const COLORS: Record<string, { bg: string; border: string; text: string; sub: string }> = {
  DAA:       { bg: "#dbeafe", border: "#bfdbfe", text: "#1e3a5f", sub: "#3b82f6" },
  DCN:       { bg: "#ede9fe", border: "#ddd6fe", text: "#3b0764", sub: "#7c3aed" },
  WT:        { bg: "#fef3c7", border: "#fde68a", text: "#78350f", sub: "#d97706" },
  TOC:       { bg: "#ffedd5", border: "#fed7aa", text: "#7c2d12", sub: "#ea580c" },
  "OE I":    { bg: "#d1fae5", border: "#a7f3d0", text: "#064e3b", sub: "#10b981" },
  "P&T":     { bg: "#fce7f3", border: "#fbcfe8", text: "#831843", sub: "#ec4899" },
  TDPCL:     { bg: "#ccfbf1", border: "#99f6e4", text: "#134e4a", sub: "#14b8a6" },
  BSBHRM613: { bg: "#ede9fe", border: "#c4b5fd", text: "#3730a3", sub: "#6366f1" },
  BSBLDR811: { bg: "#e0e7ff", border: "#c7d2fe", text: "#1e1b4b", sub: "#4f46e5" },
  TAELED803: { bg: "#ccfbf1", border: "#99f6e4", text: "#115e59", sub: "#0d9488" },
  BSBHRM611: { bg: "#fef3c7", border: "#fde68a", text: "#78350f", sub: "#d97706" },
  BSBINS603: { bg: "#dbeafe", border: "#bfdbfe", text: "#1e3a5f", sub: "#2563eb" },
  BSBLDR601: { bg: "#ffedd5", border: "#fed7aa", text: "#7c2d12", sub: "#ea580c" },
  BSBLDR812: { bg: "#fce7f3", border: "#fbcfe8", text: "#831843", sub: "#db2777" },
  BSBSTR801: { bg: "#d1fae5", border: "#a7f3d0", text: "#064e3b", sub: "#059669" },
}

const DEFAULT = { bg: "#f8fafc", border: "#e2e8f0", text: "#0f172a", sub: "#64748b" }

export default function TimetableCell({ day, period }: { day: string; period: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${day}-${period}` })
  const { slots, clearSlot, clashes = [] } = useTimetable()
  const [hovered, setHovered] = useState(false)

  const assigned = slots.find((s: any) => s.day === day && s.period === period)
  const assignedSubject = assigned?.subject
  const c = COLORS[assignedSubject?.code ?? ""] ?? DEFAULT
  const isLab = assignedSubject?.subject_type === "LAB"

  // Check if this slot is involved in any detected clash
  const periodNum = Number(period.replace("P", ""))
  const hasClash = clashes.some((clash) => {
    if (clash.day !== day) return false
    const clashPeriod = typeof clash.period === "number" ? clash.period : Number(String(clash.period).replace("P", ""))
    if (clashPeriod !== periodNum) return false

    const matchesId = Boolean(assigned?.id && clash.conflictingSlots.some((cs) => cs.id === assigned.id))
    const matchesTrainer = Boolean(assigned?.faculty_id && clash.faculty_id && assigned.faculty_id === clash.faculty_id)
    const matchesRoom = Boolean(
      assigned?.room &&
      clash.room &&
      assigned.delivery_mode !== "ONLINE" &&
      assigned.room.trim().toLowerCase() === clash.room.trim().toLowerCase()
    )
    const matchesCode = Boolean(
      assignedSubject?.code &&
      clash.conflictingSlots.some((cs) => cs.subject_code === assignedSubject.code)
    )

    return matchesId || matchesTrainer || matchesRoom || matchesCode
  })

  async function handleClear() {
    await clearSlot(day, period)
  }

  const isOnline = assigned?.delivery_mode === "ONLINE"
  const isHybrid = assigned?.delivery_mode === "HYBRID"

  const emptyStyle = isOver
    ? {
        backgroundColor: "#eef2ff",
        borderColor: "#818cf8",
        borderStyle: "dashed" as const,
        borderWidth: 2,
        transform: "scale(1.02)",
      }
    : {
        backgroundColor: "rgba(255,255,255,0.7)",
        borderColor: "#e5e7eb",
        borderStyle: "dashed" as const,
        borderWidth: 1.5,
      }

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        minHeight: 88,
        borderRadius: 14,
        overflow: "hidden",
        transition: "all 0.15s ease",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        position: "relative",
        ...(assigned
          ? {
              backgroundColor: c.bg,
              borderColor: hasClash ? "#ef4444" : c.border,
              borderStyle: "solid",
              borderWidth: hasClash ? 2 : 1,
              boxShadow: hasClash
                ? "0 0 0 2px rgba(239, 68, 68, 0.2), 0 2px 4px rgba(0,0,0,0.06)"
                : "0 1px 3px rgba(0,0,0,0.06)",
            }
          : emptyStyle),
      }}
    >
      {assigned ? (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8px 10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
              <p style={{ fontWeight: 800, fontSize: 11, color: c.text, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                {assignedSubject?.code}
              </p>
              {hasClash && (
                <span
                  title="Clash Detected!"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    padding: "1px 4px",
                    borderRadius: 4,
                    fontSize: 8,
                    fontWeight: 800,
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                  }}
                >
                  <AlertTriangle size={9} /> CLASH
                </span>
              )}
            </div>

            <p style={{ fontSize: 10, color: c.sub, marginTop: 2, fontWeight: 500, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {assignedSubject?.faculty_name ?? assigned?.faculty_name ?? ""}
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 4 }}>
            {assigned.room && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  padding: "1px 5px",
                  borderRadius: 4,
                  fontSize: 8.5,
                  fontWeight: 700,
                  backgroundColor: "rgba(255,255,255,0.8)",
                  color: "#334155",
                  border: "1px solid rgba(203, 213, 225, 0.8)",
                }}
              >
                <MapPin size={8} /> {assigned.room}
              </span>
            )}

            {isOnline && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  padding: "1px 5px",
                  borderRadius: 4,
                  fontSize: 8.5,
                  fontWeight: 700,
                  backgroundColor: "#d1fae5",
                  color: "#065f46",
                  border: "1px solid #a7f3d0",
                }}
              >
                <Video size={8} /> Online
              </span>
            )}

            {isHybrid && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  padding: "1px 5px",
                  borderRadius: 4,
                  fontSize: 8.5,
                  fontWeight: 700,
                  backgroundColor: "#ede9fe",
                  color: "#5b21b6",
                  border: "1px solid #ddd6fe",
                }}
              >
                Hybrid
              </span>
            )}

            {isLab && (
              <span
                style={{
                  display: "inline-block",
                  padding: "1px 4px",
                  borderRadius: 4,
                  fontSize: 8,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  backgroundColor: "#ffedd5",
                  color: "#c2410c",
                }}
              >
                LAB
              </span>
            )}
          </div>

          {hovered && (
            <button
              onClick={handleClear}
              title="Remove Slot"
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 18,
                height: 18,
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 10,
                fontWeight: "bold",
                boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)",
                zIndex: 10,
              }}
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isOver && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1" }}>
              Drop Subject
            </span>
          )}
        </div>
      )}
    </div>
  )
}