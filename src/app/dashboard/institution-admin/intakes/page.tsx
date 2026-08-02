"use client"

import { useCallback, useEffect, useState } from "react"
import { FolderKanban, Search, Plus, Calendar, Users } from "lucide-react"
import { supabase } from "@/lib/supabase"

type IntakeRecord = {
  id: string
  name: string
  start_date?: string | null
  end_date?: string | null
  users?: Array<{ count?: number | null }>
}

type IntakeItem = {
  id: string
  name: string
  start: string
  end: string
  students: number
  program: string
}

export default function IntakesPage() {
  const [intakes, setIntakes] = useState<IntakeItem[]>([])
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [newStart, setNewStart] = useState("")
  const [newEnd, setNewEnd] = useState("")

  // Fetch intakes from DB
  const loadIntakes = useCallback(async () => {
    try {
      const { data: intakesData, error } = await supabase
        .from("intakes")
        .select("id, name, start_date, end_date, institution_id")
      
      if (error) throw error

      if (intakesData && intakesData.length > 0) {
        // Count students enrolled in each intake
        const formatted = await Promise.all(intakesData.map(async (intake: any) => {
          const { count } = await supabase
            .from("enrolments")
            .select("id", { count: "exact", head: true })
            .eq("intake_id", intake.id)
          
          return {
            id: intake.id,
            name: intake.name,
            start: intake.start_date,
            end: intake.end_date,
            students: count ?? 0,
            program: "Graduate Diploma of Management",
          }
        }))
        setIntakes(formatted)
      } else {
        setIntakes([])
      }
    } catch (err: unknown) {
      console.error("Failed to load intakes:", err instanceof Error ? err.message : err)
      setIntakes([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadIntakes()
  }, [loadIntakes])

  // Create new cohort intake in DB
  const handleCreateIntake = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newStart || !newEnd) return

    try {
      // Local optimistic append
      const newInt = {
        id: "int-temp-" + Date.now(),
        name: newName.trim(),
        start: newStart,
        end: newEnd,
        students: 0,
        program: "Graduate Diploma of Management",
      }
      setIntakes((prev) => [newInt, ...prev])

      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from("users")
        .select("institution_id")
        .eq("id", user?.id)
        .single()

      if (profile && profile.institution_id) {
        await supabase.from("intakes").insert({
          institution_id: profile.institution_id,
          name: newName.trim(),
          start_date: newStart,
          end_date: newEnd,
        })
      }

      setNewName("")
      setNewStart("")
      setNewEnd("")
      setShowAdd(false)
      loadIntakes()
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = intakes.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6 p-6 font-sans">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Intake Cohorts</h1>
          <p className="text-xs text-slate-500 mt-1">Manage intake schedules and assign students to GDM cohorts</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
        >
          <Plus size={14} /> Create Cohort
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreateIntake} className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-4 max-w-xl">
          <h3 className="font-bold text-slate-800 text-sm">New Cohort Intake</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Cohort Name</label>
              <input
                required
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. GDM - January 2026 Cohort"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
              <input
                required
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
              <input
                required
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3.5 py-2 border border-slate-100 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Create
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm max-w-md">
        <Search size={18} className="text-slate-400 self-center ml-2" />
        <input
          type="text"
          placeholder="Search academic intakes..."
          className="w-full text-sm outline-none border-none bg-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No intake cohorts have been created yet.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 hover:border-slate-200 transition-all">
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <FolderKanban size={20} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.program}</span>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm leading-tight">{item.name}</h4>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                  <Calendar size={13} />
                  <span>{item.start} to {item.end}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Users size={14} className="text-slate-400" />
                  <span>{item.students} Students Enrolled</span>
                </div>
                <span className="text-[10px] font-bold bg-slate-50 text-slate-500 py-1 px-2.5 rounded-lg uppercase">
                  Active
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
