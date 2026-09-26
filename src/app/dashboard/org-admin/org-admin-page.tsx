"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, X, Check, Plus, Building2 } from "lucide-react"
import { createInstitution, deleteInstitution, updateInstitution } from "@/modules/org-admin/create-institution"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"
type Status = "idle" | "loading" | "success" | "error"

interface Institution { id: string; name: string; domain: string | null }
interface Stats { institutions: number; faculty: number; students: number }

export default function OrgAdminPage({
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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isValid = name.trim().length > 0 && adminEmail.trim().length > 0

  async function handleCreate() {
    if (!isValid) return
    setCreateStatus("loading")
    setErrorMsg("")
    try {
      await createInstitution({ name, domain: domain || undefined, adminEmail })
      setCreateStatus("success")
      setName("")
      setDomain("")
      setAdminEmail("")
      startTransition(() => router.refresh())
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong.")
      setCreateStatus("error")
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await deleteInstitution(id)
      if (res && !res.success) {
        alert(res.error || "Failed to delete institution")
      } else {
        setDeletingId(null)
        startTransition(() => router.refresh())
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete institution")
    }
  }

  async function handleEdit(id: string) {
    try {
      await updateInstitution(id, { name: editName, domain: editDomain || undefined })
      setEditingId(null)
      startTransition(() => router.refresh())
    } catch (err: any) {
      alert(err?.message)
    }
  }

  function startEdit(inst: Institution) {
    setEditingId(inst.id)
    setEditName(inst.name)
    setEditDomain(inst.domain ?? "")
  }

  const statCards = [
    { label: "Institutions", value: stats.institutions, accent: "#dbeafe", text: "#1d4ed8", icon: "🏛️" },
    { label: "Faculty",      value: stats.faculty,      accent: "#d1fae5", text: "#065f46", icon: "👨‍🏫" },
    { label: "Students",     value: stats.students,     accent: "#fef3c7", text: "#b45309", icon: "🎓" },
  ]

  return (
    <div style={{ fontFamily: font, maxWidth: 960, margin: "0 auto" }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", marginBottom: 4 }}>
          Organization Dashboard
        </h1>
        <p style={{ fontSize: 12, color: "#9ca3af" }}>Manage your institutions and organization settings</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            backgroundColor: "#ffffff", borderRadius: 14, padding: "18px 20px",
            border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11, backgroundColor: s.accent,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: s.text, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, alignItems: "start" }}>

        <div style={{
          backgroundColor: "#ffffff", borderRadius: 16, padding: 24,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f3f4f6",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Plus size={17} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>New Institution</p>
              <p style={{ fontSize: 11, color: "#9ca3af" }}>Add to your organization</p>
            </div>
          </div>

          {createStatus === "success" && (
            <div style={{
              backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 8, padding: "10px 14px", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>🎉</span>
              <p style={{ fontSize: 12, color: "#166534", margin: 0, fontWeight: 500 }}>Institution created & admin invited!</p>
            </div>
          )}

          {createStatus === "error" && (
            <div style={{
              backgroundColor: "#fee2e2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 14px", marginBottom: 16,
            }}>
              <p style={{ fontSize: 12, color: "#991b1b", margin: 0 }}>{errorMsg}</p>
            </div>
          )}

          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 5, display: "block" }}>
            Institution Name <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            placeholder="e.g. RVCE, MIT Manipal"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            style={{
              width: "100%", padding: "9px 12px", fontSize: 13,
              border: "1px solid #e5e7eb", borderRadius: 10,
              backgroundColor: "#f9fafb", color: "#111827",
              outline: "none", marginBottom: 12, boxSizing: "border-box", fontFamily: font,
            }}
          />

          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 5, display: "block" }}>
            Domain <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            placeholder="e.g. rvce.edu.in"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", fontSize: 13,
              border: "1px solid #e5e7eb", borderRadius: 10,
              backgroundColor: "#f9fafb", color: "#111827",
              outline: "none", marginBottom: 12, boxSizing: "border-box", fontFamily: font,
            }}
          />

          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 5, display: "block" }}>
            Admin Email <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            placeholder="admin@college.edu"
            value={adminEmail}
            type="email"
            onChange={e => setAdminEmail(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", fontSize: 13,
              border: "1px solid #e5e7eb", borderRadius: 10,
              backgroundColor: "#f9fafb", color: "#111827",
              outline: "none", marginBottom: 16, boxSizing: "border-box", fontFamily: font,
            }}
          />

          <button
            onClick={handleCreate}
            disabled={!isValid || createStatus === "loading"}
            style={{
              width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700,
              color: "#ffffff",
              backgroundColor: !isValid ? "#e5e7eb" : createStatus === "loading" ? "#93c5fd" : "#1d4ed8",
              border: "none", borderRadius: 10,
              cursor: !isValid || createStatus === "loading" ? "not-allowed" : "pointer",
              transition: "background 0.15s", fontFamily: font,
            }}
          >
            {createStatus === "loading" ? "Creating…" : "Create Institution"}
          </button>
        </div>

        <div style={{
          backgroundColor: "#ffffff", borderRadius: 16, padding: 24,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f3f4f6",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, backgroundColor: "#ede9fe",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Building2 size={17} color="#6d28d9" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Institutions</p>
              <p style={{ fontSize: 11, color: "#9ca3af" }}>{initialInstitutions.length} total</p>
            </div>
          </div>

          {initialInstitutions.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "32px 0",
              border: "1.5px dashed #e5e7eb", borderRadius: 12,
            }}>
              <p style={{ fontSize: 13, color: "#9ca3af" }}>No institutions yet</p>
              <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 4 }}>Create one to get started</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {initialInstitutions.map(inst => (
                <div key={inst.id} style={{
                  border: "1px solid #f3f4f6", borderRadius: 12, padding: "12px 14px",
                  display: "flex", alignItems: "center", gap: 12,
                  backgroundColor: editingId === inst.id ? "#fafafa" : "#fff",
                  transition: "background 0.15s",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, backgroundColor: "#dbeafe",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, flexShrink: 0,
                  }}>
                    🏛️
                  </div>

                  {editingId === inst.id ? (
                    <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{
                          flex: 1, padding: "6px 10px", fontSize: 12,
                          border: "1px solid #c7d2fe", borderRadius: 8,
                          outline: "none", fontFamily: font, color: "#111827",
                        }}
                      />
                      <input
                        value={editDomain}
                        onChange={e => setEditDomain(e.target.value)}
                        placeholder="domain (optional)"
                        style={{
                          width: 130, padding: "6px 10px", fontSize: 12,
                          border: "1px solid #e5e7eb", borderRadius: 8,
                          outline: "none", fontFamily: font, color: "#6b7280",
                        }}
                      />
                      <button
                        onClick={() => handleEdit(inst.id)}
                        style={{
                          width: 28, height: 28, borderRadius: 7, border: "none",
                          backgroundColor: "#1d4ed8", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Check size={13} color="#fff" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          width: 28, height: 28, borderRadius: 7, border: "1px solid #e5e7eb",
                          backgroundColor: "#fff", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <X size={13} color="#9ca3af" />
                      </button>
                    </div>
                  ) : (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inst.name}
                      </p>
                      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                        {inst.domain ?? "No domain set"}
                      </p>
                    </div>
                  )}

                  {editingId !== inst.id && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => startEdit(inst)}
                        style={{
                          width: 28, height: 28, borderRadius: 7, border: "1px solid #e5e7eb",
                          backgroundColor: "#fff", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        onMouseEnter={e => { (e.currentTarget.style.backgroundColor = "#f0f9ff"); (e.currentTarget.style.borderColor = "#bae6fd") }}
                        onMouseLeave={e => { (e.currentTarget.style.backgroundColor = "#fff"); (e.currentTarget.style.borderColor = "#e5e7eb") }}
                      >
                        <Pencil size={12} color="#6b7280" />
                      </button>

                      {deletingId === inst.id ? (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>Sure?</span>
                          <button
                            onClick={() => handleDelete(inst.id)}
                            style={{
                              padding: "4px 8px", borderRadius: 6, border: "none",
                              backgroundColor: "#ef4444", color: "#fff",
                              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: font,
                            }}
                          >Yes</button>
                          <button
                            onClick={() => setDeletingId(null)}
                            style={{
                              padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb",
                              backgroundColor: "#fff", fontSize: 11, fontWeight: 600,
                              cursor: "pointer", fontFamily: font, color: "#6b7280",
                            }}
                          >No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(inst.id)}
                          style={{
                            width: 28, height: 28, borderRadius: 7, border: "1px solid #e5e7eb",
                            backgroundColor: "#fff", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                          onMouseEnter={e => { (e.currentTarget.style.backgroundColor = "#fff1f2"); (e.currentTarget.style.borderColor = "#fecaca") }}
                          onMouseLeave={e => { (e.currentTarget.style.backgroundColor = "#fff"); (e.currentTarget.style.borderColor = "#e5e7eb") }}
                        >
                          <Trash2 size={12} color="#ef4444" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}