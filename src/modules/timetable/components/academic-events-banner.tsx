"use client"

import React from "react"
import { Calendar, AlertCircle, Info, Sparkles } from "lucide-react"
import { AcademicEvent } from "../types/timetable.types"

interface Props {
  events: AcademicEvent[]
  activeWeekStartDate?: string
  activeWeekEndDate?: string
}

export default function AcademicEventsBanner({
  events,
  activeWeekStartDate,
  activeWeekEndDate,
}: Props) {
  if (!events || events.length === 0) return null

  // Filter events active within the current week if dates are provided
  const activeEvents = events.filter((e) => {
    if (!activeWeekStartDate || !activeWeekEndDate) return true
    return e.start_date <= activeWeekEndDate && e.end_date >= activeWeekStartDate
  })

  if (activeEvents.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {activeEvents.map((event) => {
        const isHoliday = event.event_type === "PUBLIC_HOLIDAY"
        const isBreak = event.event_type === "TERM_BREAK"

        const bgClass = isHoliday
          ? "bg-gradient-to-r from-rose-50 via-white to-rose-50/40 border-rose-200/80 text-rose-900"
          : isBreak
          ? "bg-gradient-to-r from-amber-50 via-white to-amber-50/40 border-amber-200/80 text-amber-900"
          : "bg-gradient-to-r from-sky-50 via-white to-sky-50/40 border-sky-200/80 text-sky-900"

        const badgeClass = isHoliday
          ? "bg-rose-100 text-rose-700 border-rose-200"
          : isBreak
          ? "bg-amber-100 text-amber-700 border-amber-200"
          : "bg-sky-100 text-sky-700 border-sky-200"

        const emoji = isHoliday ? "🇦🇺" : isBreak ? "🏖️" : "📅"

        return (
          <div
            key={event.id}
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl border shadow-xs transition ${bgClass}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl shrink-0">{emoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold font-['Plus_Jakarta_Sans']">
                    {event.title}
                  </h4>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                    {event.event_type.replace(/_/g, " ")}
                  </span>
                </div>
                {event.description && (
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {event.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 self-start sm:self-center">
              <Calendar size={14} className="text-slate-400" />
              <span>
                {event.start_date === event.end_date
                  ? event.start_date
                  : `${event.start_date} → ${event.end_date}`}
              </span>
              {event.affects_classes && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  No Classes
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
