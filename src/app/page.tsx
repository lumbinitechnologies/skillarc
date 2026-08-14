"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Sparkles, Calendar, ClipboardCheck, Briefcase, GraduationCap, 
  ArrowRight, ShieldCheck, Activity, Users, Check, AlertCircle, 
  RefreshCw, Star, ArrowUpRight, Zap, Bell, CheckCircle2 
} from "lucide-react"

export default function Home() {
  const router = useRouter()

  // Hero Sandbox States
  const [activeSandboxTab, setActiveSandboxTab] = useState<"timetable" | "attendance" | "placements">("timetable")
  const [isValidatingTimetable, setIsValidatingTimetable] = useState(false)
  const [timetableStatus, setTimetableStatus] = useState<"idle" | "validating" | "success">("idle")
  
  // Sandbox Attendance Rate state
  const [students, setStudents] = useState([
    { id: 1, name: "Aarav Sharma", present: true },
    { id: 2, name: "Nikhil Verma", present: true },
    { id: 3, name: "Sneha Reddy", present: false },
    { id: 4, name: "Ananya Iyer", present: true },
  ])

  // Sandbox Placements state
  const [jobApplications, setJobApplications] = useState<Record<string, "idle" | "applying" | "applied">>({
    google: "idle",
    microsoft: "idle",
    stripe: "idle"
  })

  // Role Showcase State
  const [activeRole, setActiveRole] = useState<"student" | "faculty" | "admin">("student")

  // Timetable Validation trigger
  const triggerValidation = () => {
    setTimetableStatus("validating")
    setTimeout(() => {
      setTimetableStatus("success")
    }, 1500)
  }

  // Toggle student presence
  const toggleStudent = (id: number) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, present: !s.present } : s))
  }

  const attendancePercentage = Math.round((students.filter(s => s.present).length / students.length) * 100)

  // Apply for job mock
  const applyJob = (key: string) => {
    setJobApplications(prev => ({ ...prev, [key]: "applying" }))
    setTimeout(() => {
      setJobApplications(prev => ({ ...prev, [key]: "applied" }))
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_15%,rgba(22,144,199,0.04),transparent_45%),radial-gradient(circle_at_90%_15%,rgba(252,132,2,0.025),transparent_40%),linear-gradient(180deg,#fbfdff,#f4f8fa)] text-slate-950 font-sans relative overflow-hidden">
      
      {/* Decorative Grid Lines backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(22,144,199,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(22,144,199,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      
      {/* Sticky Floating Glass Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-sm transition-all duration-200">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/skillarc_logo.svg" alt="SkillArc Logo" className="h-10 w-10 object-contain" />
            <span className="text-base font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">SkillArc</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#sandbox" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-[var(--primary)] transition">Sandbox</a>
            <a href="#features" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-[var(--primary)] transition">Core Modules</a>
            <a href="#roles" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-[var(--primary)] transition">User Roles</a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/auth/login")}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--primary)] px-6 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[var(--accent)] hover-button-scale"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 pt-12 pb-24 sm:px-6 lg:px-8 relative z-10">
        <div className="grid gap-16 lg:grid-cols-12 lg:items-center">
          
          {/* Left Hero Description */}
          <div className="space-y-8 lg:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/10 bg-[var(--primary)]/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--primary)] shadow-sm">
              <Sparkles size={12} className="text-[var(--secondary)] animate-bounce" />
              Academic Operations, Reimagined
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 font-['Plus_Jakarta_Sans'] leading-[1.08]">
              Manage campus grids with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">absolute</span> accuracy.
            </h1>

            <p className="max-w-xl text-base leading-8 text-slate-600">
              Stop relying on manual sheets. Automate conflict-free timetables, track student attendance, coordinate placement drives, and run analytics on a gorgeous workspace built for high-performance universities.
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => router.push("/signup")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-7 py-3.5 text-xs font-bold text-white shadow-lg shadow-[var(--primary)]/20 transition hover:bg-[var(--accent)] hover-button-scale"
              >
                Start free trial <ArrowRight size={14} />
              </button>
              <button
                onClick={() => router.push("/auth/login")}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-7 py-3.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover-button-scale"
              >
                Access platform
              </button>
            </div>

            {/* Trust badge */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-200/50">
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold">JD</div>
                <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center text-[10px] font-bold">NS</div>
                <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-400 flex items-center justify-center text-[10px] font-bold">AP</div>
              </div>
              <div className="text-xs text-slate-500">
                Loved by <strong className="text-slate-800">10,000+</strong> students, faculty members & coordinators.
              </div>
            </div>
          </div>

          {/* Right Visual Sandbox Widget - INSANE Sandbox */}
          <div id="sandbox" className="lg:col-span-7 relative flex justify-center lg:justify-end">
            
            {/* Soft decorative light flares behind sandbox */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-[var(--primary)]/10 to-[var(--secondary)]/10 rounded-[44px] blur-3xl opacity-80 pointer-events-none" />

            {/* Main Sandbox Container Card */}
            <div className="w-full max-w-[620px] rounded-[36px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_32px_96px_rgba(22,144,199,0.08)] backdrop-blur transition-all duration-300">
              
              {/* Sandbox Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Zap size={12} className="fill-[var(--primary)]" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Interactive Sandbox</span>
                </div>
                
                {/* Sandbox tabs */}
                <div className="flex gap-1.5 bg-slate-100/80 p-1 rounded-xl">
                  {[
                    { id: "timetable", label: "Timetable" },
                    { id: "attendance", label: "Attendance" },
                    { id: "placements", label: "Placements" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSandboxTab(tab.id as any)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        activeSandboxTab === tab.id
                          ? "bg-white text-[var(--primary)] shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sandbox Workspace Body */}
              <div className="min-h-[290px] flex flex-col justify-between">
                
                {/* Tab 1: Interactive Timetable Builder */}
                {activeSandboxTab === "timetable" && (
                  <div className="space-y-4 animate-[fadeIn_200ms_ease]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Section B conflict grid</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click Validate to test conflict algorithms in real-time.</p>
                      </div>
                      <button
                        onClick={triggerValidation}
                        disabled={timetableStatus === "validating"}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-[10px] font-bold text-white shadow hover:bg-[var(--accent)] transition hover-button-scale disabled:opacity-50"
                      >
                        <RefreshCw size={10} className={timetableStatus === "validating" ? "animate-spin" : ""} />
                        {timetableStatus === "validating" ? "Scanning..." : "Validate"}
                      </button>
                    </div>

                    {/* Timetable visual layout */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { day: "Mon", code: "MA-102", prof: "Dr. Roy", time: "09:00 AM", color: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20" },
                        { day: "Tue", code: "CS-301", prof: "Prof. Sen", time: "11:00 AM", color: "bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20" },
                        { day: "Wed", code: "PH-204", prof: "Dr. Rao", time: "02:00 PM", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                      ].map((item) => (
                        <div key={item.day} className={`p-3 rounded-2xl border ${item.color} space-y-2`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-65">{item.day}</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          </div>
                          <div>
                            <p className="text-xs font-bold font-['Space_Grotesk'] leading-tight">{item.code}</p>
                            <p className="text-[9px] opacity-75">{item.prof}</p>
                          </div>
                          <p className="text-[8px] font-semibold opacity-60 pt-1 border-t border-current/10">{item.time}</p>
                        </div>
                      ))}
                    </div>

                    {/* Status popup */}
                    <div className="h-12 flex items-center justify-center">
                      {timetableStatus === "idle" && (
                        <p className="text-slate-400 text-xs text-center italic">Waiting for validation trigger...</p>
                      )}
                      {timetableStatus === "validating" && (
                        <div className="flex items-center gap-2 text-slate-600 text-xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-ping" />
                          <span>Checking faculty records and hall constraints...</span>
                        </div>
                      )}
                      {timetableStatus === "success" && (
                        <div className="w-full flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 px-4 py-2.5 text-xs text-emerald-800 animate-[slideDown_150ms_ease]">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span><strong>Conflict Check:</strong> 0 overlapping slots found. Timetable is stable.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Interactive Attendance Rate Tracker */}
                {activeSandboxTab === "attendance" && (
                  <div className="space-y-4 animate-[fadeIn_200ms_ease]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Roll Call check-in</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Toggle status to observe rate metrics updates dynamically.</p>
                      </div>
                      <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-700">{attendancePercentage}% Rate</span>
                      </div>
                    </div>

                    {/* Students list and toggles */}
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                      {students.map((student) => (
                        <div
                          key={student.id}
                          onClick={() => toggleStudent(student.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                            student.present
                              ? "bg-slate-50 border-slate-200/60 hover:bg-slate-100"
                              : "bg-rose-50/50 border-rose-100 hover:bg-rose-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${student.present ? "bg-emerald-500" : "bg-rose-400"}`} />
                            <span className="text-xs font-semibold text-slate-700">{student.name}</span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            student.present
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}>
                            {student.present ? "Present" : "Absent"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Mini visual summary chart */}
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${attendancePercentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{students.filter(s => s.present).length} of {students.length} present</span>
                    </div>
                  </div>
                )}

                {/* Tab 3: Interactive Placement Board */}
                {activeSandboxTab === "placements" && (
                  <div className="space-y-4 animate-[fadeIn_200ms_ease]">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Active placements desk</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Submit mock registrations to see placement workflow transitions.</p>
                    </div>

                    {/* Jobs grid */}
                    <div className="space-y-2">
                      {[
                        { key: "google", name: "Google", role: "Software Engineering Intern", color: "from-blue-500 to-indigo-600" },
                        { key: "microsoft", name: "Microsoft", role: "Product Manager Associate", color: "from-[var(--primary)] to-[var(--accent)]" },
                        { key: "stripe", name: "Stripe", role: "Backend Developer Resident", color: "from-[var(--secondary)] to-amber-500" },
                      ].map((job) => {
                        const status = jobApplications[job.key];
                        return (
                          <div key={job.key} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800">{job.name}</span>
                                <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-semibold">Tier 1</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">{job.role}</p>
                            </div>

                            <button
                              onClick={() => applyJob(job.key)}
                              disabled={status !== "idle"}
                              className={`px-3 py-1.5 text-[9px] font-bold rounded-xl shadow transition ${
                                status === "idle"
                                  ? "bg-[var(--primary)] text-white hover:bg-[var(--accent)]"
                                  : status === "applying"
                                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                  : "bg-emerald-100 text-emerald-700 shadow-none border border-emerald-200"
                              }`}
                            >
                              {status === "idle" && "Apply"}
                              {status === "applying" && "Applying..."}
                              {status === "applied" && "✓ Applied"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sandbox Footer Info */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span>Backend: Supabase & Prisma Engine</span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live simulation connected
                  </span>
                </div>

              </div>

            </div>

            {/* Capterra Trust floating badge */}
            <div className="absolute -bottom-6 -left-6 bg-white/95 border border-slate-200/50 rounded-2xl p-3 shadow-lg flex items-center gap-3 backdrop-blur hidden sm:flex hover-card-lift">
              <div className="bg-amber-50 h-8 w-8 rounded-xl flex items-center justify-center text-amber-500">
                <Star size={14} className="fill-amber-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-900 leading-tight">5.0 Star Rating</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Top Academic Choice 2026</p>
              </div>
            </div>

          </div>

        </div>

        {/* Dynamic metrics section */}
        <section id="metrics" className="mt-28 border-t border-slate-200/50 pt-16">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] bg-[var(--primary)]/5 px-3 py-1 rounded-full">LMS Benchmarks</span>
            <h3 className="text-2xl font-bold tracking-tight text-slate-800 mt-3 font-['Plus_Jakarta_Sans']">Measurable institution benefits</h3>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
            {[
              { val: "99.9%", label: "System Uptime", sub: "Redundant cloud database" },
              { val: "0 Overlaps", label: "Timetable validation", sub: "Department conflict engine" },
              { val: "50+ Active", label: "Colleges onboarded", sub: "Trusted across branches" },
              { val: "10x Faster", label: "Reroutings completed", sub: "Immediate student notification" },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk'] text-[var(--primary)] leading-none">{stat.val}</p>
                <p className="text-xs font-bold text-slate-800 font-['Plus_Jakarta_Sans'] pt-1">{stat.label}</p>
                <p className="text-[10px] text-slate-400">{stat.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Grid with Lift Hover animations */}
        <section id="features" className="mt-32 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">Full Integration</span>
            <h2 className="text-3xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight text-slate-900">One dashboard. Absolute control.</h2>
            <p className="text-xs leading-relaxed text-slate-500">Every module hooks into the database. Updates to timetables instantly reschedule classes and notify faculty.</p>
          </div>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Timetable Conflict Guard",
                desc: "Automatic verification checks to prevent double-booking faculty members or lecture halls across classes.",
                icon: <Calendar size={20} className="text-[var(--primary)]" />,
                bg: "bg-[var(--primary)]/[0.04]",
              },
              {
                title: "Roll Call Check-in",
                desc: "Mark student presence with subject-wise analytics. Automates warning alerts for attendance below thresholds.",
                icon: <ClipboardCheck size={20} className="text-emerald-600" />,
                bg: "bg-emerald-50",
              },
              {
                title: "Placement Registry",
                desc: "Drive job applications, list matching credentials, review applicant grids, and log final stats.",
                icon: <Briefcase size={20} className="text-[var(--secondary)]" />,
                bg: "bg-[var(--secondary)]/[0.04]",
              },
              {
                title: "Subject Syllabus Hub",
                desc: "Centralized workspace for assignments, performance logs, class resource sheets, and announcements.",
                icon: <GraduationCap size={20} className="text-violet-600" />,
                bg: "bg-violet-50",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.01)] hover-card-lift"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} mb-6`}>
                  {item.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">{item.title}</h3>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roles tabbed showcase panel */}
        <section id="roles" className="mt-32 border-t border-slate-200/50 pt-20">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Roles control tab list */}
            <div className="space-y-8 lg:col-span-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">Target Experiences</span>
                <h2 className="text-3xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight text-slate-900 mt-2">Tailored dashboard interfaces</h2>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">Choose a workspace role below to see customized values. The login redirects users to specialized views instantly.</p>
              </div>

              {/* Roles selectors */}
              <div className="flex flex-col gap-2.5">
                {[
                  { id: "student", label: "Students & Parents", desc: "Timetables, grades, task lists and progress trackers." },
                  { id: "faculty", label: "Faculty & Tutors", desc: "Manage classes, check-in attendance, and syllabus schedules." },
                  { id: "admin", label: "Institution Admin", desc: "Integrate billing, create course grids, and supervise branches." },
                ].map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setActiveRole(role.id as any)}
                    className={`flex items-start gap-4 p-4 rounded-2xl text-left transition ${
                      activeRole === role.id
                        ? "bg-white border border-slate-200/80 shadow-md"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                      activeRole === role.id ? "bg-[var(--primary)] text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                      {role.id === "student" && <Users size={14} />}
                      {role.id === "faculty" && <Calendar size={14} />}
                      {role.id === "admin" && <ShieldCheck size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 font-['Plus_Jakarta_Sans']">{role.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{role.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom interactive dashboard preview mockup matching the selected role */}
            <div className="lg:col-span-7 relative flex justify-center lg:justify-end">
              <div className="absolute -inset-4 bg-gradient-to-tr from-[var(--primary)]/10 to-[var(--secondary)]/10 rounded-[44px] blur-3xl opacity-60 pointer-events-none" />
              
              <div className="w-full max-w-[580px] rounded-[32px] border border-white/90 bg-white/70 p-4 shadow-[0_24px_64px_rgba(22,144,199,0.06)] backdrop-blur">
                <div className="rounded-2xl border border-slate-200/50 bg-white p-5 space-y-4">
                  
                  {/* Mock Shell Title bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold text-[9px]">S</div>
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                        {activeRole === "student" && "Student Workspace"}
                        {activeRole === "faculty" && "Faculty Console"}
                        {activeRole === "admin" && "Administrative Suite"}
                      </span>
                    </div>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </div>

                  {/* Mock content specific to the selected role */}
                  {activeRole === "student" && (
                    <div className="space-y-3 animate-[fadeIn_200ms_ease]">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Pending Task</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">Algorithms Lab Assignment</p>
                        </div>
                        <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-full">Due Today</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-[var(--primary)]/[0.03] border border-[var(--primary)]/15">
                          <p className="text-[10px] text-slate-400 font-semibold">Attendance Avg</p>
                          <p className="text-xl font-bold font-['Space_Grotesk'] text-[var(--primary)] mt-1">94%</p>
                        </div>
                        <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-100">
                          <p className="text-[10px] text-slate-400 font-semibold">GPA Target</p>
                          <p className="text-xl font-bold font-['Space_Grotesk'] text-violet-700 mt-1">3.92</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeRole === "faculty" && (
                    <div className="space-y-3 animate-[fadeIn_200ms_ease]">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Active Class</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">Software Engineering - Lecture Hall B</p>
                        </div>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">Ongoing</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500">Student Sign-ins</span>
                          <span className="font-bold text-slate-700">42 / 45 checked in</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: "93%" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeRole === "admin" && (
                    <div className="space-y-3 animate-[fadeIn_200ms_ease]">
                      <div className="p-3 rounded-xl bg-[var(--primary)]/[0.03] border border-[var(--primary)]/15">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Branches Supervised</p>
                        <p className="text-base font-bold text-slate-700 mt-0.5">6 Departments across 2 Campuses</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Open Placements</p>
                          <p className="text-lg font-bold font-['Space_Grotesk'] text-slate-800 mt-1">12 Active</p>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Pending Invoices</p>
                          <p className="text-lg font-bold font-['Space_Grotesk'] text-slate-800 mt-1">0 Overdue</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sandbox CTA */}
                  <button
                    onClick={() => router.push("/auth/login")}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-[10px] font-bold text-white shadow transition hover:bg-slate-800 hover-button-scale"
                  >
                    Open live dashboard <ArrowUpRight size={10} />
                  </button>

                </div>
              </div>

            </div>

          </div>

        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 bg-slate-50/50 py-16 text-center text-xs text-slate-500 relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex justify-center items-center gap-2">
            <img src="/skillarc_logo.svg" alt="SkillArc Logo" className="h-7 w-7 object-contain" />
            <span className="text-sm font-bold tracking-tight text-slate-800 font-['Plus_Jakarta_Sans']">SkillArc</span>
          </div>
          <nav className="flex justify-center gap-8 text-[11px] font-semibold">
            <a href="#sandbox" className="hover:text-slate-800 transition">Sandbox</a>
            <a href="#features" className="hover:text-slate-800 transition">Features</a>
            <a href="#roles" className="hover:text-slate-800 transition">Roles</a>
            <a href="/auth/login" className="hover:text-slate-800 transition">Sign In</a>
          </nav>
          <p>© {new Date().getFullYear()} SkillArc Academic LMS. Crafted with premium operational clarity.</p>
        </div>
      </footer>

    </div>
  )
}
