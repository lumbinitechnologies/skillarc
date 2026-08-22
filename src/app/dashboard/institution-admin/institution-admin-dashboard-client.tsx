"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Building2, Users, GraduationCap, BookOpen, Mail, Clock } from "lucide-react"
import { ROLES } from "@/constants/roles"
import gsap from "gsap"

type Status = "idle" | "loading" | "success" | "error"

interface Institution { id: string; name: string; domain: string | null }
interface Stats { faculty: number; students: number; courses: number }
interface RecentUser { id: string; email: string; role: string; created_at: string }

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB").format(new Date(date))
}

export default function InstitutionAdminDashboardClient({
  institution,
  stats,
  recentUsers,
}: {
  institution: Institution | null
  stats: Stats
  recentUsers: RecentUser[]
}) {
  const router = useRouter()
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<string>(ROLES.FACULTY)
  const [inviteStatus, setInviteStatus] = useState<Status>("idle")
  const [inviteError, setInviteError] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Greeting reveal
      gsap.fromTo(
        ".welcome-title-char",
        { y: 35, opacity: 0, filter: "blur(4px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.8,
          stagger: 0.04,
          ease: "power3.out",
        }
      )

      // 2. Stats cards reveal
      gsap.fromTo(
        ".admin-stat-card",
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: "power2.out",
          delay: 0.2,
        }
      )

      // 3. Grid blocks slide-up
      gsap.fromTo(
        ".admin-section",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          delay: 0.45,
        }
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
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to invite")
      }

      setInviteStatus("success")
      setInviteEmail("")
      setTimeout(() => {
        setInviteStatus("idle")
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setInviteStatus("error")
      setInviteError(err.message)
    }
  }

  const statCards = [
    { label: "Faculty", value: stats.faculty, accent: "bg-gray-100 text-gray-700 border-gray-200", icon: <Users size={18} className="text-gray-600" /> },
    { label: "Students", value: stats.students, accent: "bg-gray-100 text-gray-700 border-gray-200", icon: <GraduationCap size={18} className="text-gray-600" /> },
    { label: "Courses", value: stats.courses, accent: "bg-gray-100 text-gray-700 border-gray-200", icon: <BookOpen size={18} className="text-editorial-amber" /> },
  ]

  const welcomeText = `${greeting}, admin`
  const words = welcomeText.split(" ")

  return (
    <div ref={containerRef} className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <header className="rounded-[28px] border border-editorial-blue border-opacity-30 bg-editorial-navy bg-opacity-40 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-editorial-orange to-editorial-amber text-editorial-navy shadow-lg shadow-editorial-orange/30">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-editorial-orange">Institution dashboard</p>
                <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-editorial-cream flex flex-wrap">
                  {words.map((word, idx) => (
                    <span key={idx} className="inline-block overflow-hidden mr-2">
                      <span className="welcome-title-char inline-block">
                        {word}
                      </span>
                    </span>
                  ))}
                </h1>
                <p className="mt-2 text-sm text-editorial-sky text-opacity-60">{institution?.name ?? "Institution dashboard"}</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard/institution-admin/faculty")}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-editorial-orange to-editorial-amber px-5 py-3 text-sm font-semibold text-editorial-navy shadow-lg shadow-editorial-orange/30 transition hover:shadow-lg hover:shadow-editorial-orange/40"
            >
              <Mail size={16} /> Invite member
            </button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="admin-stat-card dashboard-card p-5 rounded-[24px] border border-[#3A6DAF]/20 bg-[#FFFFFF] shadow-[0_8px_24px_rgba(20,35,75,0.08)] transition-all duration-300 hover:-translate-y-1">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-3xl border ${card.accent} mb-4`}>
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-[#14234B] leading-none">{card.value}</p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#E57D37]">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="admin-section dashboard-card p-6 rounded-[28px] border border-[#3A6DAF]/20 bg-[#FFFFFF] shadow-[0_12px_32px_rgba(20,35,75,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E57D37]">Quick actions</p>
              <h2 className="mt-2 text-xl font-semibold text-[#14234B]">Manage institutional operations</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Departments", href: "/dashboard/institution-admin/departments" },
                { label: "Programs", href: "/dashboard/institution-admin/programs" },
                { label: "Faculty", href: "/dashboard/institution-admin/faculty" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className="rounded-3xl border border-[#3A6DAF]/20 bg-[#F8FAFD] px-4 py-3 text-left text-sm font-semibold text-[#14234B] transition hover:border-[#E57D37]/50 hover:bg-[#F0F5FB] hover:text-[#E57D37]"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="admin-section dashboard-card p-6 rounded-[28px] border border-[#3A6DAF]/20 bg-[#FFFFFF] shadow-[0_12px_32px_rgba(20,35,75,0.08)]">
            <div className="flex items-center gap-4 pb-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-[#E57D37]/10 text-[#E57D37]">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E57D37]">Add Member</p>
                <h2 className="mt-2 text-xl font-semibold text-[#14234B]">Invite and connect</h2>
              </div>
            </div>
            <div className="space-y-4">
              {inviteStatus === "success" && (
                <div className="rounded-3xl bg-emerald-50 border border-gray-200 p-4 text-sm text-emerald-700">Invite sent successfully.</div>
              )}
              {inviteStatus === "error" && (
                <div className="rounded-3xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{inviteError}</div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#E57D37]">Email</label>
                <input
                  value={inviteEmail}
                  type="email"
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="faculty@college.edu"
                  className="mt-3 w-full rounded-3xl border border-[#3A6DAF]/20 bg-[#F8FAFD] px-4 py-3 text-sm text-[#14234B] outline-none transition focus:border-[#E57D37]/50 focus:ring-1 focus:ring-[#E57D37]/20 placeholder:text-[#94BAC4]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#E57D37]">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-3 w-full rounded-3xl border border-[#3A6DAF]/20 bg-[#F8FAFD] px-4 py-3 text-sm text-[#14234B] outline-none transition focus:border-[#E57D37]/50 focus:ring-1 focus:ring-[#E57D37]/20"
                >
                  <option value={ROLES.FACULTY} className="bg-white text-[#14234B]">Faculty</option>
                  <option value={ROLES.STUDENT} className="bg-white text-[#14234B]">Student</option>
                  <option value={ROLES.HOD} className="bg-white text-[#14234B]">Head of Department</option>
                  <option value={ROLES.PROGRAM_HEAD} className="bg-white text-[#14234B]">Program Head</option>
                </select>
              </div>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteStatus === "loading"}
                className="mt-2 w-full rounded-3xl bg-gradient-to-r from-[#E57D37] to-[#EAAD62] px-4 py-3 text-sm font-semibold text-[#14234B] transition hover:shadow-lg hover:shadow-[#E57D37]/20 disabled:cursor-not-allowed disabled:bg-[#94BAC4] disabled:bg-opacity-40"
              >
                {inviteStatus === "loading" ? "Sending invite..." : "Send invite"}
              </button>
            </div>
          </aside>

          <section className="admin-section dashboard-card p-6 rounded-[28px] border border-[#3A6DAF]/20 bg-[#FFFFFF] shadow-[0_12px_32px_rgba(20,35,75,0.08)]">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E57D37]">Recent members</p>
                <h2 className="mt-2 text-xl font-semibold text-[#14234B]">Latest invites</h2>
              </div>
              <button
                onClick={() => router.push("/dashboard/institution-admin/students")}
                className="inline-flex items-center gap-2 rounded-full bg-[#F0F5FB] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#94BAC4] transition hover:bg-[#3A6DAF]/20 border border-[#3A6DAF]/20"
              >
                View all
              </button>
            </div>
            <div className="space-y-4">
              {recentUsers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-editorial-blue/30 bg-editorial-navy/20 p-8 text-center text-sm text-editorial-sky text-opacity-60">
                  No recent users to display.
                </div>
              ) : (
                recentUsers.map((user) => (
                  <div key={user.id} className="rounded-3xl border border-editorial-blue/20 bg-editorial-navy/30 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-editorial-cream truncate">{user.email}</p>
                        <p className="mt-1 text-xs text-editorial-sky text-opacity-60">{formatDate(user.created_at)}</p>
                      </div>
                      <span className="rounded-full bg-editorial-blue/20 border border-editorial-blue/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-editorial-sky self-start sm:self-auto">
                        {user.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
