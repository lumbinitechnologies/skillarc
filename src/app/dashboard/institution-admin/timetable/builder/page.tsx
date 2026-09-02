"use client"

import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { TimetableProvider, useTimetable } from "@/modules/timetable/context/timetable-context"
import SubjectPanel from "@/modules/timetable/components/subject-panel"
import TimetableGrid from "@/modules/timetable/components/timetable-grid"
import FacultyPanel from "@/modules/timetable/components/faculty-panel"
import WeekManagerBar from "@/modules/timetable/components/week-manager-bar"
import ClashInspectorModal from "@/modules/timetable/components/clash-inspector-modal"
import TimetablePrintModal from "@/modules/timetable/components/timetable-print-modal"
import { timetableService } from "@/modules/timetable/services/timetableService"
import { clashDetectionService } from "@/modules/timetable/services/clashDetectionService"
import { Subject } from "@/modules/timetable/types/timetable.types"
import { supabase } from "@/lib/supabase"
import { AlertTriangle, ShieldCheck, Printer, Video, MapPin, Layers, RefreshCw } from "lucide-react"

const font = "'Plus Jakarta Sans', 'Inter', sans-serif"

const DRAG_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  DAA:       { bg: "#dbeafe", border: "#bfdbfe", text: "#1d4ed8" },
  DCN:       { bg: "#ede9fe", border: "#ddd6fe", text: "#6d28d9" },
  WT:        { bg: "#fef3c7", border: "#fde68a", text: "#b45309" },
  TOC:       { bg: "#ffedd5", border: "#fed7aa", text: "#c2410c" },
  "OE I":    { bg: "#d1fae5", border: "#a7f3d0", text: "#065f46" },
  "P&T":     { bg: "#fce7f3", border: "#fbcfe8", text: "#9d174d" },
  TDPCL:     { bg: "#ccfbf1", border: "#99f6e4", text: "#0f766e" },
  BSBHRM613: { bg: "#ede9fe", border: "#c4b5fd", text: "#3730a3" },
  BSBLDR811: { bg: "#e0e7ff", border: "#c7d2fe", text: "#1e1b4b" },
  TAELED803: { bg: "#ccfbf1", border: "#99f6e4", text: "#115e59" },
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
  sectionId: string
  weekId?: string | null
}

interface FacultyOption {
  id: string
  name: string
  email: string
}

