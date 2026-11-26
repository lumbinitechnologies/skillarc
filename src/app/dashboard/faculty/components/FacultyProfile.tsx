import { getFacultyProfile, getInstitutionName } from "./faculty-cache-v2"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export default async function FacultyProfile() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profile = await getFacultyProfile(user.id)
  const institutionName = await getInstitutionName(profile?.institution_id)

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg">
          <span className="text-2xl">👩‍🏫</span>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">Faculty overview</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">Hi, {profile?.name ?? user.email}</h1>
          <p className="mt-2 text-sm text-slate-500">{institutionName ?? ""} · {user.email}</p>
        </div>
      </div>
    </section>
  )
}
