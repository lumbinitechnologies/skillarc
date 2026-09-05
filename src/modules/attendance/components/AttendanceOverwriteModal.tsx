"use client"

import React from "react"
import { AlertTriangle, User, BookOpen, Calendar, Clock, X, ShieldAlert, CheckCircle2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AttendanceOverwriteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmOverwrite: () => void
  isSaving?: boolean
  sectionName?: string
  periodName?: string
  date?: string
  loggedByFacultyName?: string
  loggedByFacultyEmail?: string
  loggedSubjectName?: string
  loggedSubjectCode?: string
  loggedSessionNotes?: string
  currentFacultyName?: string
}

export default function AttendanceOverwriteModal({
  isOpen,
  onClose,
  onConfirmOverwrite,
  isSaving = false,
  sectionName = "Section",
  periodName = "Period 1",
  date = "",
  loggedByFacultyName = "Another Faculty",
  loggedByFacultyEmail = "",
  loggedSubjectName = "Subject",
  loggedSubjectCode = "",
  loggedSessionNotes = "",
  currentFacultyName = "You",
}: AttendanceOverwriteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-lg w-full overflow-hidden my-6 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-amber-100 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-white flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
            <ShieldAlert size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-full">
              Session Conflict Warning
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1 font-['Plus_Jakarta_Sans',sans-serif]">
              Attendance Already Logged
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Another faculty member has already recorded attendance for this class slot.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Warning Message Box */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-950">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <span>Overwrite Confirmation Required</span>
            </div>
            <p className="leading-relaxed">
              Attendance for <strong className="font-bold text-slate-900">{sectionName}</strong> ({periodName}) on{" "}
              <strong className="font-bold text-slate-900">{date}</strong> was originally recorded by{" "}
              <strong className="font-bold text-indigo-700">{loggedByFacultyName}</strong>.
            </p>
          </div>

          {/* Conflict Details Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Logged By</span>
              <div className="text-right">
                <span className="font-bold text-slate-800 block">{loggedByFacultyName}</span>
                {loggedByFacultyEmail && (
                  <span className="text-[10px] text-slate-500 font-mono">{loggedByFacultyEmail}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Subject</span>
              <div className="text-right">
                <span className="font-bold text-slate-800 block">{loggedSubjectName}</span>
                {loggedSubjectCode && (
                  <span className="text-[10px] text-indigo-600 font-mono font-semibold">{loggedSubjectCode}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Slot / Session</span>
              <span className="font-bold text-slate-800">
                {sectionName} • {periodName}
              </span>
            </div>

            {loggedSessionNotes && (
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                  Original Session Notes
                </span>
                <p className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 italic text-[11px] leading-relaxed">
                  "{loggedSessionNotes}"
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 text-center leading-relaxed">
            Would you like to overwrite this session with your current attendance records, or cancel to keep the existing submission?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
          >
            Cancel & Keep Original
          </button>
          <button
            type="button"
            onClick={onConfirmOverwrite}
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-xs font-extrabold text-white hover:opacity-95 transition shadow-md shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSaving ? "Overwriting..." : "Yes, Overwrite Attendance"}
          </button>
        </div>
      </div>
    </div>
  )
}
