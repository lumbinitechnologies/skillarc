"use client"

import { useEffect, useState } from "react"
import { Loader2, Save, Check, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Login = { provider: string; identifier: string }

type SettingsData = {
  full_name: string
  display_name: string
  sortable_name: string
  language: string
  timezone: string
  email: string
  logins: Login[]
}

const LANGUAGES = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
]

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "UTC",
]

const selectClasses =
  "w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"

export function SettingsFormClient() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/account/settings")
        if (!res.ok) throw new Error("Failed to load settings")
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setError("Couldn't load your settings. Try refreshing the page.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    if (!data) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/account/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: data.display_name,
          sortable_name: data.sortable_name,
          language: data.language,
          timezone: data.timezone,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError("Couldn't save your changes. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-panel flex h-64 items-center justify-center p-6">
        <Loader2 className="animate-spin text-muted-foreground" size={22} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="glass-panel p-6 text-sm text-destructive">
        {error ?? "Something went wrong loading your settings."}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-['Space_Grotesk'] text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controls how your name displays and what locale you see the app in.
        </p>
      </div>

      <div className="glass-panel flex flex-col gap-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full name</label>
            <Input value={data.full_name} disabled className="opacity-60" />
            <p className="mt-1 text-[11px] text-muted-foreground">Used for grading. Edit this from the Profile tab.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Display name</label>
            <Input
              value={data.display_name}
              onChange={(e) => setData({ ...data, display_name: e.target.value })}
              placeholder="Name shown in discussions and chat"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sortable name</label>
            <Input
              value={data.sortable_name}
              onChange={(e) => setData({ ...data, sortable_name: e.target.value })}
              placeholder="e.g. Lastname, Firstname"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Used when your name appears in sorted lists.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Language</label>
            <select
              className={selectClasses}
              value={data.language}
              onChange={(e) => setData({ ...data, language: e.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Time zone</label>
            <select
              className={selectClasses}
              value={data.timezone}
              onChange={(e) => setData({ ...data, timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound size={16} className="text-muted-foreground" />
          <h2 className="font-['Space_Grotesk'] text-base font-semibold text-foreground">Ways to log in</h2>
        </div>

        {data.logins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No linked login methods found.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Provider</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Login</th>
                </tr>
              </thead>
              <tbody>
                {data.logins.map((login, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-2.5 capitalize text-foreground">{login.provider}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{login.identifier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save changes
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <Check size={15} /> Saved
          </span>
        )}
      </div>
    </div>
  )
}
