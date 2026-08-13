"use client"

import Link from "next/link"
import { 
  CalendarDays, 
  BookOpen, 
  Users, 
  Clock, 
  Plus, 
  ClipboardList, 
  Sparkles, 
  Compass, 
  Calendar, 
  ArrowRight,
  Bookmark,
  BellRing
} from "lucide-react"

interface Subject { id: string; name: string; code: string }
interface TimetableSlot {
  day: string
  period: number
  section_id: string
  subjects: { id: string; name: string; code: string } | null | undefined
  sections: { name: string } | null | undefined
}

const PERIOD_LABELS: Record<number, string> = {
  1: "8:45 – 9:45 AM",
  2: "9:45 – 10:45 AM",
  3: "11:00 AM – 12:00 PM",
  4: "12:00 – 1:00 PM",
  5: "2:00 – 3:00 PM",
}

function getGreeting() {
  const hr = new Date().getHours()
  if (hr < 12) return "Good Morning"
  if (hr < 17) return "Good Afternoon"
  return "Good Evening"
}

export default function FacultyDashboardClient({
  faculty,
  subjects,
  studentCount,
  timetableSlots,
}: {
  faculty: {
    name?: string
    email: string
    institution: string
  }
  subjects: Subject[]
  studentCount: number
  timetableSlots: TimetableSlot[]
}) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" })
  const greeting = getGreeting()

  const todaySchedule = timetableSlots
    .filter((slot) => slot.day === today)
    .map((slot) => ({
      id: `${slot.day}-${slot.period}-${slot.section_id}`,
      subject: slot.subjects?.name ?? "Class",
      code: slot.subjects?.code ?? "",
      section: slot.sections?.name ?? "Section",
      time: PERIOD_LABELS[slot.period] ?? `Period ${slot.period}`,
      period: slot.period,
    }))
    .sort((a, b) => a.period - b.period)

  const weeklyClasses = timetableSlots.length
  const uniqueSubjectCount = new Set(subjects.map((subject) => subject.id)).size

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header Profile Section */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Soft radial aura */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-radial-gradient from-indigo-50/50 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg shadow-indigo-100/50 flex-shrink-0">
              <span className="text-2xl">👩‍🏫</span>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#6C63FF]">Faculty Portal</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans']">
                {greeting}, {faculty.name ?? "Professor"} 👋
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {faculty.institution} • {faculty.email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link 
              href="/dashboard/faculty/timetable" 
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:border-slate-200 active:scale-95"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              Full Timetable
            </Link>
            <Link 
              href="/dashboard/faculty/attendance" 
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary-600)] hover:to-[var(--primary-700)] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:shadow-md hover:shadow-indigo-100 transition-all duration-200 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Log Attendance
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="group bg-white rounded-3xl border border-slate-100 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(108,99,255,0.05)] hover:border-indigo-100/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Classes</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00C2A8] flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold font-['Space_Grotesk'] text-slate-900">{weeklyClasses} Sessions</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Teaching commitments this week</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="group bg-white rounded-3xl border border-slate-100 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(108,99,255,0.05)] hover:border-indigo-100/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subjects Assigned</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#6C63FF] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold font-['Space_Grotesk'] text-slate-900">{uniqueSubjectCount} Subjects</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Active items in subject roster</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="group bg-white rounded-3xl border border-slate-100 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(108,99,255,0.05)] hover:border-indigo-100/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students Supported</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#8B5CF6] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold font-['Space_Grotesk'] text-slate-900">{studentCount} Students</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Total learners under institution</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="group bg-white rounded-3xl border border-slate-100 p-5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(108,99,255,0.05)] hover:border-indigo-100/50 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Snapshot</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#FFB020] flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-slate-900">{today}</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Quick daily timetable layout</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Schedule & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        {/* Today's Schedule timeline */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] space-y-6">
          <div className="flex items-center justify-between gap-4 pb-2">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Classroom Schedule</span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">Today's Teaching Plan</h2>
            </div>
            <span className="bg-[#00C2A8]/10 text-[#00C2A8] text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full animate-pulse">
              Live Feed
            </span>
          </div>

          <div className="space-y-4">
            {todaySchedule.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No classes today</p>
                <p className="text-xs text-slate-400 mt-0.5">You are free from lecture sessions today.</p>
              </div>
            ) : (
              <div className="relative border-l border-indigo-100 pl-5 ml-2.5 space-y-6">
                {todaySchedule.map((item) => (
                  <div key={item.id} className="relative group">
                    {/* Circle bullet indicator */}
                    <div className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-white bg-[#6C63FF] shadow-sm group-hover:scale-125 transition-transform duration-200" />
                    
                    <div className="bg-slate-50/60 hover:bg-white border border-slate-100 hover:border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all duration-300 hover:shadow-sm">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#6C63FF] transition-colors">{item.subject}</h4>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-semibold font-['Space_Grotesk']">
                          <span className="text-[#6C63FF] bg-[#6C63FF]/5 px-2 py-0.5 rounded border border-[#6C63FF]/15 text-[10px]">{item.code}</span>
                          <span>•</span>
                          <span>{item.section}</span>
                        </div>
                      </div>
                      <span className="self-start sm:self-center bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-600 font-['Space_Grotesk'] shadow-sm">
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions Panel */}
        <aside className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] space-y-6 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Control Room</span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">Quick Actions</h2>
          </div>

          <div className="space-y-3.5">
            <Link 
              href="/dashboard/faculty/attendance" 
              className="group w-full rounded-2xl border border-slate-100 hover:border-indigo-100 bg-slate-50/50 hover:bg-white px-5 py-4 text-left flex justify-between items-center transition-all duration-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#6C63FF]/5 text-[#6C63FF] flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Attendance Log</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Review & submit attendance sheets</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#6C63FF] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link 
              href="/dashboard/faculty/timetable" 
              className="group w-full rounded-2xl border border-slate-100 hover:border-indigo-100 bg-slate-50/50 hover:bg-white px-5 py-4 text-left flex justify-between items-center transition-all duration-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Weekly Schedule</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Update or view lecture timetable</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#8B5CF6] group-hover:translate-x-1 transition-all" />
            </Link>

            <Link 
              href="/dashboard/faculty/subjects" 
              className="group w-full rounded-2xl border border-slate-100 hover:border-indigo-100 bg-slate-50/50 hover:bg-white px-5 py-4 text-left flex justify-between items-center transition-all duration-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#00C2A8]/5 text-[#00C2A8] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Syllabus Resources</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Share notes, assignments, or quizzes</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#00C2A8] group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </aside>
      </div>

      {/* Assigned Subjects Roster Cards */}
      <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Subject Roster</span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">Courses You're Teaching</h2>
          </div>
          <span className="bg-indigo-50 border border-indigo-100/30 text-[#6C63FF] text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full font-['Space_Grotesk'] self-start sm:self-center">
            {subjects.length} Subjects Assigned
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <div 
              key={subject.id} 
              className="group relative bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_2px_6px_rgba(15,23,42,0.01)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(108,99,255,0.04)] hover:border-indigo-100 flex flex-col justify-between overflow-hidden min-h-[120px]"
            >
              {/* Decorative side tag */}
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)]" />
              <div className="pl-2">
                <div className="flex justify-between items-start gap-4">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#6C63FF] transition-colors">{subject.name}</h4>
                  <span className="text-[9px] font-bold font-['Space_Grotesk'] text-[#6C63FF] bg-[#6C63FF]/5 px-2 py-0.5 rounded border border-[#6C63FF]/15">
                    {subject.code}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold mt-4">Section curriculum linked course</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity Log */}
      <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] space-y-6">
        <div className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Audit Trail</span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">Recent Activity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              id: "1",
              title: "Attendance Submitted",
              description: "WT - Section A",
              time: "10 min ago",
              icon: <ClipboardList className="w-4 h-4 text-emerald-600" />,
              bg: "bg-emerald-50",
            },
            {
              id: "2",
              title: "Timetable Updated",
              description: "Weekly schedule refreshed",
              time: "2 hrs ago",
              icon: <Calendar className="w-4 h-4 text-indigo-600" />,
              bg: "bg-indigo-50",
            },
            {
              id: "3",
              title: "Subject Assigned",
              description: "Database Management Systems",
              time: "Yesterday",
              icon: <Bookmark className="w-4 h-4 text-purple-600" />,
              bg: "bg-purple-50",
            },
          ].map((activity) => (
            <div key={activity.id} className="bg-slate-50/50 border border-slate-100/50 rounded-2xl p-5 hover:bg-white transition-all duration-300 flex flex-col justify-between gap-4">
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-xl ${activity.bg} flex items-center justify-center flex-shrink-0`}>
                  {activity.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{activity.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">{activity.description}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100/40">
                <span className="text-[9px] font-bold text-slate-400 uppercase font-['Space_Grotesk'] tracking-wider">{activity.time}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
