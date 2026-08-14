"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, Award, UserCheck, Mail, Calendar, ChevronRight, Phone, Users, Info } from "lucide-react"

interface Subject {
  id: string
  name: string
  code: string
  facultyName: string
}

interface Child {
  id: string
  relationship: string
  name: string
  email: string
  phone: string
  registration_number: string
  semester: number | null
  sectionName: string
  programName: string
  advisorName: string
  advisorEmail: string
  advisorPhone: string
  subjects: Subject[]
  schedule: Array<{
    day: string
    period: number
    subjectName: string
    subjectCode: string
    facultyName: string
  }>
  attendance: {
    rate: number
    total: number
    present: number
    absent: number
    late: number
  }
}

export default function ParentDashboardClient({
  parent,
  childrenList = [],
}: {
  parent: { name: string; email: string; institution: string }
  childrenList: Child[]
}) {
  const router = useRouter()
  const [selectedChildIndex, setSelectedChildIndex] = useState(0)

  const child = childrenList[selectedChildIndex]

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" })
  const todaySchedule = child?.schedule ? child.schedule.filter(s => s.day === todayName) : []
  const weeklySchedule = child?.schedule ? child.schedule.filter(s => s.day !== todayName).slice(0, 5) : []

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 pt-6 font-sans antialiased">
      {/* Background soft mesh gradients */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-indigo-200/50 blur-[120px]" />
        <div className="absolute top-[40%] right-[10%] w-[350px] h-[350px] rounded-full bg-violet-200/50 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-teal-100/50 blur-[130px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Welcome Section */}
        <section className="rounded-[28px] border border-slate-200/60 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.04)] backdrop-blur-xl transition duration-300">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200/30">
                <span className="text-2xl">👨‍👩‍👧</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-600 font-mono">Parent Console</p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 font-display">
                  Good Evening, {parent.name} 👋
                </h1>
                <p className="mt-1 text-sm text-slate-500">{parent.institution} · {parent.email}</p>
              </div>
            </div>
            
            {/* Child Switcher Dropdown */}
            {childrenList.length > 1 && (
              <div className="flex flex-col gap-1.5 shrink-0">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Switch Student View</label>
                <select
                  value={selectedChildIndex}
                  onChange={(e) => setSelectedChildIndex(Number(e.target.value))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-indigo-400 focus:border-indigo-500"
                >
                  {childrenList.map((c, idx) => (
                    <option key={c.id} value={idx}>
                      {c.name} ({c.registration_number})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {childrenList.length === 0 ? (
          /* Empty / No Children State */
          <section className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
              <Users size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No student records linked</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Your parent profile is not linked to any student registration numbers yet. Please reach out to the college administration or faculty advisor with your child's details to activate link.
            </p>
          </section>
        ) : (
          /* Active Child Dashboard Details */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Info Badges Header for Selected Child */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-slate-100/60 p-4 border border-slate-200/40">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  {child.relationship}
                </span>
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  Currently Viewing: {child.name}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-xl bg-white px-3 py-1.5 border shadow-sm">USN: {child.registration_number}</span>
                <span className="rounded-xl bg-white px-3 py-1.5 border shadow-sm">Prog: {child.programName}</span>
                <span className="rounded-xl bg-white px-3 py-1.5 border shadow-sm">Section: {child.sectionName} (Sem {child.semester ?? '—'})</span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Attendance Metric */}
              <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200">
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                    <UserCheck size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">Real-time</span>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950 font-mono">{child.attendance.rate}%</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">Attendance Rate</p>
                <p className="mt-2 text-xs text-slate-400">
                  Attended {child.attendance.present + child.attendance.late} of {child.attendance.total} total sessions
                </p>
              </div>

              {/* CGPA / Academic Standing */}
              <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200">
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <Award size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">Standing</span>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950 font-mono">Active</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">Academic Standing</p>
                <p className="mt-2 text-xs text-slate-400">Admitted in Year {child.semester ? 'Sem ' + child.semester : '—'}</p>
              </div>

              {/* Enrolled Courses */}
              <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-200">
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                    <BookOpen size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">Courses</span>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950 font-mono">{child.subjects.length}</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">Enrolled Subjects</p>
                <p className="mt-2 text-xs text-slate-400">Assigned course units for current term</p>
              </div>
            </div>

            {/* Split Schedule & Courses Content */}
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              
              {/* Timetable Section */}
              <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 font-display">Daily Class Timetable</h2>
                    <p className="text-xs text-slate-400">Hourly lecture calendar for the section</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Today is {todayName}
                  </span>
                </div>

                <div className="space-y-4">
                  {todaySchedule.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Today's Schedule</p>
                      {todaySchedule.map((session, idx) => (
                        <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 hover:border-indigo-200 transition duration-200">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{session.subjectCode} · {session.subjectName}</p>
                              <p className="mt-1 text-xs text-slate-500">Faculty: {session.facultyName}</p>
                            </div>
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 border shadow-sm">
                              <Calendar size={13} className="text-slate-400" /> Period {session.period}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed p-6 text-center text-xs text-slate-400 bg-slate-50/30">
                      No active sessions listed on the schedule for today.
                    </div>
                  )}

                  {weeklySchedule.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Weekly Calendar Overview</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {weeklySchedule.map((session, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-100 bg-white p-3 text-xs">
                            <span className="font-bold text-indigo-600">{session.day} (P{session.period})</span>
                            <p className="mt-1 font-semibold text-slate-800 truncate">{session.subjectName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{session.facultyName}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Course Overview & Advisor Section */}
              <div className="space-y-6">
                
                {/* Advisor Contact Card */}
                <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-sm space-y-4">
                  <h3 className="text-md font-bold text-slate-900 font-display">Faculty Section Advisor</h3>
                  <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100 flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-[#6C63FF] font-bold">
                      {child.advisorName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{child.advisorName}</h4>
                      <p className="text-xs text-slate-500">Mentor & Counselor</p>
                      
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        {child.advisorEmail && (
                          <a href={`mailto:${child.advisorEmail}`} className="flex items-center gap-1.5 hover:text-indigo-600 transition">
                            <Mail size={12} className="text-slate-400" /> {child.advisorEmail}
                          </a>
                        )}
                        {child.advisorPhone && (
                          <a href={`tel:${child.advisorPhone}`} className="flex items-center gap-1.5 hover:text-indigo-600 transition">
                            <Phone size={12} className="text-slate-400" /> {child.advisorPhone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Course List Card */}
                <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-sm space-y-4">
                  <h3 className="text-md font-bold text-slate-900 font-display">Course Overview</h3>
                  <div className="grid gap-3">
                    {child.subjects.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-6 text-center text-xs text-slate-400 bg-slate-50/30">
                        No subject configurations found for this semester.
                      </div>
                    ) : (
                      child.subjects.map((subject) => (
                        <div key={subject.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 flex items-center justify-between gap-3 hover:border-indigo-100 transition duration-200">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{subject.name}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{subject.code} · Faculty: {subject.facultyName}</p>
                          </div>
                          <ChevronRight size={14} className="text-slate-400 shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                </section>

              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
