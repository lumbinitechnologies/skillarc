"use client"

import { useState, useTransition } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────
type Organization = {
  id: string
  name: string
  created_at: string
  institution_count: number
  admin_count: number
  features?: string[]
}

type Props = {
  organizations: Organization[]
  onCreateOrg: (name: string, features: string[]) => Promise<{ success: boolean; org?: Organization; error?: string }>
  onDeleteOrg?: (id: string) => Promise<{ success: boolean; error?: string }>
  onEditOrg?: (id: string, name: string, features: string[]) => Promise<{ success: boolean; error?: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const avatarBg = ["#dbeafe","#ede9fe","#d1fae5","#fce7f3","#fef3c7","#ccfbf1","#ffedd5"]
const avatarText = ["#1d4ed8","#6d28d9","#065f46","#9d174d","#b45309","#0f766e","#c2410c"]
function orgColor(name: string) {
  const i = name.charCodeAt(0) % avatarBg.length
  return { bg: avatarBg[i], text: avatarText[i] }
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

// ─── Sub-components ───────────────────────────────────────────────────────────
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
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:"#9ca3af", padding:4, borderRadius:6 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div style={{ position:"fixed", bottom:32, right:32, background: type==="success" ? "#0f766e" : "#dc2626", color:"#fff", padding:"12px 20px", borderRadius:12, fontSize:14, fontWeight:500, zIndex:200, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", display:"flex", alignItems:"center", gap:8 }}>
      <span>{type==="success" ? "✓" : "✕"}</span>{message}
    </div>
  )
}

function Badge({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return <span style={{ background:bg, color, fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:99, fontFamily:"'DM Mono', monospace", display:"inline-block" }}>{children}</span>
}

const AVAILABLE_FEATURES = [
  { id: "direct_onboarding", label: "Direct Student Onboarding", desc: "Allows institution admins to directly input and import student accounts manually." },
  { id: "admissions_workflow", label: "Formal Admissions Lifecycle", desc: "Enables admissions registry portal with student applications, verifications, offer letters, and enrollment." },
  { id: "plagiarism", label: "Plagiarism Verification", desc: "Checks student submissions against classmates solutions using fuzzy matching ratio engine." },
  { id: "billing", label: "Billing & Online Payments", desc: "Enables dynamic tuition installment plan creation, online UPI/card fee payment modal, and printable invoices." },
  { id: "placements", label: "Placements Portal", desc: "Recruitment drives, student job application flows, and corporate placement analytics desk." },
  { id: "video_call", label: "Virtual Class & Meetings", desc: "Integrates online classrooms, video calls, participant records, and direct session creation." },
  { id: "ai_evaluation", label: "AI Evaluation & Feedback", desc: "Automated AI grading engine assessing semantic similarity, concept coverage, and immediate feedback." },
  { id: "report_cards", label: "Report Cards & Analytics", desc: "Grade performance summaries, attendance rates, coursework trackers, and visual card analytics." },
  { id: "intake_cohorts", label: "Intake Cohorts & Registration", desc: "Allows configuring registration intakes, student cohorts, and academic batch progression." },
  { id: "interventions", label: "Academic Interventions", desc: "Enables student academic warnings, interventions tracking, and risk level monitoring." },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrganizationsPage({ organizations: initialOrgs, onCreateOrg, onDeleteOrg, onEditOrg }: Props) {
  const [orgs, setOrgs] = useState(initialOrgs ?? [])
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Organization | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null)
  const [orgName, setOrgName] = useState("")
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [formError, setFormError] = useState("")
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleCreate() {
    if (!orgName.trim()) { setFormError("Organization name is required."); return }
    setFormError("")
    startTransition(async () => {
      const res = await onCreateOrg(orgName.trim(), selectedFeatures)
      if (res.success && res.org) {
        setOrgs(prev => [{ ...res.org!, features: selectedFeatures }, ...prev])
        setOrgName("")
        setSelectedFeatures([])
        setShowCreate(false)
        showToast(`"${res.org.name}" created`, "success")
      } else {
        setFormError(res.error ?? "Something went wrong.")
        showToast(res.error ?? "Failed", "error")
      }
    })
  }

  async function handleEdit() {
    if (!orgName.trim() || !editTarget) { setFormError("Name is required."); return }
    setFormError("")
    startTransition(async () => {
      const res = await onEditOrg?.(editTarget.id, orgName.trim(), selectedFeatures)
      if (res?.success) {
        setOrgs(prev => prev.map(o => o.id === editTarget.id ? { ...o, name: orgName.trim(), features: selectedFeatures } : o))
        setEditTarget(null)
        setOrgName("")
        setSelectedFeatures([])
        showToast("Organization updated", "success")
      } else {
        setFormError(res?.error ?? "Failed")
      }
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const res = await onDeleteOrg?.(deleteTarget.id)
      if (res?.success) {
        setOrgs(prev => prev.filter(o => o.id !== deleteTarget.id))
        setDeleteTarget(null)
        showToast(`"${deleteTarget.name}" deleted`, "success")
      } else {
        showToast(res?.error ?? "Failed to delete", "error")
        setDeleteTarget(null)
      }
    })
  }

  const inputStyle: React.CSSProperties = { width:"100%", padding:"9px 12px", fontSize:14, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", boxSizing:"border-box" }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .org-page * { box-sizing: border-box; }
        .org-page { font-family: 'Plus Jakarta Sans', sans-serif; }
        .org-row { transition: background 0.1s; }
        .org-row:hover { background: #f0f4ff !important; }
        .org-action-btn { background: none; border: 1px solid #e5e7eb; borderRadius: 7px; padding: 4px 10px; fontSize: 12px; fontWeight: 600; cursor: pointer; fontFamily: inherit; transition: all 0.12s; }
        .org-action-btn:hover { border-color: #4f46e5; color: #4f46e5; }
        .org-del-btn:hover { border-color: #dc2626 !important; color: #dc2626 !important; }
        input:focus, select:focus { outline: none; border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.12); }
        .search-input:focus { box-shadow: 0 0 0 3px rgba(79,70,229,0.1); border-color: #4f46e5 !important; }
      `}</style>

      <div className="org-page">
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#dbeafe,#bfdbfe)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏢</div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:"#111827", letterSpacing:"-0.02em" }}>Organizations</h1>
            </div>
            <p style={{ margin:0, fontSize:13, color:"#9ca3af" }}>Manage all top-level organizations on SkillArc</p>
          </div>
          <button onClick={() => { setOrgName(""); setFormError(""); setShowCreate(true) }}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(29,78,216,0.3)" }}>
            <span style={{ fontSize:16 }}>+</span> New Organization
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
          {[
            { label:"Total Organizations", value:orgs.length, bg:"#dbeafe", color:"#1d4ed8", icon:"🏢" },
            { label:"Total Institutions", value:orgs.reduce((s,o)=>s+o.institution_count,0), bg:"#d1fae5", color:"#065f46", icon:"🏫" },
            { label:"Total Org Admins", value:orgs.reduce((s,o)=>s+o.admin_count,0), bg:"#ede9fe", color:"#6d28d9", icon:"👤" },
          ].map(s => (
            <div key={s.label} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{s.icon}</div>
              <div>
                <p style={{ margin:0, fontSize:11, color:"#9ca3af", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</p>
                <p style={{ margin:"2px 0 0", fontSize:24, fontWeight:700, color:"#111827", fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{s.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, overflow:"hidden" }}>
          {/* Table header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid #f3f4f6" }}>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#111827" }}>All Organizations <span style={{ color:"#9ca3af", fontWeight:400 }}>({filtered.length})</span></p>
            <input className="search-input" type="text" placeholder="Search organizations…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ padding:"7px 12px", fontSize:13, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", width:220 }} />
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 20px", color:"#9ca3af", fontSize:14 }}>
              {search ? `No organizations matching "${search}"` : "No organizations yet. Create your first one."}
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f9fafb" }}>
                  {["Organization","Institutions","Org Admins","Created","Actions"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"10px 20px", fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:"1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(org => {
                  const c = orgColor(org.name)
                  return (
                    <tr key={org.id} className="org-row" style={{ borderBottom:"1px solid #f3f4f6" }}>
                      <td style={{ padding:"13px 20px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ width:36, height:36, borderRadius:10, background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, color:c.text, flexShrink:0 }}>
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight:600, fontSize:14, color:"#111827" }}>{org.name}</span>
                            {org.features && org.features.length > 0 && (
                              <div style={{ display:"flex", gap:4, marginTop:4, flexWrap:"wrap" }}>
                                {org.features.map(f => {
                                  const label = f === "direct_onboarding" ? "Direct Onboard" : f === "admissions_workflow" ? "Admissions" : f === "plagiarism" ? "Plagiarism" : f === "billing" ? "Billing" : f === "placements" ? "Placements" : f === "video_call" ? "Virtual Class" : f === "ai_evaluation" ? "AI Eval" : f === "intake_cohorts" ? "Intakes" : f === "interventions" ? "Interventions" : "Analytics"
                                  return (
                                    <span key={f} style={{ fontSize:9, fontWeight:600, background:"#f5f3ff", color:"#6b21a8", padding:"1px 6px", borderRadius:4, border:"1px solid #faf5ff" }}>
                                      {label}
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"13px 20px" }}><Badge bg="#dbeafe" color="#1d4ed8">{org.institution_count} inst.</Badge></td>
                      <td style={{ padding:"13px 20px" }}><Badge bg="#ede9fe" color="#6d28d9">{org.admin_count} admins</Badge></td>
                      <td style={{ padding:"13px 20px", color:"#9ca3af", fontSize:13 }}>{fmt(org.created_at)}</td>
                      <td style={{ padding:"13px 20px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button className="org-action-btn" style={{ borderRadius:7, padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
                            onClick={() => { setEditTarget(org); setOrgName(org.name); setSelectedFeatures(org.features || []); setFormError(""); }}>
                            Edit
                          </button>
                          <button className="org-action-btn org-del-btn" style={{ borderRadius:7, padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:"#6b7280" }}
                            onClick={() => setDeleteTarget(org)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Create Organization" subtitle="Top-level entity that owns institutions." onClose={() => setShowCreate(false)}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#111827", marginBottom:6 }}>Organization Name</label>
            <input type="text" value={orgName} onChange={e=>setOrgName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleCreate()} placeholder="e.g. Lumbini Technologies" style={inputStyle} autoFocus />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#111827", marginBottom:10 }}>Permitted Modules</label>
            <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:220, overflowY:"auto", paddingRight:4 }}>
              {AVAILABLE_FEATURES.map(f => {
                const checked = selectedFeatures.includes(f.id)
                return (
                  <label key={f.id} style={{ display:"flex", gap:10, alignItems:"flex-start", background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:10, padding:10, cursor:"pointer", transition:"border-color 0.15s" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedFeatures(prev =>
                          prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id]
                        )
                      }}
                      style={{ marginTop: 2, accentColor: "#4f46e5", cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#111827" }}>{f.label}</div>
                      <div style={{ fontSize:10, color:"#6b7280", marginTop:2, lineHeight:"1.3" }}>{f.desc}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
          {formError && <p style={{ color:"#dc2626", fontSize:13, margin:"0 0 8px" }}>{formError}</p>}
          <button onClick={handleCreate} disabled={isPending}
            style={{ width:"100%", padding:11, background:"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(29,78,216,0.25)", opacity: isPending ? 0.6 : 1 }}>
            {isPending ? "Creating…" : "Create Organization"}
          </button>
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal title="Edit Organization" subtitle={`Editing: ${editTarget.name}`} onClose={() => setEditTarget(null)}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#111827", marginBottom:6 }}>Organization Name</label>
            <input type="text" value={orgName} onChange={e=>setOrgName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleEdit()} style={inputStyle} autoFocus />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#111827", marginBottom:10 }}>Permitted Modules</label>
            <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:220, overflowY:"auto", paddingRight:4 }}>
              {AVAILABLE_FEATURES.map(f => {
                const checked = selectedFeatures.includes(f.id)
                return (
                  <label key={f.id} style={{ display:"flex", gap:10, alignItems:"flex-start", background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:10, padding:10, cursor:"pointer", transition:"border-color 0.15s" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedFeatures(prev =>
                          prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id]
                        )
                      }}
                      style={{ marginTop: 2, accentColor: "#4f46e5", cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#111827" }}>{f.label}</div>
                      <div style={{ fontSize:10, color:"#6b7280", marginTop:2, lineHeight:"1.3" }}>{f.desc}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
          {formError && <p style={{ color:"#dc2626", fontSize:13, margin:"0 0 8px" }}>{formError}</p>}
          <button onClick={handleEdit} disabled={isPending}
            style={{ width:"100%", padding:11, background:"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", opacity: isPending ? 0.6 : 1 }}>
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete Organization" subtitle="This action cannot be undone." onClose={() => setDeleteTarget(null)}>
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"14px 16px", marginBottom:20 }}>
            <p style={{ margin:0, fontSize:14, color:"#991b1b", fontWeight:500 }}>
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>? This will remove all associated data.
            </p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setDeleteTarget(null)} style={{ flex:1, padding:10, background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={handleDelete} disabled={isPending}
              style={{ flex:1, padding:10, background:"#dc2626", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", opacity: isPending ? 0.6 : 1 }}>
              {isPending ? "Deleting…" : "Yes, Delete"}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}