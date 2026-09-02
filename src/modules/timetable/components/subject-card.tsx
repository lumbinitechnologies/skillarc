"use client"

import { useDraggable } from "@dnd-kit/core"

// All colors as inline style values — never purged by Tailwind
const COLORS: Record<string, { bg: string; border: string; badgeBg: string; badgeText: string }> = {
  DAA:       { bg: "#dbeafe", border: "#bfdbfe", badgeBg: "#bfdbfe", badgeText: "#1d4ed8" },
  DCN:       { bg: "#ede9fe", border: "#ddd6fe", badgeBg: "#ddd6fe", badgeText: "#6d28d9" },
  WT:        { bg: "#fef3c7", border: "#fde68a", badgeBg: "#fde68a", badgeText: "#b45309" },
  TOC:       { bg: "#ffedd5", border: "#fed7aa", badgeBg: "#fed7aa", badgeText: "#c2410c" },
  "OE I":    { bg: "#d1fae5", border: "#a7f3d0", badgeBg: "#a7f3d0", badgeText: "#065f46" },
  "P&T":     { bg: "#fce7f3", border: "#fbcfe8", badgeBg: "#fbcfe8", badgeText: "#9d174d" },
  TDPCL:     { bg: "#ccfbf1", border: "#99f6e4", badgeBg: "#99f6e4", badgeText: "#0f766e" },
  BSBHRM613: { bg: "#ede9fe", border: "#c4b5fd", badgeBg: "#ddd6fe", badgeText: "#3730a3" },
  BSBLDR811: { bg: "#e0e7ff", border: "#c7d2fe", badgeBg: "#c7d2fe", badgeText: "#1e1b4b" },
  TAELED803: { bg: "#ccfbf1", border: "#99f6e4", badgeBg: "#99f6e4", badgeText: "#115e59" },
  BSBHRM611: { bg: "#fef3c7", border: "#fde68a", badgeBg: "#fde68a", badgeText: "#78350f" },
  BSBINS603: { bg: "#dbeafe", border: "#bfdbfe", badgeBg: "#bfdbfe", badgeText: "#1e3a5f" },
  BSBLDR601: { bg: "#ffedd5", border: "#fed7aa", badgeBg: "#fed7aa", badgeText: "#7c2d12" },
  BSBLDR812: { bg: "#fce7f3", border: "#fbcfe8", badgeBg: "#fbcfe8", badgeText: "#831843" },
  BSBSTR801: { bg: "#d1fae5", border: "#a7f3d0", badgeBg: "#a7f3d0", badgeText: "#064e3b" },
}
const DEFAULT = { bg: "#f8fafc", border: "#cbd5e1", badgeBg: "#e2e8f0", badgeText: "#334155" }
const LAB_STYLE = { bg: "#ffedd5", border: "#fed7aa", badgeBg: "#ffedd5", badgeText: "#c2410c" }

export default function SubjectCard({ subject }: { subject: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `subject-draggable-${subject.id}`,
    data: { subject },
  })

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 }
    : {}

  const c = COLORS[subject.code] ?? DEFAULT
  const isLab = subject.subject_type === "LAB" || subject.type === "LAB"
  const badgeC = isLab ? LAB_STYLE : c

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        ...dragStyle,
        backgroundColor: c.bg,
        borderColor: c.border,
        borderWidth: 1.5,
        borderStyle: "solid",
        borderRadius: 14,
        padding: "12px",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? "0 20px 40px rgba(0,0,0,0.15)" : "0 1px 3px rgba(0,0,0,0.04)",
        transition: isDragging ? "none" : "box-shadow 0.15s, transform 0.15s",
        userSelect: "none",
        touchAction: "none",
        position: "relative",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      {/* Drag handle dots */}
      <div style={{ position: "absolute", top: 10, right: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, opacity: 0.35 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#475569" }} />
        ))}
      </div>

      {/* Code */}
      <p style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", marginBottom: 2, paddingRight: 20 }}>
        {subject.code}
      </p>

      {/* Name */}
      <p style={{ fontSize: 11, color: "#475569", marginBottom: 6, paddingRight: 20, lineHeight: 1.3, fontWeight: 500 }}>
        {subject.name}
      </p>

      {/* Faculty */}
      {subject.faculty_name && (
        <p style={{ fontSize: 10.5, color: "#6C63FF", marginBottom: 6, fontWeight: 600 }}>
          👨‍🏫 {subject.faculty_name}
        </p>
      )}

      {/* Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          display: "inline-block",
          padding: "2px 7px",
          borderRadius: 6,
          fontSize: 9.5,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          backgroundColor: badgeC.badgeBg,
          color: badgeC.badgeText,
          border: `1px solid ${badgeC.border}`,
        }}>
          {isLab ? "LAB" : "THEORY"}
        </span>
        {subject.credits && (
          <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{subject.credits} Credits</span>
        )}
      </div>
    </div>
  )
}