"use client"

import { useEffect, useState, useRef } from "react"
import {
  Loader2,
  Save,
  Plus,
  X,
  Check,
  Camera,
  Trash2,
  Sparkles,
  UploadCloud,
  Image as ImageIcon,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ROLES } from "@/constants/roles"
import { roleGradients, roleLabels } from "../role-accent"
import { ImageCropperModal } from "@/components/account/image-cropper-modal"

type LinkItem = { label: string; url: string }

type ProfileData = {
  id?: string
  name: string
  email: string
  phone: string | null
  role: string
  profile_image_url: string | null
  pronouns: string
  bio: string
  links: LinkItem[]
}

const PRESET_AVATARS = [
  { id: "p1", name: "Cyber Tech", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=b6e3f4,c0aede,d1d4f9" },
  { id: "p2", name: "Neo Bot", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Luna&backgroundColor=ffd5dc,ffdfbf" },
  { id: "p3", name: "Lorelei Star", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Avery&backgroundColor=b6e3f4,c0aede" },
  { id: "p4", name: "Lorelei Glow", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Jordan&backgroundColor=ffd5dc,ffdfbf" },
  { id: "p5", name: "Adventurer Sam", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Alex&backgroundColor=b6e3f4" },
  { id: "p6", name: "Adventurer Max", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sam&backgroundColor=ffd5dc" },
  { id: "p7", name: "Minimalist Gray", url: "https://api.dicebear.com/7.x/notionists/svg?seed=Charlie&backgroundColor=d1d4f9" },
  { id: "p8", name: "Minimalist Cool", url: "https://api.dicebear.com/7.x/notionists/svg?seed=Morgan&backgroundColor=b6e3f4" },
  { id: "p9", name: "Smile Joy", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sparky" },
  { id: "p10", name: "Star Energy", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Blaze" },
  { id: "p11", name: "Modernist Cyan", url: "https://api.dicebear.com/7.x/micah/svg?seed=Taylor&backgroundColor=c0aede" },
  { id: "p12", name: "Modernist Sunset", url: "https://api.dicebear.com/7.x/micah/svg?seed=Riley&backgroundColor=ffdfbf" },
]

function getInitials(name: string) {
  return (name || "U")
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Custom Image Cropper State
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState("avatar.jpg")

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/account/profile")
        if (!res.ok) throw new Error("Failed to load profile")
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
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

  function handleFileSelected(file: File) {
    if (!data) return
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WebP, GIF, SVG).")
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("File exceeds the 8 MB limit.")
      return
    }

    setError(null)
    const objectUrl = URL.createObjectURL(file)
    setCropImageSrc(objectUrl)
    setCropFileName(file.name)
    setCropModalOpen(true)
  }

  async function handleUploadCroppedFile(croppedFile: File) {
    if (!data) return
    setUploadingAvatar(true)
    setError(null)
    setStatusMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", croppedFile)

      const res = await fetch("/api/account/avatar", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload avatar")
      }

      setData((prev) => (prev ? { ...prev, profile_image_url: json.profile_image_url } : null))
      setStatusMessage("Profile picture cropped and updated successfully!")
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err: any) {
      setError(err?.message || "Failed to upload picture. Please try again.")
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleSelectPreset(presetUrl: string) {
    if (!data) return
    setUploadingAvatar(true)
    setError(null)

    try {
      const res = await fetch("/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: presetUrl }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to set preset avatar")

      setData((prev) => (prev ? { ...prev, profile_image_url: json.profile_image_url } : null))
      setShowPresets(false)
      setStatusMessage("Avatar preset applied!")
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err: any) {
      setError(err?.message || "Failed to set preset avatar.")
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleRemoveAvatar() {
    if (!data || !data.profile_image_url) return
    setUploadingAvatar(true)
    setError(null)

    try {
      const res = await fetch("/api/account/avatar", {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to remove avatar")

      setData((prev) => (prev ? { ...prev, profile_image_url: null } : null))
      setStatusMessage("Profile picture removed.")
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err: any) {
      setError(err?.message || "Failed to remove avatar.")
    } finally {
      setUploadingAvatar(false)
    }
  }

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
          profile_image_url: data.profile_image_url,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Save failed")
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err?.message || "Couldn't save your changes. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  function updateLink(index: number, field: keyof LinkItem, value: string) {
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
      <div className="glass-panel flex h-72 items-center justify-center rounded-3xl border border-slate-200/80 bg-white/80 p-8 shadow-sm">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="glass-panel rounded-3xl border border-red-100 bg-red-50/50 p-8 text-sm text-destructive">
        {error ?? "Something went wrong loading your profile."}
      </div>
    )
  }

  const role = data.role as (typeof ROLES)[keyof typeof ROLES]
  const gradient = roleGradients[role] ?? "from-[#E57D37] to-[#EAAD62]"
  const roleLabel = roleLabels[role] ?? role.replace(/_/g, " ")

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#E57D37]">
          Account Management
        </div>
        <h1 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Profile & Identity
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage how your name, photo, and identity appear to faculty, staff, and peers across SkillArc.
        </p>
      </div>

      {/* Status or Error alerts */}
      {statusMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 animate-in fade-in duration-200">
          <Check size={16} className="text-emerald-600 shrink-0" />
          {statusMessage}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 animate-in fade-in duration-200">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          {error}
        </div>
      )}

      {/* Profile Picture & Visual Identity Card */}
      <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl">
        <h2 className="font-['Space_Grotesk'] text-lg font-bold text-slate-900">
          Profile Picture
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Upload a clear photo or select a personalized avatar preset. (Max 5MB • JPG, PNG, WebP, SVG)
        </p>

        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          {/* Avatar circle */}
          <div
            className={`group relative shrink-0 cursor-pointer rounded-full bg-gradient-to-br ${gradient} p-[3px] shadow-lg transition-transform hover:scale-105`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              if (e.dataTransfer.files?.[0]) {
                handleFileSelected(e.dataTransfer.files[0])
              }
            }}
          >
            <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-700 sm:h-32 sm:w-32">
              {data.profile_image_url ? (
                <img
                  src={data.profile_image_url}
                  alt={data.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-['Space_Grotesk'] text-3xl font-bold text-slate-800">
                  {getInitials(data.name)}
                </span>
              )}

              {/* Hover overlay */}
              <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100 ${dragOver ? "opacity-100 bg-black/60" : ""}`}>
                {uploadingAvatar ? (
                  <Loader2 className="animate-spin text-white" size={24} />
                ) : (
                  <>
                    <Camera size={22} />
                    <span className="mt-1 text-[11px] font-semibold">Change</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#E57D37] text-white shadow-md transition hover:bg-[#d46b28]"
              title="Upload picture"
            >
              <Camera size={15} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileSelected(e.target.files[0])
              }
            }}
          />

          {/* Action buttons */}
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 rounded-xl bg-[#E57D37] px-4 py-2 font-medium text-white hover:bg-[#d46b28]"
              >
                {uploadingAvatar ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                Upload Photo
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPresets(!showPresets)}
                className="gap-2 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Sparkles size={15} className="text-amber-500" />
                {showPresets ? "Hide Presets" : "Choose Avatar Preset"}
              </Button>

              {data.profile_image_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={handleRemoveAvatar}
                  className="gap-1.5 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 size={15} />
                  Remove
                </Button>
              )}
            </div>

            <div className="text-xs text-slate-500">
              Your avatar helps instructors, administrators, and classmates identify you across courses, chats, and assignments.
            </div>
          </div>
        </div>

        {/* Preset Avatars Drawer */}
        {showPresets && (
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/40 p-5 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Pick a Curated 3D / Vector Avatar
              </span>
              <button
                type="button"
                onClick={() => setShowPresets(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {PRESET_AVATARS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.url)}
                  disabled={uploadingAvatar}
                  className={`group flex flex-col items-center rounded-2xl border bg-white p-2.5 transition hover:scale-105 hover:shadow-md ${
                    data.profile_image_url === preset.url
                      ? "border-[#E57D37] ring-2 ring-[#E57D37]/30"
                      : "border-slate-200 hover:border-amber-300"
                  }`}
                >
                  <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-50">
                    <img src={preset.url} alt={preset.name} className="h-full w-full object-cover" />
                  </div>
                  <span className="mt-1.5 truncate text-[11px] font-medium text-slate-600 group-hover:text-[#E57D37]">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Core Profile Details */}
      <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl space-y-5">
        <h2 className="font-['Space_Grotesk'] text-lg font-bold text-slate-900">
          Personal Information
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Full Name
            </label>
            <Input
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              placeholder="Your full name"
              className="rounded-xl border-slate-200 bg-slate-50/60 focus-visible:bg-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Pronouns
            </label>
            <Input
              value={data.pronouns}
              onChange={(e) => setData({ ...data, pronouns: e.target.value })}
              placeholder="e.g. they/them, she/her, he/him"
              className="rounded-xl border-slate-200 bg-slate-50/60 focus-visible:bg-white"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Email Address
              </label>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                Managed by Org
              </span>
            </div>
            <Input value={data.email} disabled className="rounded-xl border-slate-200 bg-slate-100/70 opacity-80" />
            <p className="mt-1 text-[11px] text-slate-400">
              Primary email address used for sign-in and system notifications.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Phone Number
            </label>
            <Input
              value={data.phone ?? ""}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className="rounded-xl border-slate-200 bg-slate-50/60 focus-visible:bg-white"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Optional contact number for emergency and SMS updates.
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Biography
            </label>
            <span className="text-[11px] text-slate-400">
              {data.bio.length}/500
            </span>
          </div>
          <textarea
            value={data.bio}
            maxLength={500}
            onChange={(e) => setData({ ...data, bio: e.target.value })}
            placeholder="A short introduction others will see on your institutional profile..."
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Social & Portfolio Links */}
      <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-['Space_Grotesk'] text-lg font-bold text-slate-900">
              Social & Portfolio Links
            </h2>
            <p className="text-xs text-slate-500">
              Showcase your GitHub, LinkedIn, personal website, or research portfolio.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLink}
            className="gap-1.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Plus size={14} /> Add Link
          </Button>
        </div>

        {data.links.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
            No external links added yet. Click &quot;Add Link&quot; to link your website or social profiles.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.links.map((link, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Input
                  value={link.label}
                  onChange={(e) => updateLink(i, "label", e.target.value)}
                  placeholder="Label (e.g. GitHub)"
                  className="w-36 shrink-0 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:bg-white"
                />
                <Input
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:bg-white"
                />
                {link.url && (
                  <a
                    href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    title="Open link in new tab"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Remove link"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Action Bar */}
      <div className="flex items-center gap-4 pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="gap-2 rounded-2xl bg-[#E57D37] px-6 py-3 font-semibold text-white shadow-md hover:bg-[#d46b28] disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </Button>

        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 animate-in fade-in duration-200">
            <Check size={16} className="text-emerald-600" />
            Changes saved successfully!
          </span>
        )}
      </div>

      {/* Interactive Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        fileName={cropFileName}
        onClose={() => {
          setCropModalOpen(false)
          setCropImageSrc(null)
        }}
        onCropComplete={(croppedFile) => {
          handleUploadCroppedFile(croppedFile)
        }}
      />
    </div>
  )
}
