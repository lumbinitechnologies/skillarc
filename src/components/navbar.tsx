"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, Search, LogOut, User, Settings, ChevronDown, KeyRound, Menu } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ROLES } from "@/constants/roles"
import type { UserContext } from "@/lib/user-context"

type Role = typeof ROLES[keyof typeof ROLES]

export default function Navbar({ profile: initialProfile }: { profile: UserContext | null }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const profile = initialProfile
    ? {
        name: initialProfile.name,
        role: initialProfile.role,
      }
    : null

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

    if (initialProfile?.id) {
      loadNotifications(initialProfile.id)
    }
  }, [initialProfile?.id])

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
    window.location.replace("/auth/login")
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
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button
          aria-label="Toggle sidebar"
          onClick={() => document.body.classList.toggle("sidebar-open")}
          className="mr-2 inline-flex items-center justify-center rounded-md bg-gray-100 p-2 text-gray-700 hover:bg-gray-200 md:hidden"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="font-['Space_Grotesk'] text-xs sm:text-sm font-bold uppercase tracking-[0.24em] text-gray-900">Dashboard</h1>
          <p className="hidden sm:block mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-600">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden sm:flex min-w-0 flex-1 items-center justify-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 transition focus-within:border-gray-300 focus-within:bg-white">
            <Search size={14} className="text-gray-600" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything…"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen((open) => !open)
                setDropdownOpen(false)
              }}
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-100 ${notifOpen ? "ring-1 ring-gray-300" : ""}`}
            >
              <Bell size={16} />
              {notifications.some(n => !n.is_read) && (
                <>
                  <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-[#E57D37] opacity-90 shadow-[0_0_0_4px_rgba(229,125,55,0.18)] animate-ping" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#E57D37]" />
                </>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full z-30 mt-3 min-w-[90vw] sm:min-w-[320px] max-w-[360px] overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                <div className="border-b border-gray-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-900">Notifications</p>
                </div>
                <div className="flex flex-col max-h-[360px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-gray-500">No notifications yet.</div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition ${!notification.is_read ? "bg-orange-50 hover:bg-orange-100" : "hover:bg-gray-50"}`}
                      >
                        {!notification.is_read && <span className="mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-[#E57D37] opacity-90" />}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-xs">{notification.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5 leading-normal">{notification.message}</p>
                          <p className="mt-1 text-[10px] text-gray-500">{fmtTime(notification.created_at)}</p>
                        </div>
                      </button>
                    ))
                  )}
                  <button type="button" className="w-full border-t border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-[#E57D37] transition hover:bg-gray-50">
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
              className={`inline-flex items-center gap-1.5 sm:gap-3 rounded-[16px] border border-gray-200 bg-white p-1 sm:px-3 sm:py-2 transition hover:bg-gray-100 ${dropdownOpen ? "ring-1 ring-gray-300" : ""}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E57D37] to-[#EAAD62] text-[#14234B] shadow-md">
                {profile ? profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "U"}
              </div>
              <div className="hidden sm:block min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-gray-900">{profile ? profile.name : "Loading..."}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-600">{profile ? profile.role.replace(/_/g, " ") : "Loading..."}</p>
              </div>
              <ChevronDown className={`hidden sm:block h-4 w-4 text-gray-500 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : "rotate-0"}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-30 mt-3 min-w-[90vw] sm:min-w-[220px] overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                <button
                  type="button"
                  onClick={() => {
                    router.push(profilePath)
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-editorial-orange/5"
                >
                  <User size={14} className="text-gray-600" />
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push(settingsPath)
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-editorial-orange/5"
                >
                  <Settings size={14} className="text-gray-600" />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push("/dashboard/change-password")
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-editorial-orange/5"
                >
                  <KeyRound size={14} className="text-editorial-orange" />
                  Change Password
                </button>
                <div className="border-t border-editorial-blue/30" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10"
                >
                  <LogOut size={14} className="text-rose-400" />
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
