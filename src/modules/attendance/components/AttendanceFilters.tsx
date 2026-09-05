import { BookOpen, CalendarDays, Clock3, GraduationCap, Layers, Users } from "lucide-react"

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Program */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          <GraduationCap size={13} className="text-[#6C63FF]" /> Program
        </label>
        <select
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 shadow-2xs"
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
          className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 shadow-2xs"
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
          className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 shadow-2xs"
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
          className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 shadow-2xs truncate"
        >
          <option value="">Select subject</option>
          {filteredSubjects.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.code ? `${s.code} • ` : ""}{s.name}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Period */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          <Clock3 size={13} className="text-[#6C63FF]" /> Period
        </label>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 shadow-2xs"
        >
          <option value="">Select period</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
            <option key={p} value={String(p)}>
              Period {p}
            </option>
          ))}
        </select>
      </div>

      {/* 6. Date */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          <CalendarDays size={13} className="text-[#6C63FF]" /> Date
        </label>
        <input
          type="date"
          value={selectedDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 shadow-2xs"
        />
      </div>
    </div>
  )
}