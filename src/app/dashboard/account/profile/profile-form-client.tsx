"use client"

import { useEffect, useState } from "react"
import { Loader2, Save, Plus, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ROLES } from "@/constants/roles"
import { roleGradients } from "../role-accent"

type Link = { label: string; url: string }

type ProfileData = {
  name: string
  email: string
  phone: string | null
  role: string
  profile_image_url: string | null
  pronouns: string
  bio: string
  links: Link[]
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function ProfileFormClient() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/account/profile")
        if (!res.ok) throw new Error("Failed to load profile")
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) setError("Couldn't load your profile. Try refreshing the page.")
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
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          pronouns: data.pronouns,
          bio: data.bio,
          links: data.links,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError("Couldn't save your changes. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  function updateLink(index: number, field: keyof Link, value: string) {
    if (!data) return
    const links = [...data.links]
    links[index] = { ...links[index], [field]: value }
    setData({ ...data, links })
  }

  function addLink() {
    if (!data) return
    setData({ ...data, links: [...data.links, { label: "", url: "" }] })
  }

  function removeLink(index: number) {
    if (!data) return
    setData({ ...data, links: data.links.filter((_, i) => i !== index) })
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
        {error ?? "Something went wrong loading your profile."}
      </div>
    )
  }

  const role = data.role as (typeof ROLES)[keyof typeof ROLES]
  const gradient = roleGradients[role] ?? "from-[#6c63ff] to-[#8b5cf6]"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-['Space_Grotesk'] text-2xl font-semibold tracking-tight text-foreground">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is how you show up to others across SkillArc.
        </p>
      </div>

      <div className="glass-panel flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
        <div className={`shrink-0 rounded-full bg-gradient-to-br ${gradient} p-[3px]`}>
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-card">
            {data.profile_image_url ? (
              <img src={data.profile_image_url} alt={data.name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-['Space_Grotesk'] text-xl font-semibold text-foreground">
                {getInitials(data.name || "U")}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full name</label>
              <Input
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Pronouns</label>
              <Input
                value={data.pronouns}
                onChange={(e) => setData({ ...data, pronouns: e.target.value })}
                placeholder="e.g. she/her"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
              <Input value={data.email} disabled className="opacity-60" />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Contact an admin to change your email address.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
              <Input
                value={data.phone ?? ""}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Biography</label>
            <textarea
              value={data.bio}
              onChange={(e) => setData({ ...data, bio: e.target.value })}
              placeholder="A short bio others will see on your profile"
              rows={3}
              className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-['Space_Grotesk'] text-base font-semibold text-foreground">Links</h2>
            <p className="text-xs text-muted-foreground">Portfolio, GitHub, LinkedIn — whatever's relevant.</p>
          </div>
          <Button variant="outline" size="sm" onClick={addLink} className="gap-1.5">
            <Plus size={14} /> Add link
          </Button>
        </div>

        {data.links.length === 0 ? (
          <p className="text-sm text-muted-foreground">No links added yet.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {data.links.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={link.label}
                  onChange={(e) => updateLink(i, "label", e.target.value)}
                  placeholder="Label (e.g. GitHub)"
                  className="w-40 shrink-0"
                />
                <Input
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="https://..."
                />
                <button
                  onClick={() => removeLink(i)}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                  aria-label="Remove link"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
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
