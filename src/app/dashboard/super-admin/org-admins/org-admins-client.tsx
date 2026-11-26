"use client"

import { useCurrentTime } from "@/hooks/use-current-time"

import { useState, useTransition } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────
type OrgAdmin = {
  id: string
  name: string
  email: string
  created_at: string
  organization_id: string
  organization_name: string
  last_login?: string
}

type Organization = { id: string; name: string }

type Props = {
  orgAdmins: OrgAdmin[]
  organizations: Organization[]
  onCreateAdmin: (data: { name: string; email: string; password: string; organization_id: string }) => Promise<{ success: boolean; admin?: OrgAdmin; error?: string }>
  onDeleteAdmin?: (id: string) => Promise<{ success: boolean; error?: string }>
  onResetPassword?: (id: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d: string) { return new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) }
function initials(name: string) { return name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2) }

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, width:"100%", maxWidth:480, padding:"28px 32px", boxShadow:"0 20px 40px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:"#111827" }}>{title}</h2>
            <p style={{ margin:"4px 0 0", fontSize:12, color:"#9ca3af" }}>{subtitle}</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:"#9ca3af", padding:4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Toast({ message, type }: { message: string; type: "success"|"error" }) {
  return (
    <div style={{ position:"fixed", bottom:32, right:32, background: type==="success" ? "#7c3aed" : "#dc2626", color:"#fff", padding:"12px 20px", borderRadius:12, fontSize:14, fontWeight:500, zIndex:200, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", display:"flex", alignItems:"center", gap:8 }}>
      <span>{type==="success" ? "✓" : "✕"}</span>{message}
    </div>
  )
}

const inputStyle: React.CSSProperties = { width:"100%", padding:"9px 12px", fontSize:14, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", boxSizing:"border-box" }
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom:16 }}>
    <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#111827", marginBottom:6 }}>{label}</label>
    {children}
  </div>
)

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrgAdminsPage({ orgAdmins: initial = [], organizations = [], onCreateAdmin, onDeleteAdmin, onResetPassword }: Props) {
  const now = useCurrentTime()
  const [admins, setAdmins] = useState(initial ?? [])
  const [search, setSearch] = useState("")
  const [filterOrg, setFilterOrg] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [resetTarget, setResetTarget] = useState<OrgAdmin | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgAdmin | null>(null)
  const [toast, setToast] = useState<{ message: string; type:"success"|"error" } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form
  const [name, setName] = useState(""); const [email, setEmail] = useState("")
  const [password, setPassword] = useState(""); const [orgId, setOrgId] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [formError, setFormError] = useState("")

  const filtered = admins.filter(a =>
    (a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())) &&
    (!filterOrg || a.organization_id === filterOrg)
  )

  function showToast(msg: string, type: "success"|"error") { setToast({ message:msg, type }); setTimeout(()=>setToast(null), 3500) }

  async function handleCreate() {
    if (!name.trim()) { setFormError("Full name required."); return }
    if (!email.trim()) { setFormError("Email required."); return }
    if (password.length < 8) { setFormError("Password min 8 chars."); return }
    if (!orgId) { setFormError("Select an organization."); return }
    setFormError("")
    startTransition(async () => {
      const res = await onCreateAdmin({ name: name.trim(), email: email.trim(), password, organization_id: orgId })
      if (res.success && res.admin) {
        setAdmins(prev => [res.admin!, ...prev])
        setName(""); setEmail(""); setPassword(""); setOrgId(""); setShowCreate(false)
        showToast(`Admin "${res.admin.name}" created`, "success")
      } else { setFormError(res.error ?? "Failed"); showToast(res.error ?? "Failed", "error") }
    })
  }

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 8 || !resetTarget) { setFormError("Password min 8 chars."); return }
    setFormError("")
    startTransition(async () => {
      const res = await onResetPassword?.(resetTarget.id, newPassword)
      if (res?.success) { setResetTarget(null); setNewPassword(""); showToast("Password reset successfully", "success") }
      else { setFormError(res?.error ?? "Failed") }
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const res = await onDeleteAdmin?.(deleteTarget.id)
      if (res?.success) { setAdmins(prev=>prev.filter(a=>a.id!==deleteTarget.id)); setDeleteTarget(null); showToast("Admin removed", "success") }
      else { showToast(res?.error ?? "Failed", "error"); setDeleteTarget(null) }
    })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .oa-page * { box-sizing: border-box; }
        .oa-page { font-family: 'Plus Jakarta Sans', sans-serif; }
        .oa-row:hover { background: #faf5ff !important; }
        .oa-btn { background:none; border:1px solid #e5e7eb; borderRadius:7px; padding:4px 10px; fontSize:12px; fontWeight:600; cursor:pointer; fontFamily:inherit; transition:all 0.12s; color:#6b7280; }
        .oa-btn:hover { border-color:#7c3aed; color:#7c3aed; }
        .oa-btn-del:hover { border-color:#dc2626 !important; color:#dc2626 !important; }
        input:focus, select:focus { outline:none; border-color:#7c3aed !important; box-shadow:0 0 0 3px rgba(124,58,237,0.12); }
      `}</style>

      <div className="oa-page">
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#ede9fe,#ddd6fe)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>👤</div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:"#111827", letterSpacing:"-0.02em" }}>Org Admins</h1>
            </div>
            <p style={{ margin:0, fontSize:13, color:"#9ca3af" }}>Manage organization administrators and their access</p>
          </div>
          <button onClick={() => { setName(""); setEmail(""); setPassword(""); setOrgId(""); setFormError(""); setShowCreate(true) }}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:"linear-gradient(135deg,#7c3aed,#6d28d9)", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(124,58,237,0.3)" }}>
            <span style={{ fontSize:16 }}>+</span> New Org Admin
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
          {[
            { label:"Total Admins", value:admins.length, bg:"#ede9fe", color:"#6d28d9" },
            { label:"Organizations Covered", value:new Set(admins.map(a=>a.organization_id)).size, bg:"#dbeafe", color:"#1d4ed8" },
            { label:"Active Last 30d", value:admins.filter(a=>a.last_login && (now-new Date(a.last_login).getTime())<30*864e5).length, bg:"#d1fae5", color:"#065f46" },
          ].map(s => (
            <div key={s.label} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:99, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:16, fontWeight:700, color:s.color, fontFamily:"'DM Mono',monospace" }}>{s.value}</span>
              </div>
              <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#374151" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters + Table */}
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 20px", borderBottom:"1px solid #f3f4f6", flexWrap:"wrap" }}>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#111827", flex:1 }}>
              All Admins <span style={{ color:"#9ca3af", fontWeight:400 }}>({filtered.length})</span>
            </p>
            <input type="text" placeholder="Search name or email…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ padding:"7px 12px", fontSize:13, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", width:200 }} />
            <select value={filterOrg} onChange={e=>setFilterOrg(e.target.value)}
              style={{ padding:"7px 12px", fontSize:13, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", cursor:"pointer" }}>
              <option value="">All Organizations</option>
              {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 20px", color:"#9ca3af", fontSize:14 }}>No admins found.</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#faf5ff" }}>
                  {["Admin","Organization","Email","Added","Actions"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"10px 20px", fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:"1px solid #ede9fe" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(admin => (
                  <tr key={admin.id} className="oa-row" style={{ borderBottom:"1px solid #f3f4f6", transition:"background 0.1s" }}>
                    <td style={{ padding:"12px 20px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:99, background:"linear-gradient(135deg,#ede9fe,#ddd6fe)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#6d28d9", flexShrink:0 }}>
                          {initials(admin.name || admin.email)}
                        </div>
                        <span style={{ fontWeight:600, fontSize:14, color:"#111827" }}>{admin.name || "—"}</span>
                      </div>
                    </td>
                    <td style={{ padding:"12px 20px" }}>
                      <span style={{ background:"#fef3c7", color:"#b45309", fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:99, display:"inline-flex", alignItems:"center", gap:4 }}>
                        🏢 {admin.organization_name}
                      </span>
                    </td>
                    <td style={{ padding:"12px 20px", color:"#6b7280", fontSize:13 }}>{admin.email}</td>
                    <td style={{ padding:"12px 20px", color:"#9ca3af", fontSize:13 }}>{fmt(admin.created_at)}</td>
                    <td style={{ padding:"12px 20px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button className="oa-btn" style={{ borderRadius:7, padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                          onClick={() => { setResetTarget(admin); setNewPassword(""); setFormError("") }}>
                          Reset PW
                        </button>
                        <button className="oa-btn oa-btn-del" style={{ borderRadius:7, padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                          onClick={() => setDeleteTarget(admin)}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Create Org Admin" subtitle="This person will manage their organization." onClose={() => setShowCreate(false)}>
          <Field label="Full Name"><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ravi Kumar" style={inputStyle} autoFocus /></Field>
          <Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ravi@example.com" style={inputStyle} /></Field>
          <Field label="Temporary Password"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 8 characters" style={inputStyle} /></Field>
          <Field label="Organization">
            <select value={orgId} onChange={e=>setOrgId(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
              <option value="">Select organization…</option>
              {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          {formError && <p style={{ color:"#dc2626", fontSize:13, margin:"0 0 8px" }}>{formError}</p>}
          <button onClick={handleCreate} disabled={isPending}
            style={{ width:"100%", padding:11, background:"linear-gradient(135deg,#7c3aed,#6d28d9)", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", opacity: isPending?0.6:1 }}>
            {isPending ? "Creating…" : "Create Org Admin"}
          </button>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <Modal title="Reset Password" subtitle={`Resetting password for ${resetTarget.name}`} onClose={() => setResetTarget(null)}>
          <Field label="New Password"><input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Min. 8 characters" style={inputStyle} autoFocus /></Field>
          {formError && <p style={{ color:"#dc2626", fontSize:13, margin:"0 0 8px" }}>{formError}</p>}
          <button onClick={handleResetPassword} disabled={isPending}
            style={{ width:"100%", padding:11, background:"linear-gradient(135deg,#7c3aed,#6d28d9)", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", opacity: isPending?0.6:1 }}>
            {isPending ? "Resetting…" : "Reset Password"}
          </button>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <Modal title="Remove Admin" subtitle="This removes admin access." onClose={() => setDeleteTarget(null)}>
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"14px 16px", marginBottom:20 }}>
            <p style={{ margin:0, fontSize:14, color:"#991b1b", fontWeight:500 }}>
              Remove <strong>&quot;{deleteTarget.name}&quot;</strong> from <strong>{deleteTarget.organization_name}</strong>? Their auth account will be deleted.
            </p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setDeleteTarget(null)} style={{ flex:1, padding:10, background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={handleDelete} disabled={isPending}
              style={{ flex:1, padding:10, background:"#dc2626", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", opacity:isPending?0.6:1 }}>
              {isPending ? "Removing…" : "Yes, Remove"}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}