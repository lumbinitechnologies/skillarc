"use client"

import { useEffect, useState } from "react"
import { Loader2, Mail, Smartphone } from "lucide-react"

type Category = {
  key: string
  label: string
  description: string
  email_enabled: boolean
  push_enabled: boolean
}

function ToggleSwitch({
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
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-1"
        }`}
      />
    </button>
  )
}

export function NotificationsFormClient() {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/account/notifications")
        if (!res.ok) throw new Error("Failed to load notification preferences")
        const json = await res.json()
        if (!cancelled) setCategories(json.categories)
      } catch {
        if (!cancelled) setError("Couldn't load your notification preferences. Try refreshing the page.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleToggle(category: string, channel: "email" | "push", nextValue: boolean) {
    if (!categories) return

    const prev = categories
    const pendingId = `${category}:${channel}`
    setPendingKey(pendingId)

    setCategories(
      categories.map((c) =>
        c.key === category
          ? { ...c, [channel === "email" ? "email_enabled" : "push_enabled"]: nextValue }
          : c
      )
    )

    try {
      const res = await fetch("/api/account/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, channel, enabled: nextValue }),
      })
      if (!res.ok) throw new Error("Save failed")
    } catch {
      setCategories(prev)
      setError("Couldn't save that change. Please try again.")
      setTimeout(() => setError(null), 3000)
    } finally {
      setPendingKey(null)
    }
  }

  if (loading) {
    return (
      <div className="glass-panel flex h-64 items-center justify-center p-6">
        <Loader2 className="animate-spin text-muted-foreground" size={22} />
      </div>
    )
  }

  if (!categories) {
    return (
      <div className="glass-panel p-6 text-sm text-destructive">
        {error ?? "Something went wrong loading your notification preferences."}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-['Space_Grotesk'] text-2xl font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what you're notified about, and where. Changes save immediately.
        </p>
      </div>

      <div className="glass-panel overflow-hidden p-0">
        <div className="grid grid-cols-[1fr_72px_72px] items-center gap-4 border-b border-border px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>Activity</span>
          <span className="flex items-center justify-center gap-1.5">
            <Mail size={14} /> Email
          </span>
          <span className="flex items-center justify-center gap-1.5">
            <Smartphone size={14} /> Push
          </span>
        </div>

        <div className="divide-y divide-border">
          {categories.map((cat) => (
            <div key={cat.key} className="grid grid-cols-[1fr_72px_72px] items-center gap-4 px-6 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              <div className="flex justify-center">
                <ToggleSwitch
                  checked={cat.email_enabled}
                  onChange={(next) => handleToggle(cat.key, "email", next)}
                  disabled={pendingKey === `${cat.key}:email`}
                  label={`${cat.label} email notifications`}
                />
              </div>
              <div className="flex justify-center">
                <ToggleSwitch
                  checked={cat.push_enabled}
                  onChange={(next) => handleToggle(cat.key, "push", next)}
                  disabled={pendingKey === `${cat.key}:push`}
                  label={`${cat.label} push notifications`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
