"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTimetable } from "../context/timetable-context"
import SubjectCard from "./subject-card"
import { supabase } from "@/lib/supabase"
import { BookOpen, Search } from "lucide-react"

const font = "'Plus Jakarta Sans', 'Inter', sans-serif"

export default function SubjectPanel() {
  const { subjects, loading } = useTimetable()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")
  const [sectionName, setSectionName] = useState<string | null>(null)
  const [programName, setProgramName] = useState<string | null>(null)

  const semester = searchParams.get("semester")
  const sectionId = searchParams.get("section")
  const programId = searchParams.get("program")

  useEffect(() => {
    let active = true

    async function loadMeta() {
      if (sectionId) {
        const { data } = await supabase
          .from("sections")
          .select("name, program:program_id(name)")
          .eq("id", sectionId)
          .maybeSingle()

        if (active && data) {
          setSectionName(data.name ?? null)
          if ((data as any).program?.name) {
            setProgramName((data as any).program.name)
          }
        }
      } else if (programId) {
        const { data } = await supabase
          .from("programs")
          .select("name")
          .eq("id", programId)
          .maybeSingle()

        if (active && data) {
          setProgramName(data.name ?? null)
        }
      }
    }

    loadMeta()

    return () => {
      active = false
    }
  }, [sectionId, programId])

  const filtered = subjects.filter(
    (s) =>
      s.code.toLowerCase().includes(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase())
  )

  const subtitle = [
    programName,
    semester ? `Sem ${semester}` : null,
    sectionName ? `Sec ${sectionName}` : null,
  ].filter(Boolean).join(" · ") || (semester ? `Semester ${semester}` : "Select a section")

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 20,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: font,
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BookOpen size={14} className="text-[#6C63FF]" />
              <p style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", margin: 0 }}>Units of Study</p>
            </div>
            <p style={{ fontSize: 11, color: "#64748b", marginTop: 3, fontWeight: 500 }} className="truncate max-w-[210px]">
              {subtitle}
            </p>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#6C63FF",
              backgroundColor: "#ede9fe",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {filtered.length} {filtered.length === 1 ? "Unit" : "Units"}
          </span>
        </div>

        <div style={{ position: "relative" }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder="Search qualification units…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              paddingLeft: 30,
              paddingRight: 10,
              paddingTop: 7,
              paddingBottom: 7,
              fontSize: 11,
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#1e293b",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 72,
                  borderRadius: 12,
                  backgroundColor: "#f1f5f9",
                  animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px", color: "#64748b", fontSize: 12 }}>
            <p style={{ fontWeight: 700, margin: 0, color: "#334155" }}>No units found</p>
            <p style={{ fontSize: 11, marginTop: 4, color: "#94a3b8" }}>
              {query ? "Try another search term" : "No subjects configured for this program & semester"}
            </p>
          </div>
        ) : (
          filtered.map((subject) => <SubjectCard key={subject.id} subject={subject} />)
        )}
      </div>
    </div>
  )
}