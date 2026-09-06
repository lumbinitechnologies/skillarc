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
        profile_image_url: initialProfile.profile_image_url,
      }
    : null

  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    async function loadNotifications(userId: string) {
      try {
        let items: any[] | null = null
        const res = await supabase
          .from("notifications")
          .select("id, title, message, link, is_read, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10)

        // Fallback if link column is not added to notifications table yet
        if (res.error && (res.error.code === "42703" || res.error.message?.includes("link"))) {
          const fallback = await supabase
            .from("notifications")
            .select("id, title, message, is_read, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10)
          items = (fallback.data as any[]) || []
        } else if (res.data) {
          items = res.data as any[]
        }

        if (items) {
          setNotifications(items)
        }
      } catch (err) {
        console.error("Failed to load notifications:", err)
      }
    }

    if (initialProfile?.id) {
      loadNotifications(initialProfile.id)

      // Realtime subscription for incoming notifications
      const channel = supabase
        .channel(`public:notifications:${initialProfile.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${initialProfile.id}`,
          },
          (payload) => {
            if (payload.new) {
              setNotifications((prev) => [payload.new, ...prev.slice(0, 9)])
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
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

  async function markAsRead(id: string, link?: string) {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error("Failed to mark notification read:", err)
    }

    if (link) {
      setNotifOpen(false)
      router.push(link)
    }
  }

  async function markAllAsRead() {
    if (!initialProfile?.id) return
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", initialProfile.id)
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error("Failed to mark all read:", err)
    }
  }

  function fmtTime(dateStr: string) {
    if (!dateStr) return ""
    try {
      // Normalize UTC timestamp string if stored without timezone indicator in DB
      const normalized =
        dateStr.includes("Z") || dateStr.includes("+") || /-\d\d:\d\d$/.test(dateStr)
          ? dateStr
          : `${dateStr}Z`
      const date = new Date(normalized)
      const diffMs = Date.now() - date.getTime()
      if (isNaN(diffMs)) return ""

      const diffMin = Math.floor(diffMs / 60000)
      if (diffMin < 1) return "Just now"
      if (diffMin < 60) return `${diffMin}m ago`
      const diffHr = Math.floor(diffMin / 60)
      if (diffHr < 24) return `${diffHr}h ago`
      const diffDays = Math.floor(diffHr / 24)
      if (diffDays === 1) return "Yesterday"
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    } catch {
      return ""
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

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
              {unreadCount > 0 && (
                <>
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E57D37] px-1 text-[9px] font-black text-white shadow-sm">
                    {unreadCount}
                  </span>
                </>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full z-30 mt-3 min-w-[90vw] sm:min-w-[340px] max-w-[380px] overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-gray-900">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-[#E57D37]/10 px-2 py-0.5 text-[10px] font-black text-[#E57D37]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[11px] font-bold text-[#E57D37] hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="flex flex-col max-h-[380px] overflow-y-auto divide-y divide-gray-100">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center text-xs font-medium text-gray-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => markAsRead(notification.id, notification.link)}
                        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left text-sm transition cursor-pointer ${
                          !notification.is_read ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="mt-1 flex h-2 w-2 shrink-0 items-center justify-center">
                          {!notification.is_read ? (
                            <span className="h-2 w-2 rounded-full bg-[#E57D37]" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-xs leading-snug">{notification.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{notification.message}</p>
                          <p className="mt-1 text-[10px] font-semibold text-gray-400">{fmtTime(notification.created_at)}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-gray-100 bg-slate-50/50 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false)
                      router.push("/dashboard/account/notifications")
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-[#E57D37] hover:bg-white transition-all cursor-pointer"
                  >
                    <Settings size={13} />
                    Notification Settings
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#E57D37] to-[#EAAD62] text-[#14234B] shadow-md font-semibold text-sm">
                {profile?.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : profile ? (
                  profile.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                ) : (
                  "U"
                )}
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
                    router.push("/dashboard/account/profile")
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
                >
                  <User size={15} className="text-gray-600" />
                  My Account & Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push("/dashboard/account/settings")
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
                >
                  <Settings size={15} className="text-gray-600" />
                  Account Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push("/dashboard/change-password")
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
                >
                  <KeyRound size={15} className="text-[#E57D37]" />
                  Change Password
                </button>
                <div className="border-t border-gray-100" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-500 transition hover:bg-rose-50"
                >
                  <LogOut size={15} className="text-rose-500" />
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
