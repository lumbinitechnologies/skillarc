"use client"

import { Trash2, BookMarked, GraduationCap, BookOpen, Target, Edit2, Building2, Layers } from "lucide-react"

const typeConfig: Record<string, { label: string; icon: string; textClass: string; bgClass: string; gradientClass: string }> = {
  THEORY:   { label: "Theory",   icon: "📖", textClass: "text-[var(--primary)]", bgClass: "bg-[var(--primary-50)]", gradientClass: "from-[var(--primary)] to-[var(--secondary)]" },
  LAB:      { label: "Lab",      icon: "🧪", textClass: "text-[#00C2A8]", bgClass: "bg-[#00C2A8]/8", gradientClass: "from-[#00C2A8] to-[#00DDAA]" },
  ELECTIVE: { label: "Elective", icon: "🎯", textClass: "text-[#FFB020]", bgClass: "bg-[#FFB020]/8", gradientClass: "from-[#FFB020] to-[#FFC550]" },
}

function getProgramStyle(name: string | undefined): { text: string; bg: string } {
  if (!name) return { text: "text-slate-500", bg: "bg-slate-50" }
  const n = name.toLowerCase()
  if (n.includes("cse") || n.includes("computer"))   return { text: "text-[#6C63FF]", bg: "bg-[#6C63FF]/5" }
  if (n.includes("ai") || n.includes("artificial"))  return { text: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/5" }
  if (n.includes("ece") || n.includes("electronic")) return { text: "text-[#00C2A8]", bg: "bg-[#00C2A8]/5" }
  if (n.includes("mba") || n.includes("business"))   return { text: "text-amber-700", bg: "bg-amber-50/70" }
  if (n.includes("mech"))                            return { text: "text-yellow-800", bg: "bg-yellow-50/80" }
  if (n.includes("civil"))                           return { text: "text-teal-700", bg: "bg-teal-50/80" }
  
  const palette = [
    { text: "text-[#6C63FF]", bg: "bg-[#6C63FF]/5" },
    { text: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/5" },
    { text: "text-[#00C2A8]", bg: "bg-[#00C2A8]/5" },
  ]
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

export function SubjectsList({ subjects, onDelete, onEdit }: any) {
  if (!subjects?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl bg-slate-50/50">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-indigo-100 mb-5">
          <BookMarked className="w-6 h-6 text-white" />
        </div>
        <p className="text-base font-bold text-slate-900 mb-1">No subjects yet</p>
        <p className="text-sm text-slate-400">Create a subject to get started</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject: any) => {
        const type = typeConfig[subject.subject_type] ?? typeConfig.THEORY
        const progStyle = getProgramStyle(subject.program?.name)

        return (
          <div
            key={subject.id}
            className="group relative bg-white rounded-3xl shadow-[0_2px_8px_rgba(15,23,42,0.02)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(108,99,255,0.06)] flex flex-col justify-between"
          >
            {/* Top color tag */}
            <div className={`h-[5px] w-full bg-gradient-to-r ${type.gradientClass}`} />

            <div className="p-6">
              {/* Header section */}
              <div className="flex gap-4 items-start mb-5">
                <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-xl ${type.bgClass}`}>
                  {type.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight overflow-hidden text-ellipsis whitespace-nowrap group-hover:text-[#6C63FF] transition-colors duration-200">
                    {subject.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] font-bold font-['Space_Grotesk'] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                      {subject.code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${type.bgClass} ${type.textClass}`}>
                      {type.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subject Details metadata */}
              <div className="space-y-3">
                {/* Department Info */}
                {subject.program?.department?.name && (
                  <div className="flex items-center gap-3 bg-slate-50/50 rounded-xl p-3">
                    <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Department</p>
                      <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                        {subject.program.department.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Program Info */}
                <div className={`flex items-center gap-3 rounded-xl p-3 ${progStyle.bg}`}>
                  <GraduationCap className={`w-4 h-4 flex-shrink-0 ${progStyle.text}`} />
                  <div className="min-w-0">
                    <p className={`text-[9px] font-bold uppercase tracking-wider opacity-85 ${progStyle.text}`}>Program</p>
                    <p className={`text-xs font-bold truncate mt-0.5 ${progStyle.text}`}>
                      {subject.program?.name ?? "Not Assigned"}
                    </p>
                  </div>
                </div>

                {/* Semester & Credits Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 bg-slate-50/50 rounded-xl p-3">
                    <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Semester</p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5 font-['Space_Grotesk']">
                        Semester {subject.semester}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50/50 rounded-xl p-3">
                    <Target className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Credits</p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5 font-['Space_Grotesk']">
                        {subject.credits} Credits
                      </p>
                    </div>
                  </div>
                </div>

                {/* Credits visual progress */}
                <div className="flex items-center justify-between gap-3 bg-slate-50/50 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Credit Weight</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          i < subject.credits ? "bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] scale-110 shadow-sm" : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex items-center p-2 gap-2 bg-slate-50/30">
              <button
                onClick={() => onEdit?.(subject)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#6C63FF] hover:bg-slate-100 flex items-center justify-center gap-2 transition-all duration-200 shadow-none hover:shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => onDelete(subject.id)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-[#F04438] hover:bg-red-50/50 flex items-center justify-center gap-2 transition-all duration-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}