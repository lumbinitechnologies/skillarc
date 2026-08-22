"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Pencil, Trash2, X, Check, Plus, Building2 } from "lucide-react"
import { createInstitution, deleteInstitution, updateInstitution } from "@/modules/org-admin/create-institution"

const STATUS_STYLES: Record<string, string> = {
  idle: "bg-editorial-blue bg-opacity-10 text-editorial-sky",
  loading: "bg-editorial-blue bg-opacity-10 text-editorial-sky",
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
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8"
    >
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[28px] border border-editorial-blue border-opacity-30 bg-editorial-navy bg-opacity-40 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-editorial-orange">Organization dashboard</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-editorial-cream">Manage institutions with ease</h1>
              <p className="mt-2 text-sm text-editorial-sky text-opacity-60">Track organization growth, faculty oversight, and student expansion in one place.</p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3">
          {statCards.map((card, idx) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              className="rounded-[24px] border border-[#3A6DAF]/20 bg-[#FFFFFF] shadow-[0_8px_24px_rgba(20,35,75,0.08)] p-5 transition duration-300"
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-3xl ${card.accent}`}>
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className="mt-4 text-2xl font-bold text-[#14234B]">{card.value}</p>
              <p className="mt-1 text-sm font-semibold text-[#94BAC4]">{card.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[28px] border border-[#3A6DAF]/20 bg-[#FFFFFF] p-6 shadow-[0_12px_28px_rgba(20,35,75,0.08)]">
            <div className="flex items-center gap-4 pb-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-[#E57D37]/10 text-[#E57D37]">
                <Plus size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#14234B]">New institution</p>
                <p className="text-sm text-[#94BAC4]">Launch an institution and invite an admin.</p>
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
                <label className="block text-sm font-semibold text-[#14234B]">Institution name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. RVCE, MIT Manipal"
                  className="mt-3 w-full rounded-3xl border border-[#3A6DAF]/20 bg-[#F8F9FB] px-4 py-3 text-sm text-[#14234B] outline-none transition focus:border-[#3A6DAF] focus:ring-4 focus:ring-[#3A6DAF]/10 placeholder:text-[#94BAC4]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#14234B]">Domain (optional)</label>
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. rvce.edu.in"
                  className="mt-3 w-full rounded-3xl border border-[#3A6DAF]/20 bg-[#F8F9FB] px-4 py-3 text-sm text-[#14234B] outline-none transition focus:border-[#3A6DAF] focus:ring-4 focus:ring-[#3A6DAF]/10 placeholder:text-[#94BAC4]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#14234B]">Admin email</label>
                <input
                  value={adminEmail}
                  type="email"
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@college.edu"
                  className="mt-3 w-full rounded-3xl border border-[#3A6DAF]/20 bg-[#F8F9FB] px-4 py-3 text-sm text-[#14234B] outline-none transition focus:border-[#3A6DAF] focus:ring-4 focus:ring-[#3A6DAF]/10 placeholder:text-[#94BAC4]"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={!isValid || createStatus === "loading"}
                className="mt-2 w-full rounded-3xl px-4 py-3 text-sm font-semibold text-editorial-navy transition disabled:cursor-not-allowed disabled:bg-editorial-sky disabled:bg-opacity-40 bg-gradient-to-r from-editorial-orange to-editorial-amber hover:shadow-lg hover:shadow-editorial-orange/20 active:scale-97 hover-button-scale"
              >
                {createStatus === "loading" ? "Creating institution..." : "Create Institution"}
              </button>
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[28px] border border-[#3A6DAF]/20 bg-[#FFFFFF] p-6 shadow-[0_12px_28px_rgba(20,35,75,0.08)]">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#E57D37]">Institution roster</p>
                <h2 className="mt-3 text-xl font-semibold text-[#14234B]">Active institutions</h2>
              </div>
              <span className="rounded-full bg-[#3A6DAF]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#94BAC4] border border-[#3A6DAF]/20">
                {initialInstitutions.length} total
              </span>
            </div>
            <div className="space-y-4">
              {initialInstitutions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#3A6DAF]/20 bg-[#F8F9FB] p-8 text-center text-sm text-[#94BAC4]">
                  No institutions yet.
                </div>
              ) : (
                initialInstitutions.map((inst) => (
                  <div key={inst.id} className="rounded-3xl border border-[#3A6DAF]/20 bg-[#F9FAFB] p-4 transition hover:border-[#E57D37]/30 hover:bg-[#E57D37]/5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#14234B] truncate">{inst.name}</p>
                        <p className="mt-1 text-sm text-[#94BAC4] truncate">{inst.domain ?? "No domain set"}</p>
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
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#3A6DAF]/20 bg-[#F8F9FB] px-4 text-sm font-semibold text-[#14234B] transition hover:bg-[#E8EFF7]"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(inst)}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#3A6DAF]/20 bg-[#F8F9FB] px-4 text-sm font-semibold text-[#14234B] transition hover:bg-[#E8EFF7]"
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
                          className="w-full rounded-3xl border border-[#3A6DAF]/20 bg-[#F8F9FB] px-4 py-3 text-sm text-[#14234B] outline-none transition focus:border-[#3A6DAF] focus:ring-4 focus:ring-[#3A6DAF]/10"
                        />
                        <input
                          value={editDomain}
                          onChange={(e) => setEditDomain(e.target.value)}
                          className="w-full rounded-3xl border border-[#3A6DAF]/20 bg-[#F8F9FB] px-4 py-3 text-sm text-[#14234B] outline-none transition focus:border-[#3A6DAF] focus:ring-4 focus:ring-[#3A6DAF]/10"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </motion.div>
  )
}