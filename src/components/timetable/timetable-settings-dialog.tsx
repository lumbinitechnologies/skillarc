"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, Settings, Clock, Save, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface PeriodTiming {
  id: string
  label: string
  time: string
}

export function TimetableSettingsDialog({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [startTime, setStartTime] = useState("08:45")
  const [endTime, setEndTime] = useState("16:00")
  const [duration, setDuration] = useState(60)
  const [numPeriods, setNumPeriods] = useState(5)
  const [periodTimings, setPeriodTimings] = useState<PeriodTiming[]>([])
  
  const { toast } = useToast()

  // Fetch settings on load
  useEffect(() => {
    if (!open) return
    async function loadSettings() {
      setLoading(true)
      try {
        const res = await fetch("/api/timetable/settings")
        if (res.ok) {
          const data = await res.json()
          setStartTime(data.start_time ? data.start_time.substring(0, 5) : "08:45")
          setEndTime(data.end_time ? data.end_time.substring(0, 5) : "16:00")
          setDuration(data.period_duration_minutes || 60)
          setNumPeriods(data.number_of_periods || 5)
          setPeriodTimings(data.period_timings || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [open])

  // Helper to generate default period timings based on start time, duration, and number of periods
  const handleAutoGenerate = () => {
    const parts = startTime.split(":")
    let currentHour = Number(parts[0]) || 8
    let currentMin = Number(parts[1]) || 45

    const generated: PeriodTiming[] = []
    for (let i = 1; i <= numPeriods; i++) {
      const startStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`
      
      // Add duration
      currentMin += duration
      currentHour += Math.floor(currentMin / 60)
      currentMin = currentMin % 60
      
      const endStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`
      
      generated.push({
        id: `P${i}`,
        label: `Period ${i}`,
        time: `${startStr} – ${endStr}`
      })
    }
    setPeriodTimings(generated)
  }

  // Auto-generate if timings are empty
  useEffect(() => {
    if (periodTimings.length === 0 && open && !loading) {
      handleAutoGenerate()
    }
  }, [open, loading, periodTimings.length])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/timetable/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
          period_duration_minutes: duration,
          number_of_periods: numPeriods,
          period_timings: periodTimings,
        })
      })

      if (!res.ok) throw new Error("Failed to save settings")
      
      toast({
        title: "Success",
        description: "Timetable settings updated successfully",
      })
      onOpenChange(false)
      window.location.reload()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-xl rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#6C63FF] flex items-center justify-center shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">Timetable Configuration</h2>
              <p className="text-xs text-slate-400 mt-0.5">Customize daily schedule timings and period structures</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-xl border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Loading configuration...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">College Start Time</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold border border-slate-100 rounded-2xl bg-slate-50/50 text-slate-800 outline-none hover:border-slate-200 focus:border-[#6C63FF] focus:bg-white transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">College End Time</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm font-semibold border border-slate-100 rounded-2xl bg-slate-50/50 text-slate-800 outline-none hover:border-slate-200 focus:border-[#6C63FF] focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Period Duration (Minutes)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-2.5 text-sm font-semibold border border-slate-100 rounded-2xl bg-slate-50/50 text-slate-800 outline-none hover:border-slate-200 focus:border-[#6C63FF] focus:bg-white transition"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Number of Periods</label>
                <input
                  type="number"
                  value={numPeriods}
                  onChange={e => setNumPeriods(Number(e.target.value))}
                  className="w-full px-4 py-2.5 text-sm font-semibold border border-slate-100 rounded-2xl bg-slate-50/50 text-slate-800 outline-none hover:border-slate-200 focus:border-[#6C63FF] focus:bg-white transition"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleAutoGenerate}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Auto-Generate Timings
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Period Timings Preview</label>
              <div className="space-y-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                {periodTimings.map((p, index) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-600 w-16">{p.label}</span>
                    <input
                      type="text"
                      value={p.time}
                      onChange={e => {
                        const updated = [...periodTimings]
                        updated[index] = { ...p, time: e.target.value }
                        setPeriodTimings(updated)
                      }}
                      placeholder="e.g. 8:45 – 9:45"
                      className="flex-1 px-3 py-1.5 text-xs font-semibold border border-slate-150 rounded-xl bg-white text-slate-800 outline-none focus:border-[#6C63FF] transition"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/30">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-[2] py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary-600)] hover:to-[var(--primary-700)] rounded-xl shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Settings
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
