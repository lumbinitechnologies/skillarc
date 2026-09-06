"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Loader2, Mail, Smartphone, Bell, CheckCircle2,
  Sparkles, RefreshCw, ShieldCheck, Check, AlertCircle, Filter
} from "lucide-react"

type Category = {
  key: string
  label: string
  description: string
  group: "academic" | "course" | "admin"
  email_enabled: boolean
  push_enabled: boolean
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    key: "due_date",
    label: "Due Date Reminders",
    description: "Assignments, quizzes, and project submission deadlines",
    group: "academic",
    email_enabled: true,
    push_enabled: true,
  },
  {
    key: "grading",
    label: "Grades & Feedback",
    description: "New grades, score updates, and faculty review remarks",
    group: "academic",
    email_enabled: true,
    push_enabled: true,
  },
  {
    key: "announcements",
    label: "Course Announcements",
    description: "Broadcast announcements and updates from instructors",
    group: "course",
    email_enabled: true,
    push_enabled: true,
  },
  {
    key: "course_content",
    label: "Course Content Changes",
    description: "New lecture slides, modules, reading materials, or syllabi",
    group: "course",
    email_enabled: false,
    push_enabled: true,
  },
  {
    key: "files",
    label: "Files & Resources",
    description: "New downloadable documents or lab manuals uploaded to course",
    group: "course",
    email_enabled: false,
    push_enabled: true,
  },
  {
    key: "grading_policy",
    label: "Grading Policies & Rubrics",
    description: "Updates to course grading scale, weighted percentages, and rubrics",
    group: "academic",
    email_enabled: true,
    push_enabled: false,
  },
  {
    key: "invitations",
    label: "Invitations & Sessions",
    description: "Web conferences, group collaborations, and guest masterclasses",
    group: "admin",
    email_enabled: true,
    push_enabled: true,
  },
  {
    key: "submissions",
    label: "Student Submissions",
    description: "Student assignment turn-ins and project submissions (Staff only)",
    group: "admin",
    email_enabled: true,
    push_enabled: true,
  },
  {
    key: "late_grading",
    label: "Late Submissions Queue",
    description: "Alerts when students submit assignments after deadline (Staff only)",
    group: "admin",
    email_enabled: false,
    push_enabled: true,
  },
]

function ModernToggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E57D37]/30 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-[#E57D37] shadow-sm shadow-amber-200" : "bg-slate-200 hover:bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

export function NotificationsFormClient() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [savedToast, setSavedToast] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"all" | "academic" | "course" | "admin">("all")
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({})
  const [testingNotif, setTestingNotif] = useState(false)
  const [testResult, setTestResult] = useState<{
    success?: boolean
    userEmail?: string
    pushEnabled?: boolean
    emailEnabled?: boolean
    emailSent?: boolean
    emailError?: string
    hasResendKey?: boolean
    message?: string
  } | null>(null)

  async function handleSendTest() {
    setTestingNotif(true)
    setTestResult(null)
    setError(null)
    try {
      const res = await fetch("/api/account/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "announcements",
          title: "🔔 SkillArc Notification Test",
          message: "Real-time alert confirming your in-app notification bell and email delivery are working seamlessly!",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch test notification")
      }
      setTestResult(data)
    } catch (err: any) {
      setError(err?.message || "Failed to send test notification")
    } finally {
      setTestingNotif(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function fetchPreferences() {
      try {
        const res = await fetch("/api/account/notifications")
        if (res.ok) {
          const json = await res.json()
          if (isMounted && Array.isArray(json.categories) && json.categories.length > 0) {
            // Merge with local group metadata
            const merged = json.categories.map((c: any) => {
              const def = DEFAULT_CATEGORIES.find((d) => d.key === c.key)
              return {
                ...c,
                group: def?.group || "course",
              }
            })
            setCategories(merged)
          }
        }
      } catch (err) {
        console.warn("Using offline/default notification preferences:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchPreferences()
    return () => {
      isMounted = false
    }
  }, [])

  const triggerSavedToast = () => {
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2000)
  }

  async function handleToggle(categoryKey: string, channel: "email" | "push", nextValue: boolean) {
    const keyId = `${categoryKey}:${channel}`
    setPendingMap((p) => ({ ...p, [keyId]: true }))

    // Optimistic UI update
    setCategories((prev) =>
      prev.map((c) =>
        c.key === categoryKey
          ? { ...c, [channel === "email" ? "email_enabled" : "push_enabled"]: nextValue }
          : c
      )
    )

    try {
      const res = await fetch("/api/account/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryKey, channel, enabled: nextValue }),
      })

      if (!res.ok) {
        throw new Error("Failed to save")
      }
      triggerSavedToast()
    } catch {
      setError("Failed to sync preference with server. Please check your network.")
      setTimeout(() => setError(null), 3000)
    } finally {
      setPendingMap((p) => {
        const copy = { ...p }
        delete copy[keyId]
        return copy
      })
    }
  }

  // Master action to enable/disable all channels
  async function handleBulkToggle(channel: "email" | "push" | "all", enable: boolean) {
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        email_enabled: channel === "push" ? c.email_enabled : enable,
        push_enabled: channel === "email" ? c.push_enabled : enable,
      }))
    )

    triggerSavedToast()

    // Sync in background
    try {
      for (const cat of categories) {
        if (channel === "all" || channel === "email") {
          fetch("/api/account/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: cat.key, channel: "email", enabled: enable }),
          }).catch(() => {})
        }
        if (channel === "all" || channel === "push") {
          fetch("/api/account/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: cat.key, channel: "push", enabled: enable }),
          }).catch(() => {})
        }
      }
    } catch {
      // Background sync
    }
  }

  const filteredCategories = categories.filter((c) => {
    if (activeTab === "all") return true
    return c.group === activeTab
  })

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Bell className="text-[#E57D37]" size={24} />
            <span>Notification Preferences</span>
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Control which alerts and emails you receive across web, mobile, and inbox.
          </p>
        </div>

        {/* Live status chip */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {savedToast ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-in fade-in zoom-in-95">
              <Check size={13} /> Saved live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
              <ShieldCheck size={13} className="text-[#E57D37]" /> Auto-saves
            </span>
          )}
        </div>
      </div>

      {/* Quick Controls Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/50">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all" ? "bg-white text-[#E57D37] shadow-sm font-black" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All Alerts ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("academic")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "academic" ? "bg-white text-[#E57D37] shadow-sm font-black" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Academic & Grades
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("course")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "course" ? "bg-white text-[#E57D37] shadow-sm font-black" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Course Updates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "admin" ? "bg-white text-[#E57D37] shadow-sm font-black" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Administrative
            </button>
          </div>

          {/* Quick toggle presets and Test button */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testingNotif}
              className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-gradient-to-r from-[#E57D37] to-[#EAAD62] hover:opacity-95 px-3.5 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {testingNotif ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>⚡ Send Test Notification</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleBulkToggle("all", true)}
              className="text-xs font-bold text-[#E57D37] hover:bg-[#E57D37]/10 px-3 py-1.5 rounded-xl border border-[#E57D37]/20 transition-all cursor-pointer"
            >
              Enable All
            </button>
            <button
              type="button"
              onClick={() => handleBulkToggle("all", false)}
              className="text-xs font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              Mute All
            </button>
          </div>
        </div>

        {/* Test Result Toast/Banner */}
        {testResult && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1 rounded-lg bg-[#E57D37] text-white">
                <CheckCircle2 size={16} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-950">Test Notification Dispatched</p>
                <div className="text-xs text-slate-700 space-y-0.5">
                  <p>
                    • <strong>In-app Bell</strong>: {testResult.pushEnabled ? "✅ Real-time badge updated in top-right navbar!" : "⏸️ Push alerts muted in preferences."}
                  </p>
                  <p>
                    • <strong>Email Delivery</strong>:{" "}
                    {!testResult.emailEnabled ? (
                      <span className="text-slate-500 font-semibold">⏸️ Announcements email channel disabled.</span>
                    ) : !testResult.hasResendKey ? (
                      <span className="text-amber-700 font-semibold">⚠️ RESEND_API_KEY not configured in .env.</span>
                    ) : testResult.emailSent ? (
                      <span className="text-emerald-700 font-semibold">✅ HTML email sent to {testResult.userEmail} via Resend.</span>
                    ) : testResult.emailError?.includes("lumbini.tech01@gmail.com") || testResult.emailError?.includes("testing emails") ? (
                      <span className="text-amber-800 font-medium">
                        ⚠️ <strong>Resend Sandbox Restriction</strong>: Free test API key only delivers to <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">lumbini.tech01@gmail.com</code>. To deliver to other emails ({testResult.userEmail}), verify a domain at <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="text-[#E57D37] underline font-bold">resend.com/domains</a>.
                      </span>
                    ) : (
                      <span className="text-rose-700 font-semibold">⚠️ Delivery failed: {testResult.emailError}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-amber-100/60 self-end sm:self-center cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Main List */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px] items-center gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
          <span>Activity Category</span>
          <span className="hidden sm:flex items-center justify-center gap-1.5 text-slate-600">
            <Mail size={14} className="text-[#E57D37]" /> Email
          </span>
          <span className="hidden sm:flex items-center justify-center gap-1.5 text-slate-600">
            <Smartphone size={14} className="text-[#E57D37]" /> Push
          </span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100">
          {filteredCategories.map((cat) => (
            <div
              key={cat.key}
              className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px] items-center gap-4 px-6 py-4.5 hover:bg-slate-50/50 transition-colors"
            >
              <div>
                <p className="text-sm font-bold text-slate-900 leading-snug">{cat.label}</p>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">{cat.description}</p>
              </div>

              {/* Email Toggle */}
              <div className="flex sm:justify-center items-center justify-between pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="text-xs font-bold text-slate-500 sm:hidden flex items-center gap-1.5">
                  <Mail size={13} className="text-[#E57D37]" /> Email:
                </span>
                <ModernToggle
                  checked={cat.email_enabled}
                  onChange={(next) => handleToggle(cat.key, "email", next)}
                  disabled={pendingMap[`${cat.key}:email`]}
                  label={`${cat.label} email notifications`}
                />
              </div>

              {/* Push Toggle */}
              <div className="flex sm:justify-center items-center justify-between pt-1 sm:pt-0">
                <span className="text-xs font-bold text-slate-500 sm:hidden flex items-center gap-1.5">
                  <Smartphone size={13} className="text-[#E57D37]" /> Push:
                </span>
                <ModernToggle
                  checked={cat.push_enabled}
                  onChange={(next) => handleToggle(cat.key, "push", next)}
                  disabled={pendingMap[`${cat.key}:push`]}
                  label={`${cat.label} push notifications`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-in fade-in">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
