"use client"

import { useState, useEffect, useRef } from "react"
import { ShieldAlert, Users, School, Building2, UserCheck, X, ChevronRight, LogOut, Loader2 } from "lucide-react"

type ProfileContext = {
  id: string
  name: string
  email: string
  role: string
  institution_id: string | null
  organization_id: string | null
  is_timetable_builder: boolean
  is_impersonating: boolean
  original_role: string
  original_name: string
  is_super_admin: boolean
}

type ImpersonateOptions = {
  organizations: { id: string; name: string }[]
  institutions: { id: string; name: string; organization_id: string }[]
}

type UserOption = {
  id: string
  name: string
  email: string
}

export default function ImpersonationBanner() {
  const [profile, setProfile] = useState<ProfileContext | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ImpersonateOptions | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Switcher form states
  const [targetRole, setTargetRole] = useState("")
  const [selectedOrgId, setSelectedOrgId] = useState("")
  const [selectedInstId, setSelectedInstId] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [searchUserQuery, setSearchUserQuery] = useState("")

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/profile")
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
          if (data.is_super_admin) {
            // Set initial state from current impersonation
            setTargetRole(data.role)
            setSelectedOrgId(data.organization_id || "")
            setSelectedInstId(data.institution_id || "")
            setSelectedUserId(data.is_impersonating ? data.id : "")
          }
        }
      } catch (err) {
        console.error("Failed to fetch impersonation profile:", err)
      }
    }
    loadProfile()
  }, [])

  // Fetch dropdown options when modal is opened
  useEffect(() => {
    if (!isOpen || !profile?.is_super_admin) return
    async function loadOptions() {
      try {
        const res = await fetch("/api/super-admin/impersonate-options")
        if (res.ok) {
          const data = await res.json()
          setOptions(data)
        }
      } catch (err) {
        console.error("Failed to load impersonation options:", err)
      }
    }
    loadOptions()
  }, [isOpen, profile])

  // Fetch matching users dynamically based on role/inst/org selection
  useEffect(() => {
    if (!isOpen || !profile?.is_super_admin) return
    if (!["FACULTY", "STUDENT", "PARENT", "HOD", "PROGRAM_HEAD"].includes(targetRole)) {
      setUsers([])
      return
    }

    async function loadUsers() {
      setLoadingUsers(true)
      try {
        let url = `/api/super-admin/impersonated-users?role=${targetRole}`
        if (selectedOrgId) url += `&organization_id=${selectedOrgId}`
        if (selectedInstId) url += `&institution_id=${selectedInstId}`
        if (searchUserQuery) url += `&search=${encodeURIComponent(searchUserQuery)}`

        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setUsers(data.users || [])
        }
      } catch (err) {
        console.error("Failed to load users for impersonation switcher:", err)
      } finally {
        setLoadingUsers(false)
      }
    }

    const timer = setTimeout(loadUsers, 200)
    return () => clearTimeout(timer)
  }, [targetRole, selectedOrgId, selectedInstId, searchUserQuery, isOpen, profile])

  // Handle modal click outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleMouseDown)
    }
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [isOpen])

  if (!profile || !profile.is_super_admin) return null

  const isUserRequired = ["FACULTY", "STUDENT", "PARENT", "HOD", "PROGRAM_HEAD"].includes(targetRole)
  const isOrgRequired = targetRole === "ORG_ADMIN"
  const isInstRequired = ["INSTITUTION_ADMIN", "HOD", "PROGRAM_HEAD", "FACULTY", "STUDENT", "PARENT"].includes(targetRole)

  async function handleApply() {
    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: targetRole,
          organization_id: selectedOrgId || null,
          institution_id: selectedInstId || null,
          user_id: selectedUserId || null,
        }),
      })

      if (res.ok) {
        setIsOpen(false)
        window.location.href = "/dashboard"
      } else {
        alert("Failed to switch context")
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleClear() {
    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      })

      if (res.ok) {
        setIsOpen(false)
        window.location.href = "/dashboard"
      }
    } catch (err) {
      console.error(err)
    }
  }

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ORG_ADMIN: "Org Admin",
    INSTITUTION_ADMIN: "Institution Admin",
    HOD: "Head of Dept",
    PROGRAM_HEAD: "Program Head",
    FACULTY: "Faculty",
    STUDENT: "Student",
    PARENT: "Parent",
  }

  return (
    <>
      {/* Floating HUD Banner */}
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-2xl border border-amber-200/50 bg-white/70 px-5 py-3 shadow-[0_20px_50px_rgba(245,158,11,0.15)] backdrop-blur-xl transition hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(245,158,11,0.25)] select-none">
        <div className="flex items-center gap-2.5">
          <div className={`relative flex h-8 w-8 items-center justify-center rounded-xl ${profile.is_impersonating ? "bg-amber-100 text-amber-600 animate-pulse" : "bg-indigo-100 text-indigo-600"}`}>
            <ShieldAlert size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {profile.is_impersonating ? "Impersonation Mode Active" : "Super Admin Context"}
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {profile.is_impersonating ? (
                <>
                  Acting as <strong className="text-amber-700">{roleLabels[profile.role] || profile.role}</strong> ({profile.name})
                </>
              ) : (
                "Viewing global system dashboard"
              )}
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1 cursor-pointer rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-95"
          >
            Change Context
            <ChevronRight size={12} />
          </button>
          
          {profile.is_impersonating && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95"
            >
              <LogOut size={12} />
              Exit
            </button>
          )}
        </div>
      </div>

      {/* Switcher Glassmorphic Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-md">
          <div
            ref={modalRef}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">Context Switcher</h3>
                <p className="text-[11px] text-slate-500">Simulate any role, organization, or user dashboard</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              >
                <X size={14} />
              </button>
            </div>

            {/* Select Target Role */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Target Simulation Role</label>
              <div className="relative">
                <select
                  value={targetRole}
                  onChange={(e) => {
                    setTargetRole(e.target.value)
                    setSelectedUserId("")
                    setSearchUserQuery("")
                  }}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white"
                >
                  {Object.entries(roleLabels).map(([roleVal, roleLbl]) => (
                    <option key={roleVal} value={roleVal}>
                      {roleLbl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select Organization */}
            {isOrgRequired && (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Target Organization</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white"
                >
                  <option value="">Choose organization...</option>
                  {options?.organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      🏢 {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Select Institution */}
            {isInstRequired && (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Target Institution</label>
                <select
                  value={selectedInstId}
                  onChange={(e) => {
                    setSelectedInstId(e.target.value)
                    setSelectedUserId("")
                  }}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white"
                >
                  <option value="">Choose institution...</option>
                  {options?.institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      🏫 {inst.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Select User (searchable) */}
            {isUserRequired && (
              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Target User to Impersonate (Optional)
                </label>
                
                {/* Search input */}
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none transition focus:border-indigo-500 focus:bg-white"
                />

                {/* Dropdown list */}
                <div className="relative">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="">Keep current user details / Choose user...</option>
                    {users.map((usr) => (
                      <option key={usr.id} value={usr.id}>
                        👤 {usr.name} ({usr.email})
                      </option>
                    ))}
                  </select>
                  
                  {loadingUsers && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Loader2 size={12} className="animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-98"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleApply}
                disabled={
                  (isOrgRequired && !selectedOrgId) ||
                  (isInstRequired && !selectedInstId)
                }
                className="flex-1 cursor-pointer rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Context
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
