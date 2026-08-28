"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { TimetableProvider, useTimetable } from "@/modules/timetable/context/timetable-context"
import SubjectPanel from "@/modules/timetable/components/subject-panel"
import TimetableGrid from "@/modules/timetable/components/timetable-grid"
import FacultyPanel from "@/modules/timetable/components/faculty-panel"
import WeekManagerBar from "@/modules/timetable/components/week-manager-bar"
import { timetableService } from "@/modules/timetable/services/timetableService"
import { Subject } from "@/modules/timetable/types/timetable.types"
import { supabase } from "@/lib/supabase"

const font = "'Plus Jakarta Sans', 'Inter', sans-serif"

const DRAG_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  DAA: { bg: "#dbeafe", border: "#bfdbfe", text: "#1d4ed8" },
  DCN: { bg: "#ede9fe", border: "#ddd6fe", text: "#6d28d9" },
  WT: { bg: "#fef3c7", border: "#fde68a", text: "#b45309" },
  TOC: { bg: "#ffedd5", border: "#fed7aa", text: "#c2410c" },
  "OE I": { bg: "#d1fae5", border: "#a7f3d0", text: "#065f46" },
  "P&T": { bg: "#fce7f3", border: "#fbcfe8", text: "#9d174d" },
  TDPCL: { bg: "#ccfbf1", border: "#99f6e4", text: "#0f766e" },
}
const DEFAULT_DRAG = { bg: "#dbeafe", border: "#bfdbfe", text: "#1d4ed8" }

function DragPreview({ subject }: { subject: Subject }) {
  const c = DRAG_COLORS[subject.code] ?? DEFAULT_DRAG

  return (
    <div
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: "10px 12px",
        width: 176,
        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        transform: "rotate(2deg)",
        fontFamily: font,
      }}
    >
      <p style={{ fontWeight: 700, fontSize: 12, color: c.text }}>{subject.code}</p>
      <p style={{ fontSize: 10, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {subject.name}
      </p>
      {subject.faculty_name && (
        <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{subject.faculty_name}</p>
      )}
    </div>
  )
}

interface PendingDrop {
  subject: Subject
  day: string
  period: string
  institutionId: string
}

interface FacultyOption {
  id: string
  name: string
  email: string
}

