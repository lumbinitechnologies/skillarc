"use client"

import type { SectionWithFacultyAdvisor } from "@/modules/sections"
import { Trash2, Edit2, GraduationCap, BookOpen, Users, UserCheck, AlertTriangle } from "lucide-react"
import { useTerms, useIsSchool } from "@/lib/org-type-context"

interface SectionsListProps {
  sections: SectionWithFacultyAdvisor[]
  isLoading?: boolean
  onEdit?: (section: SectionWithFacultyAdvisor) => void
  onDelete?: (sectionId: string) => void
}

const semesterColors: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  2: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  3: { bg: "#fdf4ff", text: "#9333ea", border: "#e9d5ff" },
  4: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  5: { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
  6: { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  7: { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
  8: { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
}

const romanNumerals: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV",
  5: "V", 6: "VI", 7: "VII", 8: "VIII",
}

// Derive a consistent color from program name
function getProgramColor(name: string | undefined): { bg: string; text: string; border: string } {
  if (!name) return { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" }
  const n = name.toLowerCase()
  if (n.includes("cse") || n.includes("computer"))  return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" }
  if (n.includes("ai") || n.includes("artificial"))  return { bg: "#fdf4ff", text: "#9333ea", border: "#e9d5ff" }
  if (n.includes("ece") || n.includes("electronic")) return { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" }
  if (n.includes("mba") || n.includes("business"))   return { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" }
  if (n.includes("mech") || n.includes("mechanical")) return { bg: "#fefce8", text: "#a16207", border: "#fef08a" }
  if (n.includes("civil"))                            return { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" }
  if (n.includes("bba") || n.includes("commerce"))   return { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" }
  // fallback: hash the name to one of the palette entries
  const palette = [
    { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    { bg: "#fdf4ff", text: "#9333ea", border: "#e9d5ff" },
    { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
    { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
    { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
  ]
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

export function SectionsList({
  sections,
  isLoading = false,
  onEdit,
  onDelete,
}: SectionsListProps) {
  const t = useTerms()
  const isSchool = useIsSchool()

  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{
            backgroundColor: "#fff", borderRadius: 16,
            border: "1px solid #f3f4f6", padding: 20,
          }}>
            <div style={{ height: 4, backgroundColor: "#f3f4f6", borderRadius: 2, marginBottom: 18 }} />
            <div style={{ height: 20, backgroundColor: "#f3f4f6", borderRadius: 8, marginBottom: 12, width: "60%" }} />
            <div style={{ height: 14, backgroundColor: "#f3f4f6", borderRadius: 6, marginBottom: 8, width: "40%" }} />
            <div style={{ height: 14, backgroundColor: "#f3f4f6", borderRadius: 6, width: "80%" }} />
          </div>
        ))}
      </div>
    )
  }

  if (!sections || sections.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "64px 24px", border: "1.5px dashed #e5e7eb", borderRadius: 20,
        backgroundColor: "#fafafa", fontFamily: font,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, backgroundColor: "#eff6ff",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          <BookOpen size={24} color="#1d4ed8" />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>No {t.section_plural.toLowerCase()} yet</p>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Create a {t.section.toLowerCase()} to get started</p>
      </div>
    )
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
      gap: 16,
      fontFamily: font,
    }}>
      {sections.map((section) => {
        // For schools: semester is always defaulted to 1 so use program colour for the accent bar instead
        const semColor = isSchool ? getProgramColor(section.program?.name) : (semesterColors[section.semester] ?? semesterColors[8])
        const progColor = getProgramColor(section.program?.name)
        const hasAdvisor = !!section.faculty_advisor
        const enrolled = section.student_count ?? 0
        const capacity = (section as any).capacity ?? 60

        return (
          <div
            key={section.id}
            style={{
              backgroundColor: "#fff", borderRadius: 16,
              border: "1px solid #f3f4f6",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              overflow: "hidden", transition: "box-shadow 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"
              ;(e.currentTarget as HTMLDivElement).style.borderColor = "#e0e7ff"
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"
              ;(e.currentTarget as HTMLDivElement).style.borderColor = "#f3f4f6"
            }}
          >
            {/* Top accent bar */}
            <div style={{
              height: 4,
              background: `linear-gradient(90deg, ${semColor.text}, ${semColor.text}55)`,
            }} />

            <div style={{ padding: "18px 20px 0" }}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  backgroundColor: semColor.bg,
                  border: `1px solid ${semColor.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <GraduationCap size={19} color={semColor.text} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>
                    {t.section} {section.name}
                  </h3>
                  {/* Schools don't have semester — hide the badge entirely */}
                  {!isSchool && (
                    <span style={{
                      display: "inline-block",
                      fontSize: 10, fontWeight: 700,
                      color: semColor.text, backgroundColor: semColor.bg,
                      border: `1px solid ${semColor.border}`,
                      padding: "2px 9px", borderRadius: 20, letterSpacing: "0.05em",
                      marginTop: 2,
                    }}>
                      {t.semester} {romanNumerals[section.semester] ?? section.semester}
                    </span>
                  )}
                </div>
              </div>

              {/* Info rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>

                {/* Program */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  backgroundColor: progColor.bg,
                  border: `1px solid ${progColor.border}`,
                  borderRadius: 10, padding: "9px 12px",
                }}>
                  <BookOpen size={13} color={progColor.text} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: progColor.text, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" }}>Program</p>
                    <p style={{
                      fontSize: 13, fontWeight: 700, color: progColor.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {section.program?.name ?? "Not Assigned"}
                    </p>
                  </div>
                </div>

                {/* Faculty Advisor */}
                {hasAdvisor ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
                    borderRadius: 10, padding: "9px 12px",
                  }}>
                    <UserCheck size={13} color="#16a34a" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: "#16a34a", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Faculty Advisor</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>
                        {section.faculty_advisor!.name}
                      </p>
                      <p style={{ fontSize: 11, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {section.faculty_advisor!.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    backgroundColor: "#fffbeb", border: "1px solid #fde68a",
                    borderRadius: 10, padding: "9px 12px",
                  }}>
                    <AlertTriangle size={13} color="#d97706" style={{ flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, color: "#d97706", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Faculty Advisor</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#b45309" }}>Not Assigned</p>
                    </div>
                  </div>
                )}

                {/* Students / Capacity */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  backgroundColor: "#f8fafc", borderRadius: 10, padding: "9px 12px",
                }}>
                  <Users size={13} color="#6b7280" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>Enrollment</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                        {enrolled} <span style={{ fontWeight: 400, color: "#9ca3af" }}>/ {capacity} capacity</span>
                      </p>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: enrolled >= capacity ? "#ef4444" : enrolled >= capacity * 0.8 ? "#d97706" : "#16a34a",
                        backgroundColor: enrolled >= capacity ? "#fee2e2" : enrolled >= capacity * 0.8 ? "#fffbeb" : "#f0fdf4",
                        padding: "2px 7px", borderRadius: 20,
                      }}>
                        {enrolled >= capacity ? "Full" : enrolled >= capacity * 0.8 ? "Nearly Full" : "Open"}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginTop: 6, height: 4, backgroundColor: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 99,
                        width: `${Math.min((enrolled / capacity) * 100, 100)}%`,
                        backgroundColor: enrolled >= capacity ? "#ef4444" : enrolled >= capacity * 0.8 ? "#f59e0b" : "#22c55e",
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", borderTop: "1px solid #f3f4f6" }}>
              <button
                onClick={() => onEdit?.(section)}
                style={{
                  flex: 1, padding: "11px 0",
                  fontSize: 12, fontWeight: 600, color: "#374151",
                  backgroundColor: "transparent", border: "none",
                  borderRight: "1px solid #f3f4f6",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 6,
                  transition: "background 0.15s", fontFamily: font,
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Edit2 size={13} color="#6b7280" /> Edit
              </button>
              <button
                onClick={() => onDelete?.(section.id)}
                style={{
                  flex: 1, padding: "11px 0",
                  fontSize: 12, fontWeight: 600, color: "#ef4444",
                  backgroundColor: "transparent", border: "none",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 6,
                  transition: "background 0.15s", fontFamily: font,
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fff1f2")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}