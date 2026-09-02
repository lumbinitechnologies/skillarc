"use client"

import React, { useRef } from "react"
import { Printer, Download, FileSpreadsheet, Calendar as CalendarIcon, X, CheckCircle, ExternalLink } from "lucide-react"
import { Slot, TimetableWeek, Subject } from "../types/timetable.types"

interface Props {
  open: boolean
  onClose: () => void
  institutionName?: string
  programName?: string
  sectionName?: string
  semester?: number | string
  week?: {
    id: string
    title?: string | null
    week_number?: number
    start_date: string
    end_date: string
  } | null
  slots: Slot[]
  periods: Array<{ id: string; label: string; time: string }>
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function TimetablePrintModal({
  open,
  onClose,
  institutionName = "SkillArc Institute of Management",
  programName = "Graduate Diploma of Management (Learning) - BSB80120",
  sectionName = "Section A",
  semester = 1,
  week,
  slots,
  periods,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!open) return null

  // Trigger browser print
  const handlePrint = () => {
    window.print()
  }

  // Generate and download CSV
  const handleExportCSV = () => {
    const headers = [
      "Day",
      "Period",
      "Time",
      "Subject Code",
      "Subject Name",
      "Trainer",
      "Room",
      "Delivery Mode",
      "Meeting Link",
    ]

    const rows: string[][] = []

    DAYS.forEach((day) => {
      periods.forEach((p) => {
        const slot = slots.find((s) => s.day === day && s.period === p.id)
        if (slot && slot.subject) {
          rows.push([
            day,
            p.label,
            p.time,
            `"${slot.subject.code || ""}"`,
            `"${slot.subject.name || ""}"`,
            `"${slot.faculty_name || slot.subject.faculty_name || "Unassigned"}"`,
            `"${slot.room || "TBA"}"`,
            `"${slot.delivery_mode || "ON_CAMPUS"}"`,
            `"${slot.meeting_link || ""}"`,
          ])
        }
      })
    })

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `Timetable_${sectionName.replace(/\s+/g, "_")}_${week ? week.title?.replace(/\s+/g, "_") : "Master"}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Generate and download .ICS (iCalendar) file
  const handleExportICS = () => {
    const dayMap: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    }

    let icsEvents = ""
    const nowStr = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

    // Base date for calculation (current Monday)
    const today = new Date()
    const currentDayOfWeek = today.getDay()
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek
    const baseMonday = new Date(today)
    baseMonday.setDate(today.getDate() + distanceToMonday)

    slots.forEach((slot) => {
      if (!slot.subject) return
      const dayOffset = (dayMap[slot.day] ?? 1) - 1
      const eventDate = new Date(baseMonday)
      eventDate.setDate(baseMonday.getDate() + dayOffset)

      const periodObj = periods.find((p) => p.id === slot.period)
      const timeStr = periodObj?.time || "09:00 - 10:00"
      const [startTimePart, endTimePart] = timeStr.split("–").map((s) => s.trim())

      // Parse hours
      const parseTime = (tPart?: string) => {
        if (!tPart) return { h: 9, m: 0 }
        const [h, m] = tPart.split(":").map(Number)
        return { h: isNaN(h) ? 9 : h, m: isNaN(m) ? 0 : m }
      }

      const st = parseTime(startTimePart)
      const et = parseTime(endTimePart)

      const dtStart = new Date(eventDate)
      dtStart.setHours(st.h, st.m, 0, 0)
      const dtEnd = new Date(eventDate)
      dtEnd.setHours(et.h, et.m, 0, 0)

      const formatICSDate = (d: Date) =>
        d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

      const summary = `${slot.subject.code}: ${slot.subject.name}`
      const location = slot.room ? `Room ${slot.room}` : slot.delivery_mode === "ONLINE" ? "Online Session" : "Campus"
      const description = `Trainer: ${slot.faculty_name || "Assigned Faculty"}\\nDelivery Mode: ${slot.delivery_mode || "On Campus"}${slot.meeting_link ? `\\nLink: ${slot.meeting_link}` : ""}`

      icsEvents += `
BEGIN:VEVENT
UID:${slot.id || `slot-${Math.random()}`}@skillarc.edu
DTSTAMP:${nowStr}
DTSTART:${formatICSDate(dtStart)}
DTEND:${formatICSDate(dtEnd)}
SUMMARY:${summary}
LOCATION:${location}
DESCRIPTION:${description}
STATUS:CONFIRMED
END:VEVENT`
    })

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SkillArc//Timetable Export//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Timetable - ${sectionName}
${icsEvents}
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute(
      "download",
      `Timetable_${sectionName.replace(/\s+/g, "_")}.ics`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden font-sans">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Timetable Export & Print Center
            </h2>
            <p className="text-xs text-slate-500">
              Generate official A4 printable PDF documents, Excel/CSV schedules, or iCalendar feeds
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-xs"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" /> Export CSV
            </button>
            <button
              onClick={handleExportICS}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-xs"
            >
              <CalendarIcon size={15} className="text-[#6C63FF]" /> Export .ICS
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] px-4 py-2 text-xs font-bold text-white hover:opacity-95 transition shadow-sm"
            >
              <Printer size={15} /> Print Timetable
            </button>
            <button
              onClick={onClose}
              className="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable View Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60">
          <div
            ref={printRef}
            className="mx-auto max-w-4xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200 print:m-0 print:p-0 print:border-none print:shadow-none"
          >
            {/* College Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6C63FF] to-[#8B5CF6] text-white font-extrabold text-sm shadow-sm">
                    S
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
                      {institutionName}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                      Official Academic Class Timetable
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs space-y-0.5">
                <p className="font-bold text-slate-800">{programName}</p>
                <p className="text-slate-500">
                  Class: <span className="font-semibold text-slate-700">{sectionName}</span> · Semester {semester}
                </p>
                {week && (
                  <p className="text-[#6C63FF] font-semibold text-[11px]">
                    {week.title || `Week ${week.week_number}`} ({week.start_date} → {week.end_date})
                  </p>
                )}
              </div>
            </div>

            {/* Timetable Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-800 p-2.5 font-bold uppercase tracking-wider text-[11px] w-28">
                      Day / Period
                    </th>
                    {periods.map((p) => (
                      <th
                        key={p.id}
                        className="border border-slate-800 p-2.5 text-center font-bold text-[11px]"
                      >
                        <div>{p.label}</div>
                        <div className="text-[9px] font-normal text-slate-300 mt-0.5">
                          {p.time}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, idx) => (
                    <tr
                      key={day}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                    >
                      <td className="border border-slate-200 p-3 font-bold text-slate-800 bg-slate-100/70">
                        {day}
                      </td>
                      {periods.map((p) => {
                        const slot = slots.find(
                          (s) => s.day === day && s.period === p.id
                        )
                        const assignedSubject = slot?.subject

                        if (!assignedSubject) {
                          return (
                            <td
                              key={p.id}
                              className="border border-slate-200 p-2 text-center text-slate-300 text-[10px]"
                            >
                              —
                            </td>
                          )
                        }

                        const isOnline = slot.delivery_mode === "ONLINE"
                        const isHybrid = slot.delivery_mode === "HYBRID"

                        return (
                          <td
                            key={p.id}
                            className="border border-slate-200 p-2.5 align-top bg-purple-50/20"
                          >
                            <div className="font-bold text-slate-900 text-[11px]">
                              {assignedSubject.code}
                            </div>
                            <div className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">
                              {assignedSubject.name}
                            </div>
                            <div className="text-[10px] text-[#6C63FF] font-medium mt-1">
                              👨‍🏫 {slot.faculty_name || assignedSubject.faculty_name || "Faculty"}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px]">
                              {slot.room && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                                  📍 {slot.room}
                                </span>
                              )}
                              {isOnline && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">
                                  🌐 Online
                                </span>
                              )}
                              {isHybrid && (
                                <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-semibold text-indigo-800">
                                  🔄 Hybrid
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Document Footer Notes */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
              <p>
                Generated by SkillArc Academic Timetable System · Document Ref: SA-TT-
                {Date.now().toString().slice(-6)}
              </p>
              <p>Authorised Academic Registrar Signature: __________________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
