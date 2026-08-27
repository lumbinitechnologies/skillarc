"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { useTimetable } from "../context/timetable-context"
import { supabase } from "@/lib/supabase"

const COLORS: Record<string, { bg: string; border: string; text: string; sub: string }> = {
  DAA:    { bg: "#dbeafe", border: "#bfdbfe", text: "#1e3a5f", sub: "#3b82f6" },
  DCN:    { bg: "#ede9fe", border: "#ddd6fe", text: "#3b0764", sub: "#7c3aed" },
  WT:     { bg: "#fef3c7", border: "#fde68a", text: "#78350f", sub: "#d97706" },
  TOC:    { bg: "#ffedd5", border: "#fed7aa", text: "#7c2d12", sub: "#ea580c" },
  "OE I": { bg: "#d1fae5", border: "#a7f3d0", text: "#064e3b", sub: "#10b981" },
  "P&T":  { bg: "#fce7f3", border: "#fbcfe8", text: "#831843", sub: "#ec4899" },
  TDPCL:  { bg: "#ccfbf1", border: "#99f6e4", text: "#134e4a", sub: "#14b8a6" },
}
const DEFAULT = { bg: "#dbeafe", border: "#bfdbfe", text: "#1e3a5f", sub: "#3b82f6" }

export default function TimetableCell({ day, period }: { day: string; period: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${day}-${period}` })
  const { slots, assignSubject, clearSlot } = useTimetable()
  const [hovered, setHovered] = useState(false)

  const assigned = slots.find((s: any) => s.day === day && s.period === period)
  const assignedSubject = assigned?.subject
  const c = COLORS[assignedSubject?.code ?? ""] ?? DEFAULT
  const isLab = assignedSubject?.subject_type === "LAB"

  async function handleClear() {
    await clearSlot(day, period)
  }

  const emptyStyle = isOver
    ? { backgroundColor: "#eef2ff", borderColor: "#818cf8", borderStyle: "dashed" as const, borderWidth: 2, transform: "scale(1.02)"}
    : { backgroundColor: "rgba(255,255,255,0.7)", borderColor: "#e5e7eb", borderStyle: "dashed" as const, borderWidth: 1.5 }

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        height: 80,
        borderRadius: 12,
        overflow: "hidden",
        transition: "all 0.15s ease",
        fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
        position: "relative",
        ...(assigned
          ? { backgroundColor: c.bg, borderColor: c.border, borderStyle: "solid", borderWidth: 1, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }
          : emptyStyle
        ),
      }}
    >
      {assigned ? (
        <>
          <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8px 10px" }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 12, color: c.text, lineHeight: 1.2 }}>
                {assignedSubject?.code}
              </p>
              <p style={{ fontSize: 10, color: c.sub, marginTop: 2, lineHeight: 1.3 }}>
                {assignedSubject?.faculty_name ?? ""}
              </p>
            </div>
            {isLab && (
              <span style={{
                display: "inline-block",
                alignSelf: "flex-start",
                padding: "1px 6px",
                borderRadius: 5,
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                backgroundColor: "#ffedd5",
                color: "#c2410c",
                border: "1px solid #fed7aa",
              }}>
                LAB
              </span>
            )}
          </div>

          {hovered && (
            <button
              onClick={handleClear}
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                width: 18,
                height: 18,
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                zIndex: 10,
              }}
            >
              ✕
            </button>
          )}
        </>
      ) : isOver ? (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap:4 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#c7d2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, color: "#6366f1", lineHeight: 1 }}>+</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 600, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Drop</span>
        </div>
      ) : null}
    </div>
  )
}