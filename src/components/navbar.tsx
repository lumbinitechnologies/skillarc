"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, Search, LogOut, User, Settings, ChevronDown, KeyRound } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ROLES } from "@/constants/roles"

type Role = typeof ROLES[keyof typeof ROLES]

export default function Navbar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null)

  const profileRoutes: Record<Role, string> = {
    [ROLES.SUPER_ADMIN]: "/dashboard/super-admin",
    [ROLES.ORG_ADMIN]: "/dashboard/org-admin",
    [ROLES.INSTITUTION_ADMIN]: "/dashboard/institution-admin",
    [ROLES.HOD]: "/dashboard/hod",
    [ROLES.PROGRAM_HEAD]: "/dashboard/program-head",
    [ROLES.FACULTY]: "/dashboard/faculty/profile",
    [ROLES.STUDENT]: "/dashboard/student",
    [ROLES.PARENT]: "/dashboard/parent",
  }

  const settingsRoutes: Record<Role, string> = {
    [ROLES.SUPER_ADMIN]: "/dashboard/super-admin/settings",
    [ROLES.ORG_ADMIN]: "/dashboard/org-admin",
    [ROLES.INSTITUTION_ADMIN]: "/dashboard/institution-admin",
    [ROLES.HOD]: "/dashboard/hod",
    [ROLES.PROGRAM_HEAD]: "/dashboard/program-head",
    [ROLES.FACULTY]: "/dashboard/faculty/profile",
    [ROLES.STUDENT]: "/dashboard/student",
    [ROLES.PARENT]: "/dashboard/parent",
  }

  const profilePath = profile ? profileRoutes[profile.role as Role] ?? "/dashboard" : "/dashboard"
  const settingsPath = profile ? settingsRoutes[profile.role as Role] ?? profilePath : "/dashboard"

  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    async function loadNotifications(userId: string) {
      try {
        const { data } = await supabase
          .from("notifications")
          .select("id, title, message, is_read, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(6)
        
        if (data) {
          setNotifications(data)
        }
      } catch (err) {
        console.error("Failed to load notifications:", err)
      }
    }

    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("name, role")
          .eq("id", user.id)
          .single()

        if (data) {
          setProfile({
            name: data.name ?? user.email?.split("@")[0] ?? "User",
            role: data.role ?? "User",
          })
        } else {
          setProfile({
            name: user.email?.split("@")[0] ?? "User",
            role: "User",
          })
        }

        loadNotifications(user.id)
      }
    }

    getProfile()
  }, [])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleLogout() {
    setDropdownOpen(false)
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  async function markAsRead(id: string) {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error("Failed to mark notification read:", err)
    }
  }

  function fmtTime(dateStr: string) {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime()
      const diffMin = Math.floor(diffMs / 60000)
      if (diffMin < 1) return "Just now"
      if (diffMin < 60) return `${diffMin}m ago`
      const diffHr = Math.floor(diffMin / 60)
      if (diffHr < 24) return `${diffHr}h ago`
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return ""
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-900">Dashboard</h1>
          <p className="mt-1 text-xs text-indigo-600">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="flex min-w-[280px] items-center gap-3 rounded-[18px] border border-indigo-100 bg-white/90 px-4 py-2 shadow-[0_16px_40px_rgba(99,102,241,0.06)] transition focus-within:border-indigo-300 focus-within:bg-white">
            <Search size={14} className="text-indigo-300" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything…"
              className="min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen((open) => !open)
                setDropdownOpen(false)
              }}
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-indigo-100 bg-white/90 text-slate-600 transition hover:bg-slate-50 ${notifOpen ? "ring-1 ring-indigo-200" : ""}`}
            >
              <Bell size={16} />
              {notifications.some(n => !n.is_read) && (
                <>
                  <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-orange-400/90 shadow-[0_0_0_4px_rgba(248,113,113,0.14)] animate-ping" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-orange-400" />
                </>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full z-30 mt-3 min-w-[320px] max-w-[360px] overflow-hidden rounded-[20px] border border-slate-200 bg-white/95 shadow-[0_28px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                <div className="border-b border-slate-200/70 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-900">Notifications</p>
                </div>
                <div className="flex flex-col max-h-[360px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition ${!notification.is_read ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-slate-100"}`}
                      >
                        {!notification.is_read && <span className="mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-xs">{notification.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 leading-normal">{notification.message}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{fmtTime(notification.created_at)}</p>
                        </div>
                      </button>
                    ))
                  )}
                  <button type="button" className="w-full border-t border-slate-200/70 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 transition hover:bg-indigo-50">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen((open) => !open)
                setNotifOpen(false)
              }}
              className={`inline-flex items-center gap-3 rounded-[16px] border border-indigo-100 bg-white/90 px-3 py-2 transition hover:bg-slate-50 ${dropdownOpen ? "ring-1 ring-indigo-200" : ""}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                {profile ? profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "U"}
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-slate-900">{profile ? profile.name : "Loading..."}</p>
                <p className="text-xs text-indigo-600">{profile ? profile.role.replace(/_/g, " ") : "Loading..."}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : "rotate-0"}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-30 mt-3 min-w-[220px] overflow-hidden rounded-[20px] border border-slate-200 bg-white/95 shadow-[0_28px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => {
                    router.push(profilePath)
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-indigo-50"
                >
                  <User size={14} className="text-indigo-500" />
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push(settingsPath)
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-indigo-50"
                >
                  <Settings size={14} className="text-indigo-500" />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push("/dashboard/change-password")
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-indigo-50"
                >
                  <KeyRound size={14} className="text-indigo-500" />
                  Change Password
                </button>
                <div className="border-t border-slate-200/70" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut size={14} className="text-rose-500" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
