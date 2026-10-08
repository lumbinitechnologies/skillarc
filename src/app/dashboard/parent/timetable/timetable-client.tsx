"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Clock } from "lucide-react"
import { PageShell, PageHeader, itemVariants } from "@/components/ui/page-shell"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 18 } } }

const PERIOD_COLORS = [
  "bg-[#1690C7]/8 border-[#1690C7]/15 text-[#1690C7]",
  "bg-[#FC8402]/8 border-[#FC8402]/15 text-[#FC8402]",
  "bg-emerald-50 border-emerald-100 text-emerald-700",
  "bg-violet-50 border-violet-100 text-violet-700",
  "bg-pink-50 border-pink-100 text-pink-700",
  "bg-amber-50 border-amber-100 text-amber-700",
  "bg-sky-50 border-sky-100 text-sky-700",
  "bg-rose-50 border-rose-100 text-rose-700",
]

interface Slot {
  day: string
  period: number
  subjectName: string
  subjectCode: string
  facultyName: string
}

interface ChildWithTimetable {
  id: string
  name: string
  relationship: string
  sectionName: string
  programName: string
  semester: number | null
  slots: Slot[]
}

export default function ParentTimetableClient({
  parentName,
  children,
}: {
  parentName: string
  children: ChildWithTimetable[]
}) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [selectedDay, setSelectedDay] = useState(
    new Date().toLocaleDateString("en-US", { weekday: "long" })
  )
  const [view, setView] = useState<"day" | "week">("day")

  const child = children[selectedIdx] ?? null
  const daySlots = child?.slots.filter((s) => s.day === selectedDay).sort((a, b) => a.period - b.period) ?? []
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" })

  // Build week grid: period rows × day cols
  const maxPeriod = child ? Math.max(0, ...child.slots.map((s) => s.period)) : 0

  return (
    <PageShell>
      <PageHeader
        icon={<Calendar className="h-5 w-5" />}
        eyebrow="Parent Portal"
        title="Timetable"
        subtitle="View your child's class schedule by day or week."
        actions={
          children.length > 1 ? (
            <select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[var(--primary)] transition"
            >
              {children.map((c, i) => <option key={c.id} value={i}>{c.name}</option>)}
            </select>
          ) : undefined
        }
      />

      {!child ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <Calendar className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No student linked yet.</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={child.id} variants={container} initial="hidden" animate="show" className="space-y-5">
            {/* Student bar */}
            <motion.div variants={item} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-3.5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-black text-sm">{child.name.charAt(0)}</div>
              <div>
                <p className="text-sm font-bold text-slate-900">{child.name}</p>
                <p className="text-[11px] text-slate-400">{child.programName} · Section {child.sectionName} · Sem {child.semester ?? "—"}</p>
              </div>
              <div className="ml-auto flex gap-1">
                {(["day", "week"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${view === v ? "bg-[var(--primary)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{v}</button>
                ))}
              </div>
            </motion.div>

            {view === "day" ? (
              <motion.div variants={item} className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                {/* Day tabs */}
                <div className="flex gap-1 flex-wrap p-4 border-b border-slate-50">
                  {DAYS.map((day) => {
                    const hasClass = child.slots.some((s) => s.day === day)
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${selectedDay === day ? "bg-[var(--primary)] text-white shadow-sm" : hasClass ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-slate-50 text-slate-400"} ${day === today && selectedDay !== day ? "ring-1 ring-[var(--primary)]/40" : ""}`}
                      >
                        {day.slice(0, 3)} {day === today && <span className="ml-0.5 opacity-70">(Today)</span>}
                      </button>
                    )
                  })}
                </div>

                {daySlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Clock className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-400">No classes on {selectedDay}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {daySlots.map((slot, i) => (
                      <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/40 transition-colors">
                        <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border font-['Space_Grotesk'] ${PERIOD_COLORS[(slot.period - 1) % PERIOD_COLORS.length]}`}>
                          <span className="text-[8px] font-black uppercase opacity-60">P</span>
                          <span className="text-sm font-black leading-none">{slot.period}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900">{slot.subjectName}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{slot.subjectCode} · {slot.facultyName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              /* Week grid view */
              <motion.div variants={item} className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 pl-6 pr-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Period</th>
                      {DAYS.map((d) => (
                        <th key={d} className={`py-3 px-3 text-center text-[10px] font-black uppercase tracking-[0.18em] ${d === today ? "text-[var(--primary)]" : "text-slate-400"}`}>
                          {d.slice(0, 3)}{d === today ? " ★" : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((period) => (
                      <tr key={period} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 pl-6 pr-4 font-black text-slate-400 font-['Space_Grotesk']">P{period}</td>
                        {DAYS.map((day) => {
                          const slot = child.slots.find((s) => s.day === day && s.period === period)
                          return (
                            <td key={day} className="py-2 px-2">
                              {slot ? (
                                <div className={`rounded-xl border p-2 text-center ${PERIOD_COLORS[(period - 1) % PERIOD_COLORS.length]}`}>
                                  <p className="font-bold truncate max-w-[80px]">{slot.subjectCode}</p>
                                  <p className="opacity-70 truncate max-w-[80px] text-[10px]">{slot.facultyName.split(" ")[0]}</p>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-slate-100 py-3 text-center text-slate-200 text-lg">—</div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {maxPeriod === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Clock className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-400">No timetable configured yet.</p>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </PageShell>
  )
}
