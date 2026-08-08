import { redirect } from "next/navigation"
import { CalendarDays, Clock3, MapPin } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"

export const dynamic = "force-dynamic"

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default async function FacultyTimetablePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, institution_id")
    .eq("id", user.id)
    .single()

  if (!profile || ![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(profile.role)) redirect("/dashboard")

  // Fetch timetable settings
  const { data: settings } = await supabase
    .from("institution_timetable_settings")
    .select("period_timings")
    .eq("institution_id", profile.institution_id)
    .maybeSingle()

  const periodTimings = settings?.period_timings as Array<{ id: string; label: string; time: string }> || []
  const periodLabelsMap: Record<number, string> = {}
  periodTimings.forEach((p) => {
    const num = Number(p.id.replace("P", ""))
    if (!isNaN(num)) {
      periodLabelsMap[num] = p.time
    }
  })

  const finalPeriodLabels = Object.keys(periodLabelsMap).length > 0 ? periodLabelsMap : {
    1: "8:45 – 9:45",
    2: "9:45 – 10:45",
    3: "11:00 – 12:00",
    4: "12:00 – 1:00",
    5: "2:00 – 3:00",
  }

  const { data: timetableRows = [] } = await supabase
    .from("timetable_slots")
    .select(`
      day,
      period,
      section_id,
      subject_id,
      subjects!inner(id, name, code),
      sections!inner(name)
    `)
    .eq("institution_id", profile.institution_id)
    .eq("faculty_id", user.id)
    .order("day")
    .order("period")

  const timetableByDay = DAY_ORDER.map((day) => ({
    day,
    slots: (timetableRows as Array<any>)
      .filter((slot) => slot.day === day)
      .map((slot) => ({
        period: slot.period,
        subject: slot.subjects?.code ?? slot.subjects?.name ?? "Class",
        section: slot.sections?.name ?? "Section",
        room: slot.sections?.name ? `Room ${slot.sections.name}` : "Main Hall",
        time: `Period ${slot.period} · ${finalPeriodLabels[slot.period] ?? "TBD"}`,
      }))
      .sort((a, b) => a.period - b.period),
  })).filter((dayEntry) => dayEntry.slots.length > 0)

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, color: "#4f46e5", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12 }}>
            Weekly schedule
          </p>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, color: "#111827" }}>
            Your timetable
          </h1>
          <p style={{ margin: "6px 0 0", color: "#6b7280", maxWidth: 640 }}>
            Review the classes assigned to you for the week and the sections they belong to.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 999, background: "#ecfeff", color: "#0f766e", fontWeight: 600 }}>
          <CalendarDays size={18} />
          {timetableByDay.reduce((count, day) => count + day.slots.length, 0)} sessions
        </div>
      </div>

      {timetableByDay.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #ece7ff", borderRadius: 18, padding: 28, textAlign: "center", color: "#6b7280" }}>
          No timetable entries have been assigned to you yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {timetableByDay.map((dayEntry) => (
            <div key={dayEntry.day} style={{ background: "#fff", border: "1px solid #ece7ff", borderRadius: 20, padding: 18, boxShadow: "0 10px 25px rgba(79,70,229,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>{dayEntry.day}</h2>
                <span style={{ color: "#6b7280", fontWeight: 600, fontSize: 13 }}>{dayEntry.slots.length} classes</span>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {dayEntry.slots.map((slot) => (
                  <div key={`${dayEntry.day}-${slot.period}`} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", border: "1px solid #f3f4f6", borderRadius: 14, padding: "12px 14px", background: "#fafafa" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ede9fe", color: "#5b21b6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Clock3 size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#111827" }}>{slot.subject}</div>
                        <div style={{ color: "#6b7280", fontSize: 13 }}>{slot.time}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#4b5563" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <MapPin size={15} />
                        <span>{slot.room}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <CalendarDays size={15} />
                        <span>{slot.section}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
