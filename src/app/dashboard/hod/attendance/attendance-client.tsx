"use client"

import { motion } from "framer-motion"
import { ClipboardCheck, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { PageShell, PageHeader } from "@/components/ui/page-shell"

interface SectionStat {
  id: string
  name: string
  semester: number | null
  programName: string
  studentCount: number
  totalClasses: number
  present: number
  absent: number
  rate: number | null
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 140, damping: 20 } } }

function rateColor(r: number | null) {
  if (r === null) return "text-slate-400"
  if (r >= 75) return "text-emerald-600"
  if (r >= 60) return "text-amber-500"
  return "text-red-500"
}
function rateBarColor(r: number | null) {
  if (r === null) return "bg-slate-200"
  if (r >= 75) return "bg-emerald-500"
  if (r >= 60) return "bg-amber-400"
  return "bg-red-500"
}

export default function HodAttendanceClient({
  hodName,
  sectionStats,
}: {
  hodName: string
  sectionStats: SectionStat[]
}) {
  const avgRate = sectionStats.filter((s) => s.rate !== null).length > 0
    ? Math.round(sectionStats.filter((s) => s.rate !== null).reduce((a, s) => a + (s.rate ?? 0), 0) / sectionStats.filter((s) => s.rate !== null).length)
    : null

  const below75 = sectionStats.filter((s) => s.rate !== null && s.rate < 75)

  return (
    <PageShell>
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        eyebrow="HOD Portal"
        title="Attendance Overview"
        subtitle="Section-level attendance rates across the institution."
      />

      {/* Summary bar */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-3xl font-black text-slate-900 font-['Space_Grotesk']">{sectionStats.length}</p>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Total Sections</p>
        </div>
        <div className={`rounded-2xl border px-5 py-4 shadow-sm ${avgRate !== null && avgRate >= 75 ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}>
          <p className={`text-3xl font-black font-['Space_Grotesk'] ${rateColor(avgRate)}`}>{avgRate !== null ? `${avgRate}%` : "—"}</p>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Avg Attendance Rate</p>
        </div>
        <div className={`rounded-2xl border px-5 py-4 shadow-sm ${below75.length > 0 ? "border-red-100 bg-red-50" : "border-emerald-100 bg-emerald-50"}`}>
          <p className={`text-3xl font-black font-['Space_Grotesk'] ${below75.length > 0 ? "text-red-600" : "text-emerald-600"}`}>{below75.length}</p>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Sections Below 75%</p>
        </div>
      </motion.div>

      {below75.length > 0 && (
        <motion.div variants={item} className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 font-semibold">
            {below75.length} section{below75.length !== 1 ? "s" : ""} ({below75.map((s) => `Section ${s.name}`).join(", ")}) are below the 75% attendance threshold and may need intervention.
          </p>
        </motion.div>
      )}

      {/* Section cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Breakdown</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900">Section-wise Attendance</h2>
        </div>

        {sectionStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ClipboardCheck className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-400">No attendance data yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {[...sectionStats].sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0)).map((sec) => (
              <motion.div key={sec.id} variants={item} className="flex items-center gap-4 px-6 py-4">
                <div className="h-8 w-1 rounded-full shrink-0" style={{ background: sec.rate !== null && sec.rate >= 75 ? "#10B981" : sec.rate !== null && sec.rate >= 60 ? "#EAAD62" : "#F04438" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Section {sec.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{sec.programName} · Sem {sec.semester ?? "—"} · {sec.studentCount} students</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sec.rate !== null ? (
                        <>
                          <span className={`text-lg font-black font-['Space_Grotesk'] ${rateColor(sec.rate)}`}>{sec.rate}%</span>
                          {sec.rate >= 75 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
                        </>
                      ) : (
                        <span className="text-sm text-slate-400 font-semibold">No data</span>
                      )}
                    </div>
                  </div>
                  {sec.rate !== null && (
                    <>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                        <div className={`h-1.5 rounded-full ${rateBarColor(sec.rate)} transition-all duration-700`} style={{ width: `${sec.rate}%` }} />
                      </div>
                      <div className="flex gap-4 mt-1.5 text-[10px] text-slate-400 font-medium">
                        <span className="text-emerald-600 font-semibold">{sec.present} present</span>
                        <span className="text-red-500 font-semibold">{sec.absent} absent</span>
                        <span>{sec.totalClasses} total classes</span>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </PageShell>
  )
}