function AssignSlotDetailsDialog({
  pending,
  onSave,
  onCancel,
}: {
  pending: PendingDrop
  onSave: (
    facultyId: string | null,
    facultyName: string | null,
    room: string | null,
    deliveryMode: string,
    meetingLink: string | null,
    notes: string | null
  ) => void
  onCancel: () => void
}) {
  const [facultyOptions, setFacultyOptions] = useState<FacultyOption[]>([])
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("")
  const [room, setRoom] = useState<string>("")
  const [existingRooms, setExistingRooms] = useState<string[]>([])
  const [deliveryMode, setDeliveryMode] = useState<"ON_CAMPUS" | "ONLINE" | "HYBRID">("ON_CAMPUS")
  const [meetingLink, setMeetingLink] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([])

  useEffect(() => {
    let isActive = true

    async function fetchData() {
      try {
        const [facultyRes, roomRes] = await Promise.all([
          supabase
            .from("faculty_subjects")
            .select("faculty:faculty_id(id, name, email)")
            .eq("subject_id", pending.subject.id),
          supabase
            .from("timetable_slots")
            .select("room")
            .eq("institution_id", pending.institutionId)
            .not("room", "is", null),
        ])

        if (!isActive) return

        const options = (facultyRes.data ?? [])
          .map((row: any) => row.faculty)
          .filter(Boolean) as FacultyOption[]

        setFacultyOptions(options)
        if (options.length > 0) {
          setSelectedFacultyId(options[0].id)
        } else {
          setSelectedFacultyId("")
        }

        const distinctRooms = Array.from(
          new Set(
            (roomRes.data ?? [])
              .map((r: any) => r.room?.trim())
              .filter(Boolean)
          )
        )
        setExistingRooms(distinctRooms)
      } catch (err) {
        console.error("Failed to load options for subject:", err)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    setLoading(true)
    setSelectedFacultyId("")
    setRoom("")
    fetchData()

    return () => {
      isActive = false
    }
  }, [pending.subject.id, pending.institutionId])

  // Live conflict pre-check
  useEffect(() => {
    let active = true
    async function checkConflict() {
      const activeRoom = room.trim() || null
      const periodNum = parseInt(pending.period.replace("P", ""), 10)

      const result = await clashDetectionService.checkCandidateSlotClash({
        institutionId: pending.institutionId,
        sectionId: pending.sectionId,
        day: pending.day,
        period: isNaN(periodNum) ? 1 : periodNum,
        facultyId: selectedFacultyId || null,
        room: activeRoom,
        deliveryMode,
        weekId: pending.weekId,
      })

      if (active) {
        setConflictWarnings(result.warnings)
      }
    }

    checkConflict()
    return () => {
      active = false
    }
  }, [pending, selectedFacultyId, room, deliveryMode])

  async function handleSave() {
    setSaving(true)
    const chosen = facultyOptions.find((f) => f.id === selectedFacultyId)
    const finalRoom = deliveryMode === "ONLINE" ? null : room.trim() || null

    onSave(
      chosen?.id ?? null,
      chosen?.name ?? null,
      finalRoom,
      deliveryMode,
      meetingLink.trim() || null,
      notes.trim() || null
    )
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 24,
          width: "100%",
          maxWidth: 460,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          fontFamily: font,
          overflow: "hidden",
          border: "1px solid #f1f5f9",
        }}
      >
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(to right, #f8fafc, #ffffff)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
              Configure Class Session
            </p>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, backgroundColor: "#ede9fe", color: "#6d28d9" }}>
              {pending.day} · {pending.period}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            <strong style={{ color: "#0f172a" }}>{pending.subject.code}</strong> — {pending.subject.name}
          </p>
        </div>

        <div style={{ padding: "20px 24px", maxHeight: "65vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Conflict Warning Box */}
          {conflictWarnings.length > 0 && (
            <div style={{ backgroundColor: "#fef2f2", border: "1.5px solid #f87171", borderRadius: 14, padding: "12px 14px", animation: "pulse 2s infinite" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#b91c1c", fontWeight: 800, fontSize: 12 }}>
                <AlertTriangle size={16} /> Schedule Conflict Warning
              </div>
              <ul style={{ margin: "6px 0 0 0", paddingLeft: 16, fontSize: 11, color: "#991b1b", lineHeight: 1.45, fontWeight: 600 }}>
                {conflictWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
              <p style={{ fontSize: 10, color: "#b91c1c", marginTop: 6, fontStyle: "italic" }}>
                You can still confirm this session, or change the trainer/room to resolve the conflict.
              </p>
            </div>
          )}

          {/* 1. Trainer Selection */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Assigned Trainer
              </label>
              {selectedFacultyId && (
                <button
                  type="button"
                  onClick={() => setSelectedFacultyId("")}
                  style={{ fontSize: 11, color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  Clear Trainer
                </button>
              )}
            </div>

            {loading ? (
              <p style={{ fontSize: 12, color: "#94a3b8" }}>Loading trainers…</p>
            ) : facultyOptions.length === 0 ? (
              <div style={{ padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12, color: "#64748b" }}>
                No faculty mapped to {pending.subject.code}. Session will be saved as unassigned (TBD).
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: `1.5px solid ${selectedFacultyId === "" ? "#6366f1" : "#e2e8f0"}`,
                    backgroundColor: selectedFacultyId === "" ? "#eef2ff" : "#ffffff",
                  }}
                >
                  <input
                    type="radio"
                    name="faculty"
                    value=""
                    checked={selectedFacultyId === ""}
                    onChange={() => setSelectedFacultyId("")}
                    style={{ accentColor: "#6366f1" }}
                  />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Unassigned (TBD)</p>
                  </div>
                </label>

                {facultyOptions.map((f) => (
                  <label
                    key={f.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: `1.5px solid ${selectedFacultyId === f.id ? "#6366f1" : "#e2e8f0"}`,
                      backgroundColor: selectedFacultyId === f.id ? "#eef2ff" : "#ffffff",
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
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{f.name}</p>
                      <p style={{ fontSize: 10, color: "#64748b" }}>{f.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 2. Delivery Mode */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
              Delivery Mode
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {(["ON_CAMPUS", "ONLINE", "HYBRID"] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setDeliveryMode(mode)}
                  style={{
                    padding: "8px 4px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    border: `1.5px solid ${deliveryMode === mode ? "#6366f1" : "#e2e8f0"}`,
                    backgroundColor: deliveryMode === mode ? "#eef2ff" : "#ffffff",
                    color: deliveryMode === mode ? "#4338ca" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  {mode === "ON_CAMPUS" ? "🏫 On Campus" : mode === "ONLINE" ? "🌐 Online" : "🔄 Hybrid"}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Room Allocation */}
          {deliveryMode !== "ONLINE" && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                Room / Facility Location (Optional)
              </label>
              <input
                type="text"
                list="institution-room-list"
                placeholder="Enter room number or lab name (e.g. Lab 2, Building A)"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 12,
                  color: "#0f172a",
                  outline: "none",
                  backgroundColor: "#fff",
                  boxSizing: "border-box",
                }}
              />
              <datalist id="institution-room-list">
                {existingRooms.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          )}

          {/* 4. Online Meeting URL (if Online or Hybrid) */}
          {deliveryMode !== "ON_CAMPUS" && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                Online Meeting URL (Zoom / Teams / Meet)
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/xyz or Zoom URL"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 12,
                }}
              />
            </div>
          )}
        </div>

        <div style={{ padding: "14px 24px 20px", display: "flex", gap: 10, borderTop: "1px solid #f1f5f9", backgroundColor: "#f8fafc" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 600,
              color: "#475569",
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 800,
              color: "#fff",
              background: conflictWarnings.length > 0
                ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                : "linear-gradient(135deg, #6C63FF, #8B5CF6)",
              border: "none",
              borderRadius: 12,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              boxShadow: conflictWarnings.length > 0
                ? "0 2px 8px rgba(239, 68, 68, 0.35)"
                : "0 2px 8px rgba(108, 99, 255, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {saving ? (
              "Saving…"
            ) : conflictWarnings.length > 0 ? (
              <>
                <AlertTriangle size={15} /> Confirm with Conflict
              </>
            ) : (
              "Confirm Session"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function Builder() {
  const { assignSubject, multiWeekEnabled, selectedWeek, clashes, scanClashes, isScanningClashes, slots, periods } = useTimetable()
  const searchParams = useSearchParams()
  const semester = searchParams.get("semester")
  const sectionId = searchParams.get("section")
  const programId = searchParams.get("program")

  const [activeSubject, setActiveSubject] = useState<Subject | null>(null)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const [institutionId, setInstitutionId] = useState<string>("")
  const [isClashModalOpen, setIsClashModalOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [sectionName, setSectionName] = useState<string>("Section A")
  const [programName, setProgramName] = useState<string>("Graduate Diploma of Management")

  useEffect(() => {
    timetableService.getCurrentInstitutionId().then(setInstitutionId).catch(() => {})

    // Load section and program names for printing
    if (sectionId) {
      supabase
        .from("sections")
        .select("name, program:program_id(name)")
        .eq("id", sectionId)
        .single()
        .then(({ data }) => {
          if (data) {
            setSectionName(data.name || "Section A")
            if ((data as any).program?.name) {
              setProgramName((data as any).program.name)
            }
          }
        })
    }
  }, [sectionId])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    })
  )

  function getSubjectFromActive(active: any): Subject | null {
    if (!active?.data?.current) return null
    return active.data.current.subject || active.data.current
  }

  function handleDragStart(event: any) {
    const subject = getSubjectFromActive(event.active)
    if (subject) setActiveSubject(subject)
  }

  function handleDragEnd(event: any) {
    const { over, active } = event
    setActiveSubject(null)

    if (!over) return

    const subject = getSubjectFromActive(active)
    if (!subject) return

    const [day, period] = (over.id as string).split("-")
    if (!day || !period) return

    setPendingDrop({
      subject,
      day,
      period,
      institutionId,
      sectionId: sectionId || "",
      weekId: selectedWeek ? selectedWeek.id : null,
    })
  }

  function handleSaveSlot(
    facultyId: string | null,
    facultyName: string | null,
    room: string | null,
    deliveryMode: string,
    meetingLink: string | null,
    notes: string | null
  ) {
    if (!pendingDrop) return
    assignSubject(
      pendingDrop.day,
      pendingDrop.period,
      pendingDrop.subject,
      facultyId,
      facultyName,
      room,
      deliveryMode,
      meetingLink,
      notes
    )
    setPendingDrop(null)
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: 24, fontFamily: font }}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Multi-week bar if enabled */}
        {multiWeekEnabled && (
          <div style={{ marginBottom: 16 }}>
            <WeekManagerBar />
          </div>
        )}

        {/* Top Control Toolbar */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setIsClashModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                border: clashes.length > 0 ? "1px solid #fecaca" : "1px solid #bbf7d0",
                backgroundColor: clashes.length > 0 ? "#fef2f2" : "#f0fdf4",
                color: clashes.length > 0 ? "#b91c1c" : "#15803d",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              {clashes.length > 0 ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
              <span>
                {clashes.length === 0 ? "0 Clashes Detected" : `${clashes.length} ${clashes.length === 1 ? "Clash" : "Clashes"} Detected`}
              </span>
            </button>

            <button
              onClick={() => scanClashes()}
              disabled={isScanningClashes}
              title="Re-scan for schedule clashes"
              style={{
                padding: "8px",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} className={isScanningClashes ? "animate-spin" : ""} />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 12,
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
          </div>
        </div>

        {/* 3-column layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr 220px",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* Left panel: Subjects */}
          <SubjectPanel />

          {/* Center: Grid */}
          <TimetableGrid />

          {/* Right panel: Faculty workload */}
          <FacultyPanel />
        </div>

        {/* Drag preview */}
        <DragOverlay dropAnimation={null}>
          {activeSubject ? <DragPreview subject={activeSubject} /> : null}
        </DragOverlay>

        {/* Assign Slot Details modal */}
        {pendingDrop && (
          <AssignSlotDetailsDialog
            pending={pendingDrop}
            onSave={handleSaveSlot}
            onCancel={() => setPendingDrop(null)}
          />
        )}

        {/* Clash Inspector Modal */}
        <ClashInspectorModal
          open={isClashModalOpen}
          onClose={() => setIsClashModalOpen(false)}
          clashes={clashes}
          isScanning={isScanningClashes}
          onRefresh={scanClashes}
        />

        {/* Timetable Print Modal */}
        <TimetablePrintModal
          open={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          institutionName="SkillArc Academic Institute"
          programName={programName}
          sectionName={sectionName}
          semester={semester || 1}
          week={selectedWeek}
          slots={slots}
          periods={periods}
        />
      </DndContext>
    </div>
  )
}

export default function TimetableBuilderPage() {
  const searchParams = useSearchParams()
  const semester = searchParams.get("semester")
  const sectionId = searchParams.get("section")
  const programId = searchParams.get("program")

  return (
    <TimetableProvider semester={semester} sectionId={sectionId} programId={programId}>
      <Builder />
    </TimetableProvider>
  )
}