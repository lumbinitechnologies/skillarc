"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Building2, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Mail, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  ChevronRight, 
  CheckCircle2, 
  X
} from "lucide-react"
import { ROLES } from "@/constants/roles"
import gsap from "gsap"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Institution { id: string; name: string; domain: string | null }
interface Stats { 
  faculty: number
  students: number
  parents: number
  departments: number
  programs: number
  sections: number
  courses: number
}
interface TimetableSlot {
  id: string
  day: string
  period: number
  subject?: { id: string; name: string; code: string }
  department?: { id: string; name: string }
  faculty?: { id: string; name: string }
  section?: { id: string; name: string }
}
interface Period {
  period_number: number
  start_time: string
  end_time: string
}
interface Event {
  id: string
  title: string
  description: string | null
  start_time: string
  location: string | null
}
interface Activity {
  id: string
  action: string
  entity_type: string
  created_at: string
  user_name: string
  user_email: string
}

const DEFAULT_PERIODS = [
  { period_number: 1, start_time: "08:30:00", end_time: "09:30:00" },
  { period_number: 2, start_time: "09:45:00", end_time: "10:45:00" },
  { period_number: 3, start_time: "11:00:00", end_time: "12:00:00" },
  { period_number: 4, start_time: "12:15:00", end_time: "13:15:00" },
  { period_number: 5, start_time: "14:00:00", end_time: "15:00:00" },
  { period_number: 6, start_time: "15:15:00", end_time: "16:15:00" },
]

