"use client"

import React, { useState } from "react"
import { CalendarDays, Clock3, MapPin, Grid, List, Calendar, Video, Printer, ExternalLink } from "lucide-react"
import AcademicEventsBanner from "@/modules/timetable/components/academic-events-banner"
import TimetablePrintModal from "@/modules/timetable/components/timetable-print-modal"
import { AcademicEvent, Slot } from "@/modules/timetable/types/timetable.types"

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const PERIOD_LABELS: Record<number, string> = {
  1: "8:45 – 9:45",
  2: "9:45 – 10:45",
  3: "11:00 – 12:00",
  4: "12:00 – 1:00",
  5: "2:00 – 3:00",
}

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
const DEFAULT_CARD = { bg: "#f8fafc", border: "#e2e8f0", text: "#0f172a", sub: "#64748b" }

interface TimetableSlot {
  id?: string
  day: string
  period: number
  subject_id: string
  faculty_id: string
  room?: string | null
  delivery_mode?: string | null
  meeting_link?: string | null
  notes?: string | null
  week_id?: string | null
}

interface SubjectInfo {
  name: string
  code: string
}

interface WeekInfo {
  id: string
  week_number: number
  title?: string | null
  start_date: string
  end_date: string
}

interface StudentTimetableClientProps {
  studentName?: string
  sectionName?: string
  programName?: string
  timetableRows: TimetableSlot[]
  subjectMap: Record<string, SubjectInfo>
  facultyMap: Record<string, string>
  periodTimings?: Array<{ id: string; label: string; time: string }>
  weeks?: WeekInfo[]
  academicEvents?: AcademicEvent[]
  multiWeekEnabled?: boolean
}

