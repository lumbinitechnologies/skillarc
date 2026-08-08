"use client"

import React, { useState } from "react"
import { CalendarDays, Clock3, MapPin, Grid, List } from "lucide-react"

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const PERIOD_LABELS: Record<number, string> = {
  1: "8:45 – 9:45",
  2: "9:45 – 10:45",
  3: "11:00 – 12:00",
  4: "12:00 – 1:00",
  5: "2:00 – 3:00",
}

interface TimetableSlot {
  day: string
  period: number
  subject_id: string
  faculty_id: string
}

interface SubjectInfo {
  name: string
  code: string
}

interface StudentTimetableClientProps {
  timetableRows: TimetableSlot[]
  subjectMap: Record<string, SubjectInfo>
  facultyMap: Record<string, string>
  periodTimings?: Array<{ id: string; label: string; time: string }>
}

export default function StudentTimetableClient({
  timetableRows,
  subjectMap,
  facultyMap,
  periodTimings,
}: StudentTimetableClientProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

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

  // Prepare list format grouped by day
  const timetableByDay = DAY_ORDER.map((day) => ({
    day,
    slots: timetableRows
      .filter((slot) => slot.day === day)
      .map((slot) => {
        const subject = subjectMap[slot.subject_id]
        return {
          period: slot.period,
          subject: subject?.code ?? "Class",
          subjectName: subject?.name ?? "Subject pending",
          faculty: facultyMap[slot.faculty_id] ?? "Faculty advisor pending",
          time: `Period ${slot.period} · ${finalPeriodLabels[slot.period] ?? "TBD"}`,
        }
      })
      .sort((a, b) => a.period - b.period),
  })).filter((dayEntry) => dayEntry.slots.length > 0)

  // Determine periods dynamically (default min 5)
  const maxPeriod = Math.max(5, ...timetableRows.map((r) => r.period))
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1)

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6 text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Weekly schedule</p>
          <h1 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">Your Timetable</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Pulling live class slot schedules assigned to your section.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          {/* View Toggle button */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Grid size={13} />
              Grid View
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List size={13} />
              List View
            </button>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-50 border border-cyan-150 text-cyan-750 text-xs font-bold shadow-sm">
            <CalendarDays size={15} />
            {timetableRows.length} classes
          </div>
        </div>
      </div>

      {timetableRows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 text-xs font-bold">
          No class schedules have been assigned to your section yet.
        </div>
      ) : viewMode === "grid" ? (
        /* Grid Format View */
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
          <div className="min-w-[850px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-150 bg-slate-50/50">
                  <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-[120px]">Day</th>
                  {periods.map((p) => (
                    <th key={p} className="p-4 text-center text-xs font-bold text-slate-500 border-l border-slate-100">
                      <span className="block font-extrabold text-slate-800">Period {p}</span>
                      <span className="block text-[9px] text-slate-400 font-sans font-semibold mt-1">
                        {finalPeriodLabels[p] || "TBD"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DAY_ORDER.map((day) => {
                  const daySlotsCount = timetableRows.filter((r) => r.day === day).length
                  return (
                    <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 align-middle">
                        <span className="text-xs font-bold text-slate-800">{day}</span>
                        {daySlotsCount > 0 && (
                          <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">
                            {daySlotsCount} class{daySlotsCount === 1 ? "" : "es"}
                          </span>
                        )}
                      </td>
                      {periods.map((p) => {
                        const slot = timetableRows.find(
                          (r) => r.day === day && r.period === p
                        )
                        if (!slot) {
                          return (
                            <td key={p} className="p-4 text-center text-slate-300 font-sans text-xs border-l border-slate-100 align-middle">
                              —
                            </td>
                          )
                        }
                        const subject = subjectMap[slot.subject_id]
                        const facultyName = facultyMap[slot.faculty_id] ?? "Faculty pending"
                        return (
                          <td key={p} className="p-4 border-l border-slate-100 align-middle bg-indigo-50/15">
                            <div className="space-y-1 text-center">
                              <div className="text-[11px] font-black text-indigo-700">
                                {subject?.code ?? "Class"}
                              </div>
                              <div className="text-[10px] font-bold text-slate-800 leading-tight">
                                {subject?.name ?? "Subject pending"}
                              </div>
                              <div className="text-[9px] font-semibold text-slate-400">
                                {facultyName}
                              </div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* List Format View */
        <div className="grid gap-6 md:grid-cols-2">
          {timetableByDay.map((dayEntry) => (
            <div key={dayEntry.day} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-sm">{dayEntry.day}</h3>
                <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-0.5 rounded-full">
                  {dayEntry.slots.length} Classes
                </span>
              </div>
              <div className="grid gap-3">
                {dayEntry.slots.map((slot) => (
                  <div key={`${dayEntry.day}-${slot.period}`} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-slate-100 rounded-2xl p-4 bg-slate-50/50 hover:border-indigo-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Clock3 size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-800">{slot.subject} · {slot.subjectName}</div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{slot.time}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <MapPin size={14} className="text-slate-450" />
                      <span>{slot.faculty}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
