import { createSupabaseServerClient } from "@/lib/supabase-server"
import { getFacultySubjects } from "./faculty-cache-v2"

export default async function FacultySubjects() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const subjects = await getFacultySubjects(user.id)

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Subjects</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Assigned subjects</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{subjects.length} total</span>
      </div>
      <div className="grid gap-4">
        {subjects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No subjects assigned.</div>
        ) : (
          subjects.map((s) => (
            <div key={s.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.code}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
