"use client"

import React, { useState } from "react"
import { AlertTriangle, ShieldCheck, X, Users, DoorClosed, Layers, ChevronRight, CheckCircle2 } from "lucide-react"
import { TimetableClash, ClashType } from "../types/timetable.types"

interface Props {
  open: boolean
  onClose: () => void
  clashes: TimetableClash[]
  isScanning?: boolean
  onRefresh?: () => void
}

export default function ClashInspectorModal({
  open,
  onClose,
  clashes,
  isScanning,
  onRefresh,
}: Props) {
  const [filter, setFilter] = useState<"ALL" | ClashType>("ALL")

  if (!open) return null

  const filteredClashes = clashes.filter((c) => {
    if (filter === "ALL") return true
    return c.type === filter
  })

  const trainerClashesCount = clashes.filter((c) => c.type === "TRAINER_DOUBLE_BOOKED").length
  const roomClashesCount = clashes.filter((c) => c.type === "ROOM_OVERLAP").length
  const sectionClashesCount = clashes.filter((c) => c.type === "SECTION_CONCURRENT").length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-slate-50 via-white to-purple-50/30">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              clashes.length > 0 ? "bg-amber-100 text-amber-600 shadow-sm" : "bg-emerald-100 text-emerald-600 shadow-sm"
            }`}>
              {clashes.length > 0 ? <AlertTriangle size={22} /> : <ShieldCheck size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Timetable Conflict Inspector
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  clashes.length > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {clashes.length} {clashes.length === 1 ? "Conflict" : "Conflicts"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time validation for trainer double-bookings, room overlaps & cohort conflicts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3 bg-slate-50/50">
          <button
            onClick={() => setFilter("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({clashes.length})
          </button>
          <button
            onClick={() => setFilter("TRAINER_DOUBLE_BOOKED")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === "TRAINER_DOUBLE_BOOKED"
                ? "bg-[#6C63FF] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users size={13} /> Trainer ({trainerClashesCount})
          </button>
          <button
            onClick={() => setFilter("ROOM_OVERLAP")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === "ROOM_OVERLAP"
                ? "bg-[#8B5CF6] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <DoorClosed size={13} /> Room Overlap ({roomClashesCount})
          </button>
          <button
            onClick={() => setFilter("SECTION_CONCURRENT")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === "SECTION_CONCURRENT"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers size={13} /> Cohort ({sectionClashesCount})
          </button>
        </div>

        {/* Conflict List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredClashes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-3 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-['Plus_Jakarta_Sans']">
                No Schedule Conflicts Detected
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                All trainers, rooms, and cohort allocations are conflict-free for this schedule.
              </p>
            </div>
          ) : (
            filteredClashes.map((clash) => {
              const badgeBg =
                clash.type === "TRAINER_DOUBLE_BOOKED"
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : clash.type === "ROOM_OVERLAP"
                  ? "bg-purple-50 border-purple-200 text-purple-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"

              const icon =
                clash.type === "TRAINER_DOUBLE_BOOKED" ? (
                  <Users size={16} className="text-rose-600 shrink-0" />
                ) : clash.type === "ROOM_OVERLAP" ? (
                  <DoorClosed size={16} className="text-purple-600 shrink-0" />
                ) : (
                  <Layers size={16} className="text-amber-600 shrink-0" />
                )

              return (
                <div
                  key={clash.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-slate-300 hover:shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100">
                        {icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                            {clash.title}
                          </h4>
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeBg}`}>
                            {clash.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {clash.description}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {clash.day} · Period {clash.period}
                      </span>
                    </div>
                  </div>

                  {/* Conflicting entities detail */}
                  {clash.conflictingSlots && clash.conflictingSlots.length > 0 && (
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Conflicting Sessions ({clash.conflictingSlots.length}):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {clash.conflictingSlots.map((slot, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg bg-white p-2.5 border border-slate-200/60 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-semibold text-slate-800">
                              <span>{slot.subject_code}</span>
                              <span className="text-[11px] text-indigo-600 font-medium">
                                {slot.section_name}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">
                              {slot.subject_name}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                              <span>👨‍🏫 {slot.faculty_name || "Unassigned"}</span>
                              {slot.room && <span>📍 {slot.room}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="text-xs text-slate-500">
            {isScanning ? (
              <span className="flex items-center gap-1.5 text-indigo-600">
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" /> Scanning schedule...
              </span>
            ) : (
              <span>Last scanned: Live</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Re-scan Schedule
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Close Inspector
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