export default function StudentTimetableClient({
  studentName = "Student",
  sectionName = "Section A",
  programName = "Graduate Diploma of Management",
  timetableRows,
  subjectMap,
  facultyMap,
  periodTimings = [
    { id: "P1", label: "Period 1", time: "8:45 – 9:45" },
    { id: "P2", label: "Period 2", time: "9:45 – 10:45" },
    { id: "P3", label: "Period 3", time: "11:00 – 12:00" },
    { id: "P4", label: "Period 4", time: "12:00 – 1:00" },
    { id: "P5", label: "Period 5", time: "2:00 – 3:00" },
  ],
  weeks = [],
  academicEvents = [],
  multiWeekEnabled = false,
}: StudentTimetableClientProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  // Auto-select current week or week 1
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(() => {
    if (!multiWeekEnabled || weeks.length === 0) return null
    const today = new Date().toISOString().split("T")[0]
    const matched = weeks.find((w) => w.start_date <= today && today <= w.end_date)
    return matched ? matched.id : weeks[0]?.id ?? null
  })

  // Filter timetable rows for current week or static template
  const activeRows = multiWeekEnabled && weeks.length > 0
    ? timetableRows.filter((r) => r.week_id === selectedWeekId)
    : timetableRows.filter((r) => !r.week_id)

  const activeWeek = weeks.find((w) => w.id === selectedWeekId)

  const periodLabelsMap: Record<number, string> = {}
  if (periodTimings) {
    periodTimings.forEach((p) => {
      const num = Number(p.id.replace("P", ""))
      if (!isNaN(num)) {
        periodLabelsMap[num] = p.time
      }
    })
  }

  const finalPeriodLabels = Object.keys(periodLabelsMap).length > 0 ? periodLabelsMap : PERIOD_LABELS

  // List format grouped by day
  const timetableByDay = DAY_ORDER.map((day) => ({
    day,
    slots: activeRows
      .filter((slot) => slot.day === day)
      .map((slot) => {
        const subject = subjectMap[slot.subject_id]
        return {
          id: slot.id,
          period: slot.period,
          subject: subject?.code ?? "Class",
          subjectName: subject?.name ?? "Unit Name Pending",
          faculty: facultyMap[slot.faculty_id] ?? "Assigned Faculty",
          room: slot.room || null,
          deliveryMode: slot.delivery_mode || "ON_CAMPUS",
          meetingLink: slot.meeting_link || null,
          time: `Period ${slot.period} · ${finalPeriodLabels[slot.period] ?? "TBD"}`,
        }
      })
      .sort((a, b) => a.period - b.period),
  })).filter((dayEntry) => dayEntry.slots.length > 0)

  // Determine periods dynamically
  const maxPeriod = Math.max(5, ...activeRows.map((r) => r.period))
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1)

  // Generic Slot[] for print modal
  const genericSlots: Slot[] = activeRows.map((r) => {
    const subject = subjectMap[r.subject_id]
    return {
      id: r.id,
      day: r.day,
      period: `P${r.period}`,
      faculty_id: null,
      faculty_name: facultyMap[r.faculty_id] || "Faculty",
      room: r.room || null,
      delivery_mode: r.delivery_mode || "ON_CAMPUS",
      meeting_link: r.meeting_link || null,
      subject: {
        id: r.subject_id,
        code: subject?.code || "Unit",
        name: subject?.name || "Unit",
        semester: 1,
        institution_id: "",
        program_id: null,
      },
    }
  })

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
    <div className="max-w-6xl w-full mx-auto space-y-6 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-extrabold text-[#6C63FF] uppercase tracking-wider">
              Student Class Schedule
            </p>
            {multiWeekEnabled && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wide">
                Live Weekly
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
            Your Course Timetable
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {programName} · {sectionName} · Pulling live session dates, locations, and video class links.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          {/* Print / Export Button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Printer size={14} className="text-[#6C63FF]" /> Export & Print
          </button>

          {/* View Toggle button */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-white text-[#6C63FF] shadow-xs border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Grid size={13} /> Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-white text-[#6C63FF] shadow-xs border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List size={13} /> List
            </button>
          </div>
        </div>
      </div>

      {/* Academic Events / Holidays Banner */}
      <AcademicEventsBanner
        events={academicEvents}
        activeWeekStartDate={activeWeek?.start_date}
        activeWeekEndDate={activeWeek?.end_date}
      />

      {/* Week Selector Carousel if Multi-Week Enabled */}
      {multiWeekEnabled && weeks.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#6C63FF]" />
              <span className="text-xs font-bold text-slate-800">Academic Week:</span>
            </div>
            {activeWeek && (
              <span className="text-xs font-bold text-[#6C63FF] bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                {formatDate(activeWeek.start_date)} – {formatDate(activeWeek.end_date)}
              </span>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {weeks.map((w) => {
              const isSelected = selectedWeekId === w.id
              return (
                <button
                  key={w.id}
                  onClick={() => setSelectedWeekId(w.id)}
                  className={`shrink-0 px-4 py-2.5 rounded-2xl text-left transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white shadow-sm ring-2 ring-[#6C63FF]/30"
                      : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xs font-extrabold">{w.title || `Week ${w.week_number}`}</div>
                  <div className={`text-[10px] mt-0.5 ${isSelected ? "text-purple-100" : "text-slate-400"}`}>
                    {formatDate(w.start_date)} – {formatDate(w.end_date)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Content Rendering: Grid View or List View */}
      {activeRows.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-500 text-sm">
          {multiWeekEnabled && weeks.length > 0
            ? "No class sessions scheduled for this specific week."
            : "No timetable slots found for your section."}
        </div>
      ) : viewMode === "grid" ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 w-28">Day / Period</th>
                {periods.map((p) => (
                  <th key={p} className="pb-3 px-2 text-center min-w-[140px]">
                    <div className="text-slate-700 font-extrabold text-xs">Period {p}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {finalPeriodLabels[p] ?? `Period ${p}`}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {DAY_ORDER.map((day) => (
                <tr key={day} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 font-bold text-slate-800 text-xs align-top">
                    {day}
                  </td>
                  {periods.map((p) => {
                    const row = activeRows.find((r) => r.day === day && r.period === p)
                    const subject = row ? subjectMap[row.subject_id] : null
                    const faculty = row ? facultyMap[row.faculty_id] : null
                    const c = COLORS[subject?.code ?? ""] ?? DEFAULT_CARD

                    if (!row || !subject) {
                      return (
                        <td key={p} className="p-2 align-middle text-center text-slate-200">
                          <div className="h-18 rounded-xl border border-dashed border-slate-200/60 bg-slate-50/40 flex items-center justify-center">
                            <span className="text-[11px] text-slate-300">—</span>
                          </div>
                        </td>
                      )
                    }

                    const isOnline = row.delivery_mode === "ONLINE"
                    const isHybrid = row.delivery_mode === "HYBRID"

                    return (
                      <td key={p} className="p-1.5 align-top">
                        <div
                          style={{ backgroundColor: c.bg, borderColor: c.border }}
                          className="p-3 rounded-2xl border shadow-2xs flex flex-col justify-between min-h-[86px] transition hover:shadow-sm"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span style={{ color: c.text }} className="font-extrabold text-xs">
                                {subject.code}
                              </span>
                            </div>
                            <p style={{ color: c.sub }} className="text-[10px] font-semibold truncate mt-0.5">
                              {faculty || "Faculty"}
                            </p>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
                            {row.room && (
                              <span className="bg-white/90 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                                <MapPin size={8} /> {row.room}
                              </span>
                            )}
                            {isOnline && (
                              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <Video size={8} /> Online
                              </span>
                            )}
                            {row.meeting_link && (
                              <a
                                href={row.meeting_link}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-[#6C63FF] text-white px-1.5 py-0.5 rounded-md flex items-center gap-0.5 hover:opacity-90 transition"
                              >
                                Join <ExternalLink size={7} />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {timetableByDay.map(({ day, slots }) => (
            <div key={day} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-slate-800 text-sm">{day}</h3>
                <span className="text-xs font-semibold text-slate-400">
                  {slots.length} {slots.length === 1 ? "Class" : "Classes"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slots.map((slot) => (
                  <div
                    key={slot.id || `${slot.period}-${slot.subject}`}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-xs">{slot.subject}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                          Period {slot.period}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-1 truncate">
                        {slot.subjectName}
                      </p>
                    </div>

                    <div className="text-[10px] text-slate-500 space-y-1 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-1.5">
                        <Clock3 size={11} className="text-slate-400" />
                        <span>{slot.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={11} className="text-slate-400" />
                        <span>{slot.room}</span>
                        {slot.deliveryMode === "ONLINE" && (
                          <span className="bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded text-[9px] font-bold">
                            Online
                          </span>
                        )}
                      </div>
                      {slot.meetingLink && (
                        <a
                          href={slot.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#6C63FF] hover:underline"
                        >
                          <Video size={11} /> Join Online Class <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
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
        programName={programName}
        sectionName={sectionName}
        week={activeWeek}
        slots={genericSlots}
        periods={periodTimings}
      />
    </div>
  )
}