export default function InstitutionAdminDashboardClient({
  institution,
  stats,
  timetableSlots,
  periods,
  attendanceRate,
  attentionMetrics,
  recentActivity,
  recentInvites,
  upcomingEvents,
}: {
  institution: Institution | null
  stats: Stats
  timetableSlots: TimetableSlot[]
  periods: Period[]
  attendanceRate: number | null
  attentionMetrics: {
    unassignedFacultyCount: number
    pendingInvitesCount: number
    programsWithoutSectionsCount: number
  }
  recentActivity: Activity[]
  recentInvites: any[]
  upcomingEvents: Event[]
}) {
  const router = useRouter()
  const { toast } = useToast()

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<string>(ROLES.FACULTY)
  const [inviteStatus, setInviteStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [inviteError, setInviteError] = useState("")

  const [activeTooltip, setActiveTooltip] = useState<number | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null)
  const [clientTime, setClientTime] = useState<Date | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setClientTime(new Date())
    const timer = setInterval(() => {
      setClientTime(new Date())
    }, 10000) // Update every 10 seconds for real-time tracking
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".fade-in-section",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
      )
    }, containerRef)
    return () => ctx.revert()
  }, [])

  async function handleInvite() {
    if (!inviteEmail.trim() || !institution?.id) return
    setInviteStatus("loading")
    setInviteError("")

    try {
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          institutionId: institution.id,
          organizationId: (institution as any).organization_id || "default", // Safe fallback
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to invite")
      }

      setInviteStatus("success")
      setInviteEmail("")
      toast({
        title: "Invitation Sent",
        description: `Successfully invited ${inviteEmail} as ${inviteRole}`,
      })
      setTimeout(() => {
        setInviteStatus("idle")
        setIsInviteOpen(false)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setInviteStatus("error")
      setInviteError(err.message)
    }
  }

  // --- Date & Day calculations ---
  const getGreeting = () => {
    if (!clientTime) return "Good day"
    const hrs = clientTime.getHours()
    if (hrs < 12) return "GOOD MORNING"
    if (hrs < 17) return "GOOD AFTERNOON"
    return "GOOD EVENING"
  }

  const getFormattedDate = () => {
    if (!clientTime) return "Loading today's metrics..."
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(clientTime)
  }

  const getClientDay = () => {
    if (!clientTime) return ""
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    return weekdays[clientTime.getDay()]
  }

  // --- Dynamic timeline math ---
  const activePeriods = periods.length > 0 ? periods : DEFAULT_PERIODS
  const clientDay = getClientDay()
  const slotsToday = timetableSlots.filter(s => s.day === clientDay)

  const getMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number)
    return h * 60 + m
  }

  const timelineStart = 480 // 8:00 AM
  const timelineEnd = 1080  // 6:00 PM
  const totalMinutes = timelineEnd - timelineStart

  const currentMinutes = clientTime 
    ? clientTime.getHours() * 60 + clientTime.getMinutes()
    : 0

  const abbreviateDepartment = (name: string) => {
    if (!name) return "GEN"
    if (name.length <= 5 && /^[A-Z&]+$/.test(name)) return name
    const parts = name.split(/\s+/).filter(w => {
      const l = w.toLowerCase()
      return l !== "and" && w !== "&" && l !== "of" && l !== "department"
    })
    const initials = parts.map(p => p[0]?.toUpperCase()).join("")
    return initials || name.substring(0, 3).toUpperCase()
  }

  const formatPeriodTime = (tStr: string) => {
    const [h, m] = tStr.split(":")
    const hrs = Number(h)
    const ampm = hrs >= 12 ? "PM" : "AM"
    const displayHrs = hrs % 12 || 12
    return `${displayHrs}:${m} ${ampm}`
  }

  // Map periods with active density
  const periodDensities = activePeriods.map((p, i) => {
    const slotsInPeriod = slotsToday.filter(s => s.period === p.period_number)
    const count = slotsInPeriod.length

    const startMins = getMinutes(p.start_time)
    const endMins = getMinutes(p.end_time)

    const N = activePeriods.length
    const left = (i / N) * 100
    const width = (1 / N) * 100

    let status: "completed" | "live" | "upcoming" = "upcoming"
    if (currentMinutes > endMins) {
      status = "completed"
    } else if (currentMinutes >= startMins && currentMinutes <= endMins) {
      status = "live"
    }

    // Group slots by department
    const deptGroupsMap: { [key: string]: { name: string; count: number; slots: TimetableSlot[] } } = {}
    slotsInPeriod.forEach(s => {
      const dId = s.department?.id || "unassigned"
      const dName = s.department?.name || "General"
      if (!deptGroupsMap[dId]) {
        deptGroupsMap[dId] = { name: dName, count: 0, slots: [] }
      }
      deptGroupsMap[dId].count++
      deptGroupsMap[dId].slots.push(s)
    })

    const deptGroups = Object.values(deptGroupsMap).sort((a, b) => b.count - a.count)

    return {
      ...p,
      left,
      width,
      count,
      status,
      deptGroups,
      slots: slotsInPeriod,
      timeLabel: `${formatPeriodTime(p.start_time)} - ${formatPeriodTime(p.end_time)}`
    }
  })

  // Calculate nowPct relative to the evenly spaced periods
  const getNowPct = () => {
    if (!clientTime || periodDensities.length === 0) return 0
    const currentMins = clientTime.getHours() * 60 + clientTime.getMinutes()
    
    const firstPeriod = periodDensities[0]
    const lastPeriod = periodDensities[periodDensities.length - 1]
    
    const firstStart = getMinutes(firstPeriod.start_time)
    const lastEnd = getMinutes(lastPeriod.end_time)
    
    if (currentMins <= firstStart) return 0
    if (currentMins >= lastEnd) return 100
    
    const N = periodDensities.length
    for (let i = 0; i < N; i++) {
      const p = periodDensities[i]
      const start = getMinutes(p.start_time)
      const end = getMinutes(p.end_time)
      
      if (currentMins >= start && currentMins <= end) {
        const ratio = (currentMins - start) / (end - start)
        return ((i + ratio) / N) * 100
      }
      
      if (i < N - 1) {
        const nextP = periodDensities[i + 1]
        const nextStart = getMinutes(nextP.start_time)
        if (currentMins > end && currentMins < nextStart) {
          const ratio = (currentMins - end) / (nextStart - end)
          return ((i + 1) / N) * 100
        }
      }
    }
    return 0
  }

  const nowPct = getNowPct()

  const peakClassesCount = Math.max(...periodDensities.map(pd => pd.count), 1)

  // Counters for live overview block
  const totalClassesToday = slotsToday.length
  const completedClassesCount = periodDensities.filter(pd => pd.status === "completed").reduce((sum, pd) => sum + pd.count, 0)
  const liveClassesCount = periodDensities.filter(pd => pd.status === "live").reduce((sum, pd) => sum + pd.count, 0)
  const upcomingClassesCount = periodDensities.filter(pd => pd.status === "upcoming").reduce((sum, pd) => sum + pd.count, 0)

  // Next up class calculation
  const nextPeriod = periodDensities
    .filter(pd => pd.status === "upcoming" && pd.count > 0)
    .sort((a, b) => getMinutes(a.start_time) - getMinutes(b.start_time))[0]
  const nextClass = nextPeriod && nextPeriod.slots.length > 0 ? nextPeriod.slots[0] : null

  // Selected period details for Drawer
  const activeDrawerPeriod = selectedPeriod !== null 
    ? periodDensities.find(pd => pd.period_number === selectedPeriod) 
    : null

  // Needs Attention list array
  const attentionItems = [
    ...(attentionMetrics.unassignedFacultyCount > 0 ? [{
      id: "unassigned",
      priority: "HIGH" as const,
      title: `${attentionMetrics.unassignedFacultyCount} Faculty members need assignments`,
      desc: "Educators are registered but haven't been linked to any subjects.",
      link: "/dashboard/institution-admin/faculty-subjects"
    }] : []),
    ...(attentionMetrics.pendingInvitesCount > 0 ? [{
      id: "invites",
      priority: "MEDIUM" as const,
      title: `${attentionMetrics.pendingInvitesCount} Member invitations are still pending`,
      desc: "Invites sent to emails that haven't registered passwords yet.",
      link: "/dashboard/institution-admin/faculty"
    }] : []),
    ...(attentionMetrics.programsWithoutSectionsCount > 0 ? [{
      id: "programs",
      priority: "LOW" as const,
      title: `${attentionMetrics.programsWithoutSectionsCount} Programs don't have active sections`,
      desc: "Academic programs that require intake class sections to be created.",
      link: "/dashboard/institution-admin/sections"
    }] : [])
  ]

  // Dots density count array
  const dotsDensity = Array.from({ length: 90 })

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-[1320px] min-w-0 overflow-x-hidden px-4 pb-12 pt-6 sm:px-6 lg:px-8 space-y-8 font-['Inter',sans-serif]">
      {/* Header section */}
      <div className="flex w-full items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">Overview</h1>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Mail size={14} />
          Invite Member
        </button>
      </div>

      {/* 01. INSTITUTION PULSE HERO WITH DENSITY TIMELINE */}
      <section className="fade-in-section relative overflow-hidden rounded-[32px] border border-slate-100 bg-white p-6 md:p-8 text-slate-900 shadow-[0_10px_40px_rgba(108,99,255,0.04)]">
        {/* Glow backgrounds */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#6C63FF]/5 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#00C2A8]/5 blur-[80px] pointer-events-none" />

        {/* Pulse top header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50/80 border border-indigo-100/60 text-[#6C63FF]">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#6C63FF]">{getGreeting()}</p>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5 tracking-tight font-['Plus_Jakarta_Sans']">
                {institution?.name ?? "Institution Dashboard"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 text-[10px] font-bold text-emerald-700 tracking-wider">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            LIVE PULSE
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)_180px] items-center">
          {/* Left Main Metric */}
          <div className="min-w-0 text-center lg:text-left space-y-1">
            <div className="text-4xl md:text-5xl font-black text-slate-900 font-['Space_Grotesk'] tracking-tight">
              {totalClassesToday}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E57D37]">Classes Today</p>
          </div>

          {/* Center Timelime */}
          <div className="min-w-0 space-y-6">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">TODAY&apos;S FLOW</p>
              <p className="text-[10px] font-medium text-slate-500 mt-1">{getFormattedDate()}</p>
            </div>

            {/* Time scaled activity density bars */}
            <div className="relative h-28 pt-4 pb-10">
              {/* Bottom guide line */}
              <div className="absolute bottom-10 left-0 right-0 w-full h-[2px] bg-slate-200" />

              {/* Real-time slider NOW indicator pill on the track */}
              {clientTime && nowPct > 0 && nowPct < 100 && (
                <div 
                  className="absolute bottom-10 -translate-x-1/2 flex flex-col items-center z-25 pointer-events-none"
                  style={{ left: `${nowPct}%` }}
                >
                  <span className="bg-[#00C2A8] text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm tracking-wider mb-1">
                    NOW
                  </span>
                  <div className="h-2 w-2 rounded-full bg-[#00C2A8] border-2 border-white shadow-[0_0_8px_rgba(0,194,168,0.4)] -mb-1" />
                </div>
              )}

              {/* Period bars and labels container */}
              {periodDensities.map(p => {
                const heightVal = p.count > 0 ? Math.max(16, (p.count / peakClassesCount) * 100) : 0
                return (
                  <div
                    key={p.period_number}
                    className="absolute top-4 bottom-0 flex flex-col justify-end group/bar"
                    style={{ left: `${p.left}%`, width: `${p.width}%` }}
                  >
                    {/* Bar graphic container */}
                    <div className="relative w-full flex-1 flex flex-col justify-end pb-2">
                      {p.count > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPeriod(p.period_number)}
                          onMouseEnter={() => setActiveTooltip(p.period_number)}
                          onMouseLeave={() => setActiveTooltip(null)}
                          style={{ height: `${heightVal}%` }}
                          className={`w-[80%] mx-auto rounded-t-md border-t transition-all duration-200 cursor-pointer text-left relative ${
                            p.status === "completed"
                              ? "bg-[#00C2A8]/20 hover:bg-[#00C2A8]/35 border-[#00C2A8]/40"
                              : p.status === "live"
                              ? "bg-[#6C63FF] hover:bg-[#5b52f0] border-[#6C63FF] shadow-[0_4px_16px_rgba(108,99,255,0.25)]"
                              : "bg-slate-100 hover:bg-slate-200 border-slate-200/80"
                          }`}
                        >
                          {/* Peak classes counter directly over active bars */}
                          <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-400 group-hover/bar:text-slate-900 transition-colors">
                            {p.count}
                          </span>
                        </button>
                      ) : null}
                    </div>

                    {/* Period label under guide line */}
                    <div className="h-10 flex flex-col items-center justify-center text-center">
                      <span className={`text-[9px] font-black tracking-wider ${
                        p.status === "live"
                          ? "text-[#6C63FF]"
                          : p.count > 0
                          ? "text-slate-700"
                          : "text-slate-400"
                      }`}>
                        P{p.period_number}
                      </span>
                      <span className={`text-[8px] font-bold tracking-tight mt-0.5 ${
                        p.status === "live"
                          ? "text-[#00C2A8]"
                          : p.count > 0
                          ? "text-slate-500"
                          : "text-slate-400"
                      }`}>
                        {p.start_time.substring(0, 5)} - {p.end_time.substring(0, 5)}
                      </span>
                    </div>

                    {/* Interactive hover breakdown tooltip */}
                    {activeTooltip === p.period_number && p.count > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-white border border-slate-100 text-slate-900 rounded-2xl p-4 shadow-[0_12px_36px_rgba(15,23,42,0.12)] z-50 w-60 text-xs animate-in fade-in duration-100 space-y-3">
                        <div className="border-b border-slate-100 pb-2">
                          <h4 className="font-bold text-slate-900 tracking-tight">{p.timeLabel}</h4>
                          <p className="text-[10px] font-black text-[#6C63FF] uppercase tracking-wider mt-1">
                            {p.count} classes scheduled
                          </p>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {p.deptGroups.slice(0, 4).map(group => (
                            <div key={group.name} className="flex justify-between items-center text-[11px] font-semibold text-slate-600">
                              <span className="truncate max-w-[130px]">{group.name}</span>
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[9px] font-black text-slate-700">
                                {group.count} {group.count === 1 ? "class" : "classes"}
                              </span>
                            </div>
                          ))}
                          {p.deptGroups.length > 4 && (
                            <div className="text-[9px] text-[#00C2A8] font-bold text-center pt-1">
                              + {p.deptGroups.length - 4} other departments
                            </div>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center pt-1.5 border-t border-slate-100">
                          Click to view details
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Timetable timeline flow counts */}
            <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00C2A8]" />
                {completedClassesCount} Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6C63FF]" />
                {liveClassesCount} Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                {upcomingClassesCount} Upcoming
              </span>
            </div>
          </div>

          {/* Right Main Metric */}
          <div className="min-w-0 text-center lg:text-right space-y-1">
            <div className="text-4xl md:text-5xl font-black text-slate-900 font-['Space_Grotesk'] tracking-tight">
              {attendanceRate !== null ? `${attendanceRate}%` : "—"}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E57D37]">Today&apos;s Attendance</p>
          </div>
        </div>

        {/* Pulse footer text details */}
        <div className="border-t border-slate-100 mt-8 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-semibold">
          <div className="text-slate-500 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6C63FF] shrink-0" />
            {totalClassesToday === 0 ? (
              <span>No classes scheduled today</span>
            ) : liveClassesCount > 0 ? (
              <span>Currently ongoing: {liveClassesCount} active lectures running</span>
            ) : (
              <span>Today&apos;s activity is mapped out</span>
            )}
          </div>
          {nextClass && (
            <div className="text-slate-700 flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-[10px] font-black tracking-wider text-[#FC8402] uppercase shrink-0">NEXT UP:</span>
              <span className="truncate max-w-[120px] font-bold text-slate-900">{nextClass.subject?.name}</span>
              <span className="text-slate-500 shrink-0">· Period {nextClass.period}</span>
            </div>
          )}
          {attendanceRate === null && (
            <div className="text-[10px] font-semibold text-slate-400 tracking-wide">
              Attendance details will record as classes begin
            </div>
          )}
        </div>
      </section>

      {/* 02. ACADEMIC STRUCTURE & 03. PEOPLE SECTION */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Academic structure details */}
        <div className="fade-in-section min-w-0 bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6C63FF]">02 · ACADEMIC STRUCTURE</p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900 font-['Space_Grotesk']">{String(stats.departments).padStart(2, "0")}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Departments</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Operational divisions configured inside the institution catalog.</p>
          </div>

          <div className="border-t border-slate-100 mt-8 pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <Link href="/dashboard/institution-admin/programs" className="group block">
                <p className="text-2xl font-black text-slate-800 font-['Space_Grotesk'] group-hover:text-[#6C63FF] transition-colors">{stats.programs}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Programs</p>
              </Link>
              <Link href="/dashboard/institution-admin/sections" className="group block">
                <p className="text-2xl font-black text-slate-800 font-['Space_Grotesk'] group-hover:text-[#6C63FF] transition-colors">{stats.sections}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Sections</p>
              </Link>
              <Link href="/dashboard/institution-admin/subjects" className="group block">
                <p className="text-2xl font-black text-slate-800 font-['Space_Grotesk'] group-hover:text-[#6C63FF] transition-colors">{stats.courses}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Courses</p>
              </Link>
            </div>
          </div>
        </div>

        {/* People stats with dot grid density overlay */}
        <div className="fade-in-section relative min-w-0 overflow-hidden bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm flex flex-col justify-between">
          {/* Subtle dots layout background */}
          <div className="absolute inset-0 p-6 opacity-[0.03] select-none pointer-events-none grid grid-cols-10 gap-1 content-start">
            {dotsDensity.map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            ))}
          </div>

          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6C63FF]">03 · PEOPLE</p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900 font-['Space_Grotesk']">{stats.students.toLocaleString()}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Students Enrolled</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Active student portals mapped inside departments.</p>
          </div>

          <div className="relative z-10 border-t border-slate-100 mt-8 pt-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <Link href="/dashboard/institution-admin/faculty" className="group block border-r border-slate-100">
                <p className="text-2xl font-black text-slate-800 font-['Space_Grotesk'] group-hover:text-[#6C63FF] transition-colors">{stats.faculty}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Faculty</p>
              </Link>
              <Link href="/dashboard/institution-admin/parents" className="group block">
                <p className="text-2xl font-black text-slate-800 font-['Space_Grotesk'] group-hover:text-[#6C63FF] transition-colors">{stats.parents}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Parents</p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 04. NEEDS ATTENTION CARDS */}
      <section className="fade-in-section min-w-0 bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6C63FF]">04 · NEEDS ATTENTION</p>
            <p className="text-sm font-semibold text-slate-700 mt-1.5">
              {attentionItems.length === 0 
                ? "All systems operational. No updates require action." 
                : `${attentionItems.length} operational issues require your review`
              }
            </p>
          </div>
          {attentionItems.length > 0 && (
            <span className="h-6 px-2.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold flex items-center justify-center font-['Space_Grotesk']">
              {attentionItems.length} Issues
            </span>
          )}
        </div>

        {attentionItems.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <p className="text-xs font-semibold text-slate-500">Your institution database is perfectly assigned.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attentionItems.map(item => (
              <div 
                key={item.id}
                onClick={() => router.push(item.link)}
                className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-slate-100 rounded-2xl hover:border-slate-200 hover:shadow-[0_4px_12px_rgba(15,23,42,0.01)] transition-all duration-200 cursor-pointer"
              >
                <div className="flex gap-3.5 items-start">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${
                    item.priority === "HIGH" 
                      ? "bg-rose-50 border-rose-100 text-rose-600" 
                      : item.priority === "MEDIUM" 
                      ? "bg-amber-50 border-amber-100 text-amber-600" 
                      : "bg-blue-50 border-blue-100 text-blue-600"
                  }`}>
                    <AlertTriangle size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 tracking-tight">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-[#6C63FF] transition-colors flex items-center gap-1 self-end sm:self-auto">
                  Resolve <ChevronRight size={12} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 05. RECENT ACTIVITY & 06. UPCOMING SECTION */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent timeline logs */}
        <section className="fade-in-section min-w-0 bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6C63FF]">05 · RECENT ACTIVITY</p>
            <p className="text-xs text-slate-400 mt-1.5">Living timeline of administration logs.</p>
          </div>

          <div className="pt-2">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-xs font-medium text-slate-400">
                No recent activity records found.
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentActivity.map((log) => {
                  const formatLogTime = (dateStr: string) => {
                    const diffMs = new Date().getTime() - new Date(dateStr).getTime()
                    const diffMins = Math.floor(diffMs / 60000)
                    if (diffMins < 1) return "Just now"
                    if (diffMins < 60) return `${diffMins}m ago`
                    const diffHours = Math.floor(diffMins / 60)
                    if (diffHours < 24) return `${diffHours}h ago`
                    return new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric" }).format(new Date(dateStr))
                  }

                  const formattedAction = log.action
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, c => c.toUpperCase())

                  return (
                    <div 
                      key={log.id} 
                      className="relative pl-6 pb-5 border-l border-slate-100 last:border-l-0"
                    >
                      <span className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-slate-200 border border-white" />
                      <div className="text-xs font-semibold text-slate-800">{formattedAction}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-medium leading-relaxed">
                        By {log.user_name} ({log.user_email}) · {formatLogTime(log.created_at)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Upcoming events calendar list */}
        <section className="fade-in-section min-w-0 bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6C63FF]">06 · UPCOMING EVENTS</p>
            <p className="text-xs text-slate-400 mt-1.5">Scheduled examinations and institutional activities.</p>
          </div>

          <div className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <div className="border border-dashed border-slate-155 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-2">
                <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <p className="text-xs font-semibold text-slate-400">No upcoming events scheduled.</p>
              </div>
            ) : (
              upcomingEvents.map(event => {
                const eDate = new Date(event.start_time)
                const dateStr = eDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                const timeStr = eDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

                return (
                  <div 
                    key={event.id}
                    className="flex gap-4 items-center p-3 border border-slate-50 bg-slate-50/20 rounded-2xl"
                  >
                    <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-slate-100 border border-slate-200/50 text-[#6C63FF] shrink-0 font-['Space_Grotesk']">
                      <span className="text-[10px] font-black tracking-wider uppercase opacity-55">
                        {eDate.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="text-sm font-black leading-none mt-0.5">
                        {eDate.getDate()}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{event.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>{dateStr} · {timeStr}</span>
                        {event.location && (
                          <span className="text-slate-400 shrink-0">· Room {event.location}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      {/* Invite Member dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-sm font-['Plus_Jakarta_Sans',sans-serif] p-6 rounded-[28px] bg-white shadow-2xl border border-slate-100">
          <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
            <DialogTitle className="text-sm font-bold text-slate-900">Invite New Member</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Invite a student, faculty member, HOD, or program head to join your workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {inviteStatus === "success" && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs font-semibold text-emerald-700 animate-in fade-in duration-200">
                Invitation sent successfully.
              </div>
            )}
            {inviteStatus === "error" && (
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-[#F04438] animate-in fade-in duration-200">
                {inviteError}
              </div>
            )}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Email Address</label>
              <input
                value={inviteEmail}
                type="email"
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@college.edu"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Select Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white"
              >
                <option value={ROLES.FACULTY}>Faculty</option>
                <option value={ROLES.STUDENT}>Student</option>
                <option value={ROLES.HOD}>Head of Department</option>
                <option value={ROLES.PROGRAM_HEAD}>Program Head</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="flex-1 h-11 text-xs font-bold text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteStatus === "loading"}
                className="flex-1 h-11 text-xs font-bold text-white bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-2xl shadow-lg hover:shadow-indigo-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviteStatus === "loading" ? "Inviting..." : "Send Invite"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- Dynamic Slide-out details Drawer panel --- */}
      {selectedPeriod !== null && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-200"
          onClick={() => setSelectedPeriod(null)}
        />
      )}
      
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-[480px] bg-white shadow-2xl border-l border-slate-100 z-50 flex flex-col transition-transform duration-300 ${
          selectedPeriod !== null ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {activeDrawerPeriod && (
          <>
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6C63FF]">
                  PERIOD {activeDrawerPeriod.period_number} DETAIL
                </p>
                <h3 className="text-md font-bold text-slate-900 mt-1 font-['Plus_Jakarta_Sans']">
                  {activeDrawerPeriod.timeLabel}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPeriod(null)}
                className="h-8 w-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeDrawerPeriod.slots.length === 0 ? (
                <div className="text-center text-sm font-semibold text-slate-400 py-12">
                  No classes scheduled in this period.
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  {/* Summary Metric */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Scheduled Lectures</span>
                    <span className="h-7 px-3 rounded-full bg-[#6C63FF]/10 text-[#6C63FF] text-xs font-black flex items-center justify-center font-['Space_Grotesk']">
                      {activeDrawerPeriod.slots.length} Classes
                    </span>
                  </div>

                  {/* List grouped by departments */}
                  {activeDrawerPeriod.deptGroups.map(group => (
                    <div key={group.name} className="space-y-3">
                      {/* Department header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-black text-slate-800 tracking-tight uppercase tracking-widest">
                          {group.name}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                          {group.count} {group.count === 1 ? "class" : "classes"}
                        </span>
                      </div>

                      {/* Department slots list */}
                      <div className="space-y-2">
                        {group.slots.map(slot => (
                          <div 
                            key={slot.id} 
                            className="bg-white border border-slate-100 hover:border-slate-200 rounded-xl p-3.5 space-y-2 shadow-[0_2px_8px_rgba(15,23,42,0.01)]"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div>
                                <h5 className="text-xs font-bold text-slate-900 leading-tight">
                                  {slot.subject?.name}
                                </h5>
                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                  {slot.subject?.code}
                                </p>
                              </div>
                              <span className="h-5 px-2 rounded-md bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center justify-center font-['Space_Grotesk']">
                                {slot.section?.name ?? "N/A"}
                              </span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-[10px] font-semibold text-slate-400">
                              <span className="text-slate-500 font-bold truncate max-w-[200px]">
                                Prof. {slot.faculty?.name ?? "Unassigned"}
                              </span>
                              <span className="text-slate-400 shrink-0">
                                Period {slot.period}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
