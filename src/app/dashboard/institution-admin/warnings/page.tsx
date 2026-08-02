"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Search, Mail } from "lucide-react"
import { supabase } from "@/lib/supabase"

type WarningRecord = {
  id: string
  student_id?: string | null
  current_rate?: number | string | null
  level?: string | null
  sent_at?: string | null
  users?: {
    name?: string | null
    programs?: {
      name?: string | null
    } | null
  } | null
}

type WarningItem = {
  id: string
  studentName: string
  course: string
  rate: number
  level: string
  date: string
}

export default function WarningsPage() {
  const [warnings, setWarnings] = useState<WarningItem[]>([])
  const [search, setSearch] = useState("")

  // Fetch warnings from DB
  const loadWarnings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("warning_letters")
        .select("id, current_rate, level, sent_at, student_id")
      
      if (error) throw error

      if (data && data.length > 0) {
        // Fetch student and user details for each warning
        const studentIds = data.map(w => w.student_id).filter(Boolean) as string[]
        const { data: students = [] } = studentIds.length
          ? await supabase
              .from("students")
              .select("id, program_id")
              .in("id", studentIds)
          : { data: [] }

        // Fetch user names
        const { data: users = [] } = studentIds.length
          ? await supabase
              .from("users")
              .select("id, name")
              .in("id", studentIds)
          : { data: [] }

        // Fetch program names for each program_id
        const programIds = Array.from(new Set((students || []).map(s => s.program_id).filter(Boolean))) as string[]
        const { data: programs = [] } = programIds.length
          ? await supabase
              .from("programs")
              .select("id, name")
              .in("id", programIds)
          : { data: [] }

        const formatted = data.map((w: WarningRecord) => {
          const student = (students || []).find(s => s.id === w.student_id)
          const user = (users || []).find(u => u.id === w.student_id)
          const program = (programs || []).find(p => p.id === student?.program_id)

          return {
            id: w.id,
            studentName: user?.name || "Student",
            course: program?.name || "Unknown Program",
            rate: Number(w.current_rate ?? 0),
            level: w.level || "WARNING",
            date: w.sent_at ? w.sent_at.split("T")[0] : new Date().toISOString().split("T")[0],
          }
        })
        setWarnings(formatted)
      } else {
        setWarnings([])
      }
    } catch (err: unknown) {
      console.error("Failed to load warnings:", err instanceof Error ? err.message : err)
      setWarnings([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWarnings()
  }, [loadWarnings])

  const filtered = warnings.filter((w) =>
    w.studentName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 p-6 font-sans">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Compliance Interventions</h1>
          <p className="text-xs text-slate-500 mt-1">Monitor low attendance warnings and log official warning letters</p>
        </div>
      </div>

      <div className="flex gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm max-w-md">
        <Search size={18} className="text-slate-400 self-center ml-2" />
        <input
          type="text"
          placeholder="Search warned students..."
          className="w-full text-sm outline-none border-none bg-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No intervention records are available yet.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 hover:border-rose-100 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                  <AlertTriangle size={20} />
                </div>
                <span className={`text-[10px] font-bold py-0.5 px-2 rounded-md ${
                  item.level === "FINAL_NOTICE" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {item.level.replace("_", " ")}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm leading-tight">{item.studentName}</h4>
                <p className="text-[10px] text-slate-400 mt-1">{item.course}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Attendance Rate</div>
                  <div className="text-sm font-extrabold text-rose-600 mt-0.5">{item.rate}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Date Sent</div>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">{item.date}</div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-1.5">
                <button className="flex items-center gap-1 px-3 py-1.5 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition">
                  <Mail size={12} className="text-slate-400" /> Re-send Email
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
