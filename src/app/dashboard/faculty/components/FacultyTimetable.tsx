import { createSupabaseServerClient } from "@/lib/supabase-server"
import { getFacultyTimetable, getFacultyProfile } from "./faculty-cache-v2"

export default async function FacultyTimetable() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profile = await getFacultyProfile(user.id)
  const timetableSlots = await getFacultyTimetable(user.id, profile?.institution_id)

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Timetable</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Upcoming slots</h2>
        </div>
      </div>
      <div className="grid gap-3">
        {timetableSlots.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No timetable slots found.</div>
        ) : (
          timetableSlots.map((slot, i: number) => (
            <div key={i} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{slot.subjects?.name ?? "-"} · {slot.sections?.name ?? "-"}</p>
                  <p className="mt-1 text-xs text-slate-500">Day {slot.day} · Period {slot.period}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
