"use client"

import { useMemo } from "react"
import { BookOpen, CalendarDays, Clock3, GraduationCap, Layers, Users, Zap, Calendar } from "lucide-react"

const PERIOD_TIMES: Record<number, string> = {
  1: "8:45 – 9:45",
  2: "9:45 – 10:45",
  3: "11:00 – 12:00",
  4: "12:00 – 1:00",
  5: "2:00 – 3:00",
  6: "3:00 – 4:00",
  7: "4:00 – 5:00",
  8: "5:00 – 6:00",
}

const ALL_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

interface Props {
  programs: any[]
  sections: any[]
  subjects: any[]

  selectedProgram: string
  selectedSemester: string
  selectedSection: string
  selectedSubject: string
  selectedPeriod: string
  selectedDate: string

  setSelectedProgram: (v: string) => void
  setSelectedSemester: (v: string) => void
  setSelectedSection: (v: string) => void
  setSelectedSubject: (v: string) => void
  setSelectedPeriod: (v: string) => void
  setSelectedDate: (v: string) => void
  isCompact?: boolean

  // Timetable slots for the selected subject+section
  timetableSlots?: { day: string; period: number }[]
}

export default function AttendanceFilters({
  programs,
  sections,
  subjects,
  selectedProgram,
  selectedSemester,
  selectedSection,
  selectedSubject,
  selectedPeriod,
  selectedDate,
  setSelectedProgram,
  setSelectedSemester,
  setSelectedSection,
  setSelectedSubject,
  setSelectedPeriod,
  setSelectedDate,
  isCompact = false,
  timetableSlots = [],
}: Props) {
  const filteredSections = sections.filter((s: any) => {
    if (!selectedSemester) return false
    return (
      String(s.semester) === selectedSemester &&
      (!selectedProgram || s.program_id === selectedProgram)
    )
  })

  const filteredSubjects = subjects.filter((s: any) => {
    if (!selectedSemester) return false
    return String(s.semester) === selectedSemester
  })

  // Derive day-of-week name from selected date
  const selectedDayName = useMemo(() => {
    if (!selectedDate) return null
    const d = new Date(selectedDate + "T00:00:00")
    return DAY_NAMES[d.getDay()]
  }, [selectedDate])

  // Regular periods = timetable slots for this subject+section on the selected day
  const regularPeriods = useMemo(() => {
    if (!selectedDayName || !timetableSlots.length) return new Set<number>()
    const set = new Set<number>()
    for (const slot of timetableSlots) {
      if (slot.day.toLowerCase() === selectedDayName.toLowerCase()) {
        set.add(slot.period)
      }
    }
    return set
  }, [timetableSlots, selectedDayName])

  const hasRegularPeriods = regularPeriods.size > 0

  const selectClass =
    "w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 shadow-2xs"

  return (
    <div className="space-y-4">
      {/* Row 1: Program, Semester, Section, Subject, Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Program */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <GraduationCap size={13} className="text-[#6C63FF]" /> Program
          </label>
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className={selectClass}
          >
            <option value="">All programs</option>
            {programs.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Semester */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Layers size={13} className="text-[#6C63FF]" /> Semester
          </label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className={selectClass}
          >
            <option value="">Select semester</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={String(sem)}>
                Semester {sem}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Section */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Users size={13} className="text-[#6C63FF]" /> Section
          </label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className={selectClass}
          >
            <option value="">Select section</option>
            {filteredSections.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Subject */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <BookOpen size={13} className="text-[#6C63FF]" /> Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className={`${selectClass} truncate`}
          >
            <option value="">Select subject</option>
            {filteredSubjects.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.code ? `${s.code} • ` : ""}{s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Date */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <CalendarDays size={13} className="text-[#6C63FF]" /> Date
          </label>
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={selectClass}
          />
        </div>
      </div>

      {/* Row 2: Smart Period Picker */}
      {selectedSection && selectedSubject ? (
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Clock3 size={13} className="text-[#6C63FF]" /> Period
            {selectedDayName && (
              <span className="ml-1 text-[10px] font-semibold text-slate-400 normal-case tracking-normal">
                — {selectedDayName}
              </span>
            )}
          </label>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 space-y-3">
            {/* Regular Periods section */}
            {hasRegularPeriods && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar size={11} className="text-emerald-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Regular Periods
                  </span>
                  <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                    From timetable
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERIODS.filter((p) => regularPeriods.has(p)).map((p) => {
                    const isSelected = selectedPeriod === String(p)
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPeriod(String(p))}
                        className={`group flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 border text-xs font-bold transition-all duration-150 active:scale-95 ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200"
                            : "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
                        }`}
                      >
                        <span className="text-[11px] font-extrabold">P{p}</span>
                        {PERIOD_TIMES[p] && (
                          <span className={`text-[9px] font-medium ${isSelected ? "text-emerald-100" : "text-emerald-400"}`}>
                            {PERIOD_TIMES[p]}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Extra Periods section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap size={11} className="text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  Extra Periods
                </span>
                <span className="text-[9px] font-semibold text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  Additional class
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_PERIODS.filter((p) => !regularPeriods.has(p)).map((p) => {
                  const isSelected = selectedPeriod === String(p)
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPeriod(String(p))}
                      className={`group flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 border text-xs font-bold transition-all duration-150 active:scale-95 ${
                        isSelected
                          ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700"
                      }`}
                    >
                      <span className="text-[11px] font-extrabold">P{p}</span>
                      {PERIOD_TIMES[p] && (
                        <span className={`text-[9px] font-medium ${isSelected ? "text-amber-100" : "text-slate-400"}`}>
                          {PERIOD_TIMES[p]}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* If no timetable at all, show flat list with a note */}
            {!hasRegularPeriods && timetableSlots.length === 0 && selectedSubject && selectedSection && (
              <p className="text-[10px] text-slate-400 font-medium">
                No timetable configured for this subject &amp; section — all periods shown as extra.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Fallback: simple period dropdown before section+subject are selected */
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Clock3 size={13} className="text-[#6C63FF]" /> Period
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={selectClass}
          >
            <option value="">Select period</option>
            {ALL_PERIODS.map((p) => (
              <option key={p} value={String(p)}>
                Period {p} {PERIOD_TIMES[p] ? `(${PERIOD_TIMES[p]})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