function AssignFacultyDialog({
  pending,
  onSave,
  onCancel,
}: {
  pending: PendingDrop
  onSave: (facultyId: string | null, facultyName: string | null) => void
  onCancel: () => void
}) {
  const [facultyOptions, setFacultyOptions] = useState<FacultyOption[]>([])
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let isActive = true

    async function fetchFaculty() {
      try {
        const { data, error } = await supabase
          .from("faculty_subjects")
          .select("faculty:faculty_id(id, name, email)")
          .eq("subject_id", pending.subject.id)

        if (error) throw error

        const options = (data ?? [])
          .map((row: any) => row.faculty)
          .filter(Boolean) as FacultyOption[]

        if (!isActive) return

        setFacultyOptions(options)
        if (options.length > 0) setSelectedFacultyId(options[0].id)
      } catch (err) {
        console.error("Failed to load faculty for subject:", err)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    setLoading(true)
    setSelectedFacultyId("")
    fetchFaculty()

    return () => {
      isActive = false
    }
  }, [pending.subject.id])

  async function handleSave() {
    setSaving(true)
    const chosen = facultyOptions.find((f) => f.id === selectedFacultyId)
    onSave(chosen?.id ?? null, chosen?.name ?? null)
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          width: 360,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          fontFamily: font,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>
            Assign Faculty
          </p>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
            {pending.subject.code} · {pending.day} {pending.period}
          </p>
        </div>

        <div style={{ padding: "16px 24px 20px" }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "16px 0" }}>
              Loading faculty…
            </p>
          ) : facultyOptions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <p style={{ fontSize: 13, color: "#6b7280" }}>No faculty assigned to this subject.</p>
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                Assign faculty via the Faculty Subjects page first.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                Faculty
              </p>
              {facultyOptions.map((f) => (
                <label
                  key={f.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: `1.5px solid ${selectedFacultyId === f.id ? "#6366f1" : "#e5e7eb"}`,
                    backgroundColor: selectedFacultyId === f.id ? "#eef2ff" : "#fafafa",
                    transition: "all 0.12s",
                  }}
                >
                  <input
                    type="radio"
                    name="faculty"
                    value={f.id}
                    checked={selectedFacultyId === f.id}
                    onChange={() => setSelectedFacultyId(f.id)}
                    style={{ accentColor: "#6366f1" }}
                  />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{f.name}</p>
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>{f.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: font,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (facultyOptions.length > 0 && !selectedFacultyId)}
            style={{
              flex: 2,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: 10,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              fontFamily: font,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Builder() {
  const { assignSubject, multiWeekEnabled, selectedWeek } = useTimetable()
  const searchParams = useSearchParams()

  const semester = searchParams.get("semester")
  const sectionId = searchParams.get("section")

  const [activeSubject, setActiveSubject] = useState<Subject | null>(null)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function handleSaveWithFaculty(facultyId: string | null, facultyName: string | null) {
    if (!pendingDrop) return

    const { subject, day, period, institutionId } = pendingDrop
    assignSubject(day, period, subject, facultyId, facultyName)
    setPendingDrop(null)

    try {
      const semesterValue = Number(semester)
      if (!sectionId || Number.isNaN(semesterValue)) return

      await timetableService.saveSlot({
        institutionId,
        sectionId,
        semester: semesterValue,
        day,
        period: Number(period.replace("P", "")),
        subjectId: subject.id,
        facultyId,
        weekId: multiWeekEnabled && selectedWeek ? selectedWeek.id : null,
      })
    } catch (err) {
      console.error("Failed to save slot:", err)
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveSubject(e.active.data.current as Subject)}
        onDragEnd={async (e) => {
          setActiveSubject(null)
          if (!e.over) return

          const subject = e.active.data.current as Subject
          const [day, period] = (e.over.id as string).split("-")

          if (!subject?.id) {
            console.error("Missing subject.id", subject)
            return
          }

          const institutionId = await timetableService.getCurrentInstitutionId()
          setPendingDrop({ subject, day, period, institutionId })
        }}
        onDragCancel={() => setActiveSubject(null)}
      >
        {/* Render Week Manager Bar when Multi-Week feature is enabled */}
        {multiWeekEnabled && <WeekManagerBar />}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "272px 1fr 272px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <SubjectPanel />
          <TimetableGrid />
          <FacultyPanel />
        </div>

        <DragOverlay dropAnimation={{ duration: 160, easing: "ease" }}>
          {activeSubject && <DragPreview subject={activeSubject} />}
        </DragOverlay>
      </DndContext>

      {pendingDrop && (
        <AssignFacultyDialog
          pending={pendingDrop}
          onSave={handleSaveWithFaculty}
          onCancel={() => setPendingDrop(null)}
        />
      )}
    </>
  )
}

export default function TimetableBuilderPage() {
  const searchParams = useSearchParams()

  const programId = searchParams.get("program")
  const semester = searchParams.get("semester")
  const sectionId = searchParams.get("section")

  const [programName, setProgramName] = useState<string | null>(null)
  const [sectionName, setSectionName] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadNames() {
      if (programId) {
        const { data } = await supabase
          .from("programs")
          .select("name")
          .eq("id", programId)
          .single()

        if (active) setProgramName(data?.name ?? null)
      }

      if (sectionId) {
        const { data } = await supabase
          .from("sections")
          .select("name")
          .eq("id", sectionId)
          .single()

        if (active) setSectionName(data?.name ?? null)
      }
    }

    loadNames()

    return () => {
      active = false
    }
  }, [programId, sectionId])

  return (
    <TimetableProvider semester={semester} sectionId={sectionId}>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f4f5f7",
          padding: 24,
          fontFamily: font,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
            Timetable Builder
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
            Program: {programName ?? programId?.slice(0, 8)}
            {" • "}
            Semester: {semester}
            {" • "}
            Section: {sectionName ?? sectionId?.slice(0, 8)}
          </p>
        </div>

        <Builder />
      </div>
    </TimetableProvider>
  )
}