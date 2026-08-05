"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, X, Check, Plus, Building2 } from "lucide-react"
import { createInstitution, deleteInstitution, updateInstitution } from "@/modules/org-admin/create-institution"

const STATUS_STYLES: Record<string, string> = {
  idle: "bg-slate-50 text-slate-600",
  loading: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-700",
  error: "bg-rose-50 text-rose-700",
}

type Status = "idle" | "loading" | "success" | "error"

interface Institution { id: string; name: string; domain: string | null }
interface Stats { institutions: number; faculty: number; students: number }

export default function OrgAdminDashboardClient({
  institutions: initialInstitutions,
  stats,
}: {
  institutions: Institution[]
  stats: Stats
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [domain, setDomain] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [createStatus, setCreateStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDomain, setEditDomain] = useState("")

  const isValid = name.trim().length > 0 && adminEmail.trim().length > 0

  async function handleCreate() {
    if (!isValid) return
    setCreateStatus("loading")
    setErrorMsg("")
    const res = await createInstitution({ name, domain: domain || undefined, adminEmail })
    if (res && !res.success) {
      setErrorMsg(res.error || "Something went wrong.")
      setCreateStatus("error")
    } else {
      setCreateStatus("success")
      setName("")
      setDomain("")
      setAdminEmail("")
      startTransition(() => router.refresh())
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteInstitution(id)
    if (res && !res.success) {
      alert(res.error || "Failed to delete institution")
    } else {
      setEditingId(null)
      startTransition(() => router.refresh())
    }
  }

  async function handleEdit(id: string) {
    const res = await updateInstitution(id, { name: editName, domain: editDomain || undefined })
    if (res && !res.success) {
      alert(res.error || "Failed to update institution")
    } else {
      setEditingId(null)
      startTransition(() => router.refresh())
    }
  }

  function startEdit(inst: Institution) {
    setEditingId(inst.id)
    setEditName(inst.name)
    setEditDomain(inst.domain ?? "")
  }

  const statCards = [
    { label: "Institutions", value: stats.institutions, accent: "bg-sky-100 text-sky-700", icon: "🏛️" },
    { label: "Faculty", value: stats.faculty, accent: "bg-emerald-100 text-emerald-700", icon: "👨‍🏫" },
    { label: "Students", value: stats.students, accent: "bg-violet-100 text-violet-700", icon: "🎓" },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Organization dashboard</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">Manage institutions with ease</h1>
              <p className="mt-2 text-sm text-slate-500">Track organization growth, faculty oversight, and student expansion in one place.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-sm">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-3xl ${card.accent}`}>
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-950">{card.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-4 pb-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-700">
                <Plus size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">New institution</p>
                <p className="text-sm text-slate-500">Launch an institution and invite an admin.</p>
              </div>
            </div>

            {createStatus !== "idle" && (
              <div className={`mb-5 rounded-3xl p-4 ${STATUS_STYLES[createStatus]}`}>
                {createStatus === "success" && "Institution created & admin invited!"}
                {createStatus === "error" && errorMsg}
                {createStatus === "loading" && "Creating institution..."}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Institution name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. RVCE, MIT Manipal"
                  className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Domain (optional)</label>
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. rvce.edu.in"
                  className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Admin email</label>
                <input
                  value={adminEmail}
                  type="email"
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@college.edu"
                  className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={!isValid || createStatus === "loading"}
                className="mt-2 w-full rounded-3xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400 bg-indigo-600 hover:bg-indigo-700"
              >
                {createStatus === "loading" ? "Creating institution..." : "Create Institution"}
              </button>
            </div>
          </aside>

          <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Institution roster</p>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">Active institutions</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                {initialInstitutions.length} total
              </span>
            </div>
            <div className="space-y-4">
              {initialInstitutions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  No institutions yet.
                </div>
              ) : (
                initialInstitutions.map((inst) => (
                  <div key={inst.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950 truncate">{inst.name}</p>
                        <p className="mt-1 text-sm text-slate-500 truncate">{inst.domain ?? "No domain set"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {editingId === inst.id ? (
                          <>
                            <button
                              onClick={() => handleEdit(inst.id)}
                              className="inline-flex h-10 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(inst)}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(inst.id)}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {editingId === inst.id && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        />
                        <input
                          value={editDomain}
                          onChange={(e) => setEditDomain(e.target.value)}
                          className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                        />
                      </div>
                    )}
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