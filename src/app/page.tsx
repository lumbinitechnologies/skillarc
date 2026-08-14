"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar, ClipboardCheck, Briefcase, GraduationCap,
  ArrowRight, ShieldCheck, Users, RefreshCw, CheckCircle2,
  ArrowUpRight, BookOpen,
} from "lucide-react"

// ── Token system ────────────────────────────────────────────────────────
// canvas   #F5F5F7  Apple-grey page background
// panel    #FFFFFF  card / glass base
// ink      #1D1D1F  near-black text
// muted    #6E6E73  secondary text
// blue     #0071E3  primary action (system blue)
// teal     #0A7B6C  timetable thread
// amber    #C77F26  attendance thread
// rose     #C1443A  placements thread

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", ui-sans-serif, system-ui, sans-serif'

const threads = {
  timetable: { solid: "#0A7B6C", soft: "rgba(10,123,108,0.10)" },
  attendance: { solid: "#C77F26", soft: "rgba(199,127,38,0.10)" },
  placements: { solid: "#C1443A", soft: "rgba(193,68,58,0.10)" },
} as const

/* ── Scroll-reveal wrapper ─────────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(28px)",
        transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  )
}

export default function Home() {
  const router = useRouter()

  const tabOrder = ["timetable", "attendance", "placements"] as const
  const [activeSandboxTab, setActiveSandboxTab] = useState<(typeof tabOrder)[number]>("timetable")
  const [timetableStatus, setTimetableStatus] = useState<"idle" | "validating" | "success">("idle")

  const [students, setStudents] = useState([
    { id: 1, roll: "07A", name: "Aarav Sharma", present: true },
    { id: 2, roll: "12A", name: "Nikhil Verma", present: true },
    { id: 3, roll: "18B", name: "Sneha Reddy", present: false },
    { id: 4, roll: "23B", name: "Ananya Iyer", present: true },
  ])

  const [jobApplications, setJobApplications] = useState<Record<string, "idle" | "applying" | "applied">>({
    google: "idle",
    microsoft: "idle",
    stripe: "idle",
  })

  const [activeRole, setActiveRole] = useState<"student" | "faculty" | "admin">("student")

  const triggerValidation = () => {
    setTimetableStatus("validating")
    setTimeout(() => setTimetableStatus("success"), 1400)
  }

  const toggleStudent = (id: number) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, present: !s.present } : s)))
  }

  const attendancePercentage = Math.round((students.filter((s) => s.present).length / students.length) * 100)

  const applyJob = (key: string) => {
    setJobApplications((prev) => ({ ...prev, [key]: "applying" }))
    setTimeout(() => setJobApplications((prev) => ({ ...prev, [key]: "applied" })), 900)
  }

  const tabIndex = tabOrder.indexOf(activeSandboxTab)

  return (
    <div
      className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] antialiased overflow-x-hidden"
      style={{ fontFamily: FONT_STACK }}
    >
      <style>{`
        @keyframes drift {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(30px, -40px) scale(1.06); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes drift-slow {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(-40px, 30px) scale(1.08); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-120%) skewX(-12deg); }
          100% { transform: translateX(220%) skewX(-12deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .blob-a { animation: drift 16s ease-in-out infinite; }
        .blob-b { animation: drift-slow 20s ease-in-out infinite; }
        .blob-c { animation: drift 24s ease-in-out infinite reverse; }
        .btn-shine::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent);
          transform: translateX(-120%) skewX(-12deg);
          transition: transform 0.1s;
        }
        .btn-shine:hover::after { animation: shimmer 1.1s ease forwards; }
        .press { transition: transform 0.15s cubic-bezier(0.16,1,0.3,1); }
        .press:active { transform: scale(0.96); }
        @media (prefers-reduced-motion: reduce) {
          .blob-a, .blob-b, .blob-c { animation: none !important; }
          * { scroll-behavior: auto !important; }
        }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ── Ambient background blobs ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="blob-a absolute -top-24 left-[8%] h-[420px] w-[420px] rounded-full bg-[#0071E3]/20 blur-[110px]" />
        <div className="blob-b absolute top-[30%] right-[4%] h-[380px] w-[380px] rounded-full bg-[#C77F26]/14 blur-[110px]" />
        <div className="blob-c absolute bottom-[-10%] left-[30%] h-[460px] w-[460px] rounded-full bg-[#0A7B6C]/14 blur-[120px]" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/70 backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <img src="/skillarc_logo.svg" alt="SkillArc" className="h-7 w-7 object-contain" />
            <span className="text-[15px] font-semibold tracking-tight">SkillArc</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#1D1D1F]/70">
            <a href="#sandbox" className="hover:text-[#1D1D1F] transition-colors duration-200">Sandbox</a>
            <a href="#features" className="hover:text-[#1D1D1F] transition-colors duration-200">Modules</a>
            <a href="#roles" className="hover:text-[#1D1D1F] transition-colors duration-200">Roles</a>
          </nav>

          <button
            onClick={() => router.push("/auth/login")}
            className="press relative overflow-hidden rounded-full bg-[#1D1D1F] px-4 py-2 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-[#000000]"
          >
            Sign in
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pt-16 pb-24 sm:px-8">
        <div className="grid gap-16 lg:grid-cols-12 lg:items-center">
          {/* ── Hero copy ── */}
          <Reveal className="space-y-6 lg:col-span-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3.5 py-1.5 text-[11px] font-medium text-[#0071E3] ring-1 ring-black/[0.06] backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0071E3]" />
              Now live across 41 campuses
            </p>

            <h1 className="text-[2.75rem] sm:text-[3.4rem] font-semibold tracking-[-0.03em] leading-[1.05]">
              Campus operations,
              <br />
              <span className="bg-gradient-to-r from-[#0071E3] via-[#0A7B6C] to-[#C77F26] bg-clip-text text-transparent">
                finally effortless.
              </span>
            </h1>

            <p className="max-w-xl text-[16px] leading-7 text-[#1D1D1F]/60">
              Timetables that catch their own conflicts. Attendance that updates the moment a name is marked.
              Placement drives followed from application to offer. One system, three teams, zero spreadsheets.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => router.push("/signup")}
                className="btn-shine press relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-full bg-[#0071E3] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,113,227,0.6)] transition-all duration-300 hover:shadow-[0_12px_32px_-8px_rgba(0,113,227,0.75)] hover:-translate-y-0.5"
              >
                Start free trial <ArrowRight size={15} />
              </button>
              <a
                href="#sandbox"
                className="press inline-flex items-center justify-center rounded-full bg-white/60 px-6 py-3.5 text-[14px] font-semibold text-[#1D1D1F] ring-1 ring-black/[0.08] backdrop-blur-xl transition-all duration-300 hover:bg-white/90"
              >
                Try the sandbox
              </a>
            </div>

            <p className="text-[12px] text-[#1D1D1F]/45 pt-3">
              6,204 students &nbsp;·&nbsp; 312 faculty &nbsp;·&nbsp; 41 institutions signed in this term
            </p>
          </Reveal>

          {/* ── Sandbox: glass console ── */}
          <Reveal delay={150} className="lg:col-span-7">
            <div className="relative rounded-[28px] bg-white/55 p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)] ring-1 ring-black/[0.06] backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-500 hover:-translate-y-1">
              <div className="rounded-[22px] bg-white/70 p-5 ring-1 ring-white/60">
                {/* segmented control */}
                <div className="relative grid grid-cols-3 rounded-full bg-black/[0.05] p-1 mb-5">
                  <div
                    className="absolute inset-y-1 left-1 w-[calc(33.333%-4px)] rounded-full bg-white shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ transform: `translateX(${tabIndex * 100}%)` }}
                  />
                  {([
                    { id: "timetable", label: "Timetable" },
                    { id: "attendance", label: "Attendance" },
                    { id: "placements", label: "Placements" },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSandboxTab(tab.id)}
                      className="relative z-10 flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold transition-colors duration-300"
                      style={{ color: activeSandboxTab === tab.id ? threads[tab.id].solid : "rgba(29,29,31,0.45)" }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="min-h-[300px] flex flex-col justify-between">
                  {/* Tab 1: Timetable */}
                  {activeSandboxTab === "timetable" && (
                    <div className="space-y-4" style={{ animation: "fade-in 0.5s ease" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-[14px] font-semibold">Section B, conflict grid</h4>
                          <p className="text-[12px] text-[#1D1D1F]/45 mt-0.5">Run the conflict check against faculty and hall bookings.</p>
                        </div>
                        <button
                          onClick={triggerValidation}
                          disabled={timetableStatus === "validating"}
                          className="press shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[11px] font-semibold text-[#1D1D1F] ring-1 ring-black/[0.08] shadow-sm transition-all duration-300 hover:shadow-md disabled:opacity-50"
                        >
                          <RefreshCw size={11} className={timetableStatus === "validating" ? "animate-spin" : ""} />
                          {timetableStatus === "validating" ? "Checking" : "Validate"}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { day: "Mon", code: "MA-102", prof: "Dr. Roy", time: "09:00" },
                          { day: "Tue", code: "CS-301", prof: "Prof. Sen", time: "11:00" },
                          { day: "Wed", code: "PH-204", prof: "Dr. Rao", time: "14:00" },
                        ].map((item) => (
                          <div
                            key={item.day}
                            className="rounded-2xl bg-white/80 p-3 ring-1 ring-black/[0.05] transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-semibold uppercase tracking-widest text-[#1D1D1F]/40">{item.day}</span>
                              <span className="text-[9px] text-[#1D1D1F]/35">{item.time}</span>
                            </div>
                            <p className="text-[13px] font-semibold leading-tight mt-1.5">{item.code}</p>
                            <p className="text-[10px] text-[#1D1D1F]/50 mt-0.5">{item.prof}</p>
                          </div>
                        ))}
                      </div>

                      <div className="h-12 flex items-center">
                        {timetableStatus === "idle" && (
                          <p className="text-[#1D1D1F]/35 text-[12px]">Waiting for validation — tap Validate above.</p>
                        )}
                        {timetableStatus === "validating" && (
                          <div className="flex items-center gap-2 text-[#1D1D1F]/60 text-[12px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#0071E3] animate-pulse" />
                            Checking faculty records and hall constraints…
                          </div>
                        )}
                        {timetableStatus === "success" && (
                          <div
                            className="w-full flex items-center gap-2.5 rounded-2xl bg-[#0A7B6C]/10 px-3.5 py-2.5 text-[12px] text-[#0A7B6C] font-medium ring-1 ring-[#0A7B6C]/15"
                            style={{ animation: "fade-in 0.4s ease" }}
                          >
                            <CheckCircle2 size={14} className="shrink-0" />
                            0 overlapping slots found — timetable is stable.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Attendance */}
                  {activeSandboxTab === "attendance" && (
                    <div className="space-y-4" style={{ animation: "fade-in 0.5s ease" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[14px] font-semibold">Roll call, Period 3</h4>
                          <p className="text-[12px] text-[#1D1D1F]/45 mt-0.5">Tap a row to mark present or absent.</p>
                        </div>
                        <span className="text-[13px] font-semibold text-[#C77F26]">{attendancePercentage}%</span>
                      </div>

                      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                        {students.map((student) => (
                          <div
                            key={student.id}
                            onClick={() => toggleStudent(student.id)}
                            className="press flex items-center justify-between rounded-2xl bg-white/80 p-3 ring-1 ring-black/[0.05] cursor-pointer transition-all duration-200 hover:bg-white hover:shadow-sm"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-[9px] text-[#1D1D1F]/35 font-medium">{student.roll}</span>
                              <span className="text-[12.5px] font-medium">{student.name}</span>
                            </div>
                            <span
                              className="h-6 w-6 flex items-center justify-center rounded-full text-[10px] font-semibold transition-colors duration-300"
                              style={{
                                background: student.present ? "rgba(10,123,108,0.12)" : "rgba(193,68,58,0.12)",
                                color: student.present ? "#0A7B6C" : "#C1443A",
                              }}
                            >
                              {student.present ? "P" : "A"}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#C77F26] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                            style={{ width: `${attendancePercentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#1D1D1F]/45 whitespace-nowrap">
                          {students.filter((s) => s.present).length}/{students.length} present
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Placements */}
                  {activeSandboxTab === "placements" && (
                    <div className="space-y-4" style={{ animation: "fade-in 0.5s ease" }}>
                      <div>
                        <h4 className="text-[14px] font-semibold">Active placements desk</h4>
                        <p className="text-[12px] text-[#1D1D1F]/45 mt-0.5">Submit a mock application to see the status change.</p>
                      </div>

                      <div className="space-y-2">
                        {[
                          { key: "google", name: "Google", role: "Software Engineering Intern", code: "REC-014" },
                          { key: "microsoft", name: "Microsoft", role: "Product Manager Associate", code: "REC-021" },
                          { key: "stripe", name: "Stripe", role: "Backend Developer Resident", code: "REC-033" },
                        ].map((job) => {
                          const status = jobApplications[job.key]
                          return (
                            <div
                              key={job.key}
                              className="flex items-center justify-between rounded-2xl bg-white/80 p-3 ring-1 ring-black/[0.05] transition-shadow duration-300 hover:shadow-sm"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12.5px] font-semibold">{job.name}</span>
                                  <span className="text-[9px] text-[#1D1D1F]/35">{job.code}</span>
                                </div>
                                <p className="text-[10.5px] text-[#1D1D1F]/50 mt-0.5">{job.role}</p>
                              </div>
                              <button
                                onClick={() => applyJob(job.key)}
                                disabled={status !== "idle"}
                                className="press px-3.5 py-1.5 text-[10px] font-semibold rounded-full transition-all duration-300"
                                style={{
                                  background: status === "idle" ? "#1D1D1F" : status === "applied" ? "rgba(10,123,108,0.12)" : "rgba(0,0,0,0.05)",
                                  color: status === "idle" ? "#fff" : status === "applied" ? "#0A7B6C" : "#1D1D1F",
                                }}
                              >
                                {status === "idle" && "Apply"}
                                {status === "applying" && "Sending…"}
                                {status === "applied" && "Applied ✓"}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center justify-between text-[10px] text-[#1D1D1F]/35">
                    <span>Supabase · Prisma engine</span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0A7B6C] animate-pulse" />
                      Live simulation
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ── Metrics ── */}
        <section id="metrics" className="mt-32">
          <Reveal className="flex items-baseline justify-between mb-8 flex-wrap gap-2">
            <h3 className="text-[26px] font-semibold tracking-tight">This term, in numbers</h3>
            <span className="text-[11px] text-[#1D1D1F]/40">Updated live</span>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { val: "99.9%", label: "System uptime", sub: "Redundant cloud database" },
              { val: "0", label: "Timetable overlaps", sub: "Caught by the conflict engine" },
              { val: "50+", label: "Colleges onboarded", sub: "Across active branches" },
              { val: "10×", label: "Faster reroutings", sub: "Students notified instantly" },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80}>
                <div className="h-full rounded-3xl bg-white/60 p-5 ring-1 ring-black/[0.06] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:bg-white/85">
                  <p className="text-[32px] font-semibold text-[#0071E3] leading-none tracking-tight">{stat.val}</p>
                  <p className="text-[13px] font-semibold mt-3">{stat.label}</p>
                  <p className="text-[11px] text-[#1D1D1F]/45 mt-1">{stat.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Feature catalog ── */}
        <section id="features" className="mt-32 space-y-10">
          <Reveal className="max-w-2xl space-y-2.5">
            <p className="text-[12px] font-semibold text-[#0071E3] uppercase tracking-wide">Catalog</p>
            <h2 className="text-[30px] font-semibold tracking-tight">Four modules, one database.</h2>
            <p className="text-[14px] text-[#1D1D1F]/55 leading-relaxed">
              A change to a timetable reschedules the class, notifies faculty, and updates every dependent record — nothing gets re-entered twice.
            </p>
          </Reveal>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Timetable conflict guard", desc: "Automatic checks that stop faculty or halls from being double-booked across sections.", icon: <Calendar size={17} />, color: "#0A7B6C" },
              { title: "Roll call check-in", desc: "Mark presence with subject-wise analytics and automatic alerts below the attendance threshold.", icon: <ClipboardCheck size={17} />, color: "#C77F26" },
              { title: "Placement registry", desc: "Run job drives, match credentials, review applicant grids, and log final placement stats.", icon: <Briefcase size={17} />, color: "#C1443A" },
              { title: "Syllabus hub", desc: "One workspace per subject for assignments, performance logs, resources, and announcements.", icon: <GraduationCap size={17} />, color: "#0071E3" },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 90}>
                <div className="group relative h-full overflow-hidden rounded-3xl bg-white/60 p-6 ring-1 ring-black/[0.06] backdrop-blur-xl transition-all duration-400 hover:-translate-y-1.5 hover:shadow-xl hover:bg-white/90">
                  <div
                    className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl transition-transform duration-400 group-hover:scale-110"
                    style={{ background: `${item.color}14`, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <h3 className="text-[14px] font-semibold">{item.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#1D1D1F]/55">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Roles ── */}
        <section id="roles" className="mt-32">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
            <Reveal className="space-y-7 lg:col-span-5">
              <div className="space-y-2.5">
                <p className="text-[12px] font-semibold text-[#0071E3] uppercase tracking-wide">Access</p>
                <h2 className="text-[30px] font-semibold tracking-tight">Three roles, one sign-in.</h2>
                <p className="text-[14px] text-[#1D1D1F]/55 leading-relaxed">Pick a card to preview what that role sees the moment they sign in.</p>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { id: "student", label: "Students & parents", desc: "Timetables, grades, task lists, progress.", color: "#0071E3", icon: <Users size={15} /> },
                  { id: "faculty", label: "Faculty & tutors", desc: "Classes, attendance, syllabus schedules.", color: "#C77F26", icon: <BookOpen size={15} /> },
                  { id: "admin", label: "Institution admin", desc: "Billing, course grids, branch oversight.", color: "#C1443A", icon: <ShieldCheck size={15} /> },
                ].map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setActiveRole(role.id as any)}
                    className="press flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-300"
                    style={{
                      background: activeRole === role.id ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)",
                      boxShadow: activeRole === role.id ? "0 8px 24px -12px rgba(0,0,0,0.2)" : "none",
                      outline: activeRole === role.id ? `1px solid ${role.color}33` : "1px solid rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300"
                      style={{ background: `${role.color}14`, color: role.color }}
                    >
                      {role.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold">{role.label}</p>
                      <p className="text-[11px] text-[#1D1D1F]/45 mt-0.5">{role.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Reveal>

            <Reveal delay={150} className="lg:col-span-7">
              <div className="rounded-[28px] bg-white/55 p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.2)] ring-1 ring-black/[0.06] backdrop-blur-2xl">
                <div className="rounded-[22px] bg-white/70 p-6 ring-1 ring-white/60">
                  <div className="flex items-center justify-between border-b border-black/[0.05] pb-4 mb-5">
                    <span className="text-[12px] font-semibold">
                      {activeRole === "student" ? "Student workspace" : activeRole === "faculty" ? "Faculty console" : "Administrative suite"}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-[#0A7B6C] animate-pulse" />
                  </div>

                  {activeRole === "student" && (
                    <div className="space-y-3" style={{ animation: "fade-in 0.4s ease" }}>
                      <div className="p-3.5 rounded-2xl bg-black/[0.03] flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-[#1D1D1F]/40 font-medium uppercase">Pending task</p>
                          <p className="text-[13px] font-semibold mt-0.5">Algorithms lab assignment</p>
                        </div>
                        <span className="text-[9px] font-semibold text-[#C1443A] bg-[#C1443A]/10 rounded-full px-2.5 py-1">Due today</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-black/[0.03]">
                          <p className="text-[9px] text-[#1D1D1F]/40 font-medium uppercase">Attendance</p>
                          <p className="text-[22px] font-semibold text-[#0A7B6C] mt-1">94%</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-black/[0.03]">
                          <p className="text-[9px] text-[#1D1D1F]/40 font-medium uppercase">GPA target</p>
                          <p className="text-[22px] font-semibold mt-1">3.92</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeRole === "faculty" && (
                    <div className="space-y-3" style={{ animation: "fade-in 0.4s ease" }}>
                      <div className="p-3.5 rounded-2xl bg-black/[0.03] flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-[#1D1D1F]/40 font-medium uppercase">Active class</p>
                          <p className="text-[13px] font-semibold mt-0.5">Software Engineering — Hall B</p>
                        </div>
                        <span className="text-[9px] font-semibold text-[#0A7B6C] bg-[#0A7B6C]/10 rounded-full px-2.5 py-1">Ongoing</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-black/[0.03] space-y-2">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#1D1D1F]/50">Student sign-ins</span>
                          <span className="font-semibold">42 / 45 checked in</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-[#0A7B6C] transition-all duration-700" style={{ width: "93%" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeRole === "admin" && (
                    <div className="space-y-3" style={{ animation: "fade-in 0.4s ease" }}>
                      <div className="p-3.5 rounded-2xl bg-black/[0.03]">
                        <p className="text-[9px] text-[#1D1D1F]/40 font-medium uppercase">Branches supervised</p>
                        <p className="text-[14px] font-semibold mt-0.5">6 departments across 2 campuses</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-black/[0.03]">
                          <p className="text-[9px] text-[#1D1D1F]/40 font-medium uppercase">Open placements</p>
                          <p className="text-[18px] font-semibold mt-1">12 active</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-black/[0.03]">
                          <p className="text-[9px] text-[#1D1D1F]/40 font-medium uppercase">Pending invoices</p>
                          <p className="text-[18px] font-semibold mt-1">0 overdue</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => router.push("/auth/login")}
                    className="btn-shine press relative overflow-hidden w-full mt-5 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1D1D1F] py-3 text-[12.5px] font-semibold text-white transition-all duration-300 hover:bg-black"
                  >
                    Open live dashboard <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-black/[0.06] py-14 text-center">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 space-y-5">
          <div className="flex justify-center items-center gap-2">
            <img src="/skillarc_logo.svg" alt="SkillArc" className="h-6 w-6 object-contain" />
            <span className="text-[14px] font-semibold">SkillArc</span>
          </div>
          <nav className="flex justify-center gap-8 text-[12px] font-medium text-[#1D1D1F]/50">
            <a href="#sandbox" className="hover:text-[#1D1D1F] transition-colors duration-200">Sandbox</a>
            <a href="#features" className="hover:text-[#1D1D1F] transition-colors duration-200">Modules</a>
            <a href="#roles" className="hover:text-[#1D1D1F] transition-colors duration-200">Roles</a>
            <a href="/auth/login" className="hover:text-[#1D1D1F] transition-colors duration-200">Sign in</a>
          </nav>
          <p className="text-[11px] text-[#1D1D1F]/35">© {new Date().getFullYear()} SkillArc Academic LMS.</p>
        </div>
      </footer>
    </div>
  )
}