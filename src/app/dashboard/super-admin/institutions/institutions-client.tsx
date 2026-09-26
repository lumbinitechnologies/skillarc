"use client"

import { useState, useTransition, Fragment } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────
type Institution = {
  id: string
  name: string
  code: string
  organization_id: string
  organization_name: string
  created_at: string
  user_count: number
  active: boolean
  type: "college" | "school" | "university" | "institute" | "other"
}

type Props = {
  institutions: Institution[]
  onDeleteInstitution?: (id: string) => Promise<{ success: boolean; error?: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d: string) { return new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) }

const typeIcon: Record<string, string> = { college:"🎓", school:"🏫", university:"🏛️", institute:"🔬", other:"🏢" }
const typeBg: Record<string, string> = { college:"#d1fae5", school:"#dbeafe", university:"#ede9fe", institute:"#fef3c7", other:"#f3f4f6" }
const typeColor: Record<string, string> = { college:"#065f46", school:"#1d4ed8", university:"#6d28d9", institute:"#b45309", other:"#374151" }

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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InstitutionsPage({ institutions: initial = [], onDeleteInstitution }: Props) {
  const [list, setList] = useState(initial)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterOrg, setFilterOrg] = useState("")
  const [filterActive, setFilterActive] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Institution | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleEnterInstitution(instId: string) {
    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "INSTITUTION_ADMIN",
          institution_id: instId,
        }),
      })
      if (res.ok) {
        window.location.href = "/dashboard"
      } else {
        alert("Failed to enter institution")
      }
    } catch (err) {
      console.error(err)
      alert("Error entering institution")
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const res = await onDeleteInstitution?.(deleteTarget.id)
      if (res?.success) {
        setList(prev => prev.filter(i => i.id !== deleteTarget.id))
        showToast(`"${deleteTarget.name}" deleted successfully`, "success")
        setDeleteTarget(null)
      } else {
        showToast(res?.error || "Failed to delete institution", "error")
        setDeleteTarget(null)
      }
    })
  }

  const orgs = Array.from(new Set(list.map(i => i.organization_id)))
    .map(id => ({ id, name: list.find(i => i.organization_id === id)?.organization_name ?? id }))

  const filtered = list.filter(inst =>
    (inst.name.toLowerCase().includes(search.toLowerCase()) || inst.code.toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || inst.type === filterType) &&
    (!filterOrg || inst.organization_id === filterOrg) &&
    (!filterActive || (filterActive === "active" ? inst.active : !inst.active))
  )

  const totalUsers = list.reduce((s,i) => s+i.user_count, 0)
  const activeCount = list.filter(i=>i.active).length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .inst-page * { box-sizing:border-box; }
        .inst-page { font-family:'Plus Jakarta Sans', sans-serif; }
        .inst-row { cursor:pointer; transition:background 0.1s; }
        .inst-row:hover { background:#f0fdf4 !important; }
        .inst-row.expanded { background:#f0fdf4 !important; }
        select:focus, input:focus { outline:none; border-color:#059669 !important; box-shadow:0 0 0 3px rgba(5,150,105,0.12); }
        .sa-btn-mint {
          background: linear-gradient(135deg, #00C2A8, #00A690);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 194, 168, 0.2);
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .sa-btn-mint:hover {
          opacity: 0.95;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 194, 168, 0.35);
        }
        .sa-btn-mint:active {
          transform: scale(0.97) translateY(0);
        }
        .inst-del-btn {
          background: #fff;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 7px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.12s;
        }
        .inst-del-btn:hover {
          background: #fef2f2;
          border-color: #ef4444;
        }
      `}</style>

      <div className="inst-page">
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#d1fae5,#a7f3d0)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏫</div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:"#111827", letterSpacing:"-0.02em" }}>Institutions</h1>
            </div>
            <p style={{ margin:0, fontSize:13, color:"#9ca3af" }}>All institutions registered across SkillArc</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ background:"#d1fae5", color:"#065f46", fontSize:12, fontWeight:700, padding:"4px 12px", borderRadius:99 }}>
              {activeCount} Active
            </span>
            <span style={{ background:"#fee2e2", color:"#991b1b", fontSize:12, fontWeight:700, padding:"4px 12px", borderRadius:99 }}>
              {list.length - activeCount} Inactive
            </span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
          {[
            { label:"Total Institutions", value:list.length, bg:"#d1fae5", color:"#065f46", icon:"🏫" },
            { label:"Active", value:activeCount, bg:"#dbeafe", color:"#1d4ed8", icon:"✅" },
            { label:"Total Users", value:totalUsers, bg:"#ede9fe", color:"#6d28d9", icon:"👥" },
            { label:"Avg Users / Inst", value:list.length ? Math.round(totalUsers/list.length) : 0, bg:"#fef3c7", color:"#b45309", icon:"📊" },
          ].map(s => (
            <div key={s.label} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{s.icon}</div>
              <div>
                <p style={{ margin:0, fontSize:11, color:"#9ca3af", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</p>
                <p style={{ margin:"2px 0 0", fontSize:22, fontWeight:700, color:"#111827", fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{s.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Type breakdown */}
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {["college","school","university","institute","other"].map(t => {
            const count = list.filter(i=>i.type===t).length
            if (!count) return null
            return (
              <button key={t} onClick={() => setFilterType(filterType===t ? "" : t)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:99, border:`1.5px solid ${filterType===t ? typeColor[t] : "#e5e7eb"}`, background: filterType===t ? typeBg[t] : "#fff", cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s" }}>
                <span>{typeIcon[t]}</span>
                <span style={{ fontSize:12, fontWeight:600, color: filterType===t ? typeColor[t] : "#374151", textTransform:"capitalize" }}>{t}</span>
                <span style={{ background: filterType===t ? typeColor[t]+"20" : "#f3f4f6", color: filterType===t ? typeColor[t] : "#6b7280", fontSize:11, fontWeight:700, padding:"1px 7px", borderRadius:99 }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 20px", borderBottom:"1px solid #f3f4f6", flexWrap:"wrap" }}>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#111827", flex:1 }}>
              Institutions <span style={{ color:"#9ca3af", fontWeight:400 }}>({filtered.length})</span>
            </p>
            <input type="text" placeholder="Search name or code…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ padding:"7px 12px", fontSize:13, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", width:180 }} />
            <select value={filterOrg} onChange={e=>setFilterOrg(e.target.value)}
              style={{ padding:"7px 12px", fontSize:13, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", cursor:"pointer" }}>
              <option value="">All Orgs</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <select value={filterActive} onChange={e=>setFilterActive(e.target.value)}
              style={{ padding:"7px 12px", fontSize:13, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", cursor:"pointer" }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 20px", color:"#9ca3af", fontSize:14 }}>No institutions found.</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f0fdf4" }}>
                  {["Institution","Code","Type","Organization","Users","Status","Created","Actions"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"10px 20px", fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:"1px solid #dcfce7" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inst => (
                  <Fragment key={inst.id}>
                    <tr className={`inst-row ${expandedId===inst.id?"expanded":""}`}
                      onClick={() => setExpandedId(expandedId===inst.id ? null : inst.id)}
                      style={{ borderBottom: expandedId===inst.id ? "none" : "1px solid #f3f4f6" }}>
                      <td style={{ padding:"12px 20px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:8, background:typeBg[inst.type], display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                            {typeIcon[inst.type]}
                          </div>
                          <span style={{ fontWeight:600, fontSize:14, color:"#111827" }}>{inst.name}</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 20px" }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, background:"#f3f4f6", color:"#374151", padding:"3px 8px", borderRadius:6 }}>{inst.code}</span>
                      </td>
                      <td style={{ padding:"12px 20px" }}>
                        <span style={{ background:typeBg[inst.type], color:typeColor[inst.type], fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:99, textTransform:"capitalize" }}>{inst.type}</span>
                      </td>
                      <td style={{ padding:"12px 20px", fontSize:13, color:"#6b7280" }}>{inst.organization_name}</td>
                      <td style={{ padding:"12px 20px", fontFamily:"'DM Mono',monospace", fontSize:13, color:"#111827", fontWeight:600 }}>{inst.user_count.toLocaleString()}</td>
                      <td style={{ padding:"12px 20px" }}>
                        <span style={{ background: inst.active ? "#d1fae5" : "#fee2e2", color: inst.active ? "#065f46" : "#991b1b", fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:99 }}>
                          {inst.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding:"12px 20px", color:"#9ca3af", fontSize:13 }}>{fmt(inst.created_at)}</td>
                      <td style={{ padding:"12px 20px" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <button
                            onClick={() => setDeleteTarget(inst)}
                            className="inst-del-btn"
                            title="Delete institution"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === inst.id && (
                      <tr key={`${inst.id}-expanded`} style={{ borderBottom:"1px solid #f3f4f6" }}>
                        <td colSpan={8} style={{ padding:"0 20px 16px 64px", background:"#f0fdf4" }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16, fontSize:13 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
                              <div><span style={{ color:"#9ca3af" }}>Institution ID: </span><span style={{ fontFamily:"'DM Mono',monospace", color:"#374151" }}>{inst.id}</span></div>
                              <div><span style={{ color:"#9ca3af" }}>Org ID: </span><span style={{ fontFamily:"'DM Mono',monospace", color:"#374151" }}>{inst.organization_id}</span></div>
                              <div><span style={{ color:"#9ca3af" }}>Total Users: </span><span style={{ fontWeight:600, color:"#111827" }}>{inst.user_count}</span></div>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEnterInstitution(inst.id)
                                }}
                                className="sa-btn-mint"
                              >
                                Enter Institution Dashboard
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteTarget(inst)
                                }}
                                className="inst-del-btn"
                                style={{ padding: "6px 14px", fontSize: 12 }}
                              >
                                Delete Institution
                              </button>
                            </div>
                          </div>

                          {/* Public Admissions Portal URL */}
                          <div style={{ marginTop:12, paddingTop:12, borderTop:"1px dashed #bbf7d0", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                              <span style={{ fontSize:12, fontWeight:700, color:"#065f46" }}>🌐 Public Admissions URL:</span>
                              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, background:"#ffffff", border:"1px solid #bbf7d0", padding:"3px 10px", borderRadius:6, color:"#166534" }}>
                                {typeof window !== "undefined"
                                  ? `${window.location.origin}/apply/${inst.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
                                  : `/apply/${inst.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                              </span>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const url = `${window.location.origin}/apply/${inst.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
                                  navigator.clipboard.writeText(url)
                                  setCopiedId(inst.id)
                                  setTimeout(() => setCopiedId(null), 2000)
                                }}
                                style={{
                                  background: copiedId === inst.id ? "#059669" : "#ffffff",
                                  color: copiedId === inst.id ? "#ffffff" : "#065f46",
                                  border: "1px solid #059669",
                                  borderRadius: 6,
                                  padding: "4px 12px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  transition: "all 0.15s"
                                }}
                              >
                                {copiedId === inst.id ? "✓ Copied!" : "📋 Copy Apply URL"}
                              </button>
                              <a
                                href={`/apply/${inst.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  background: "#059669",
                                  color: "#ffffff",
                                  textDecoration: "none",
                                  borderRadius: 6,
                                  padding: "4px 12px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                              >
                                ↗ Open Apply Portal
                              </a>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Warning Confirmation Modal */}
      {deleteTarget && (
        <Modal
          title="Delete Institution"
          subtitle="This action cannot be undone."
          onClose={() => setDeleteTarget(null)}
        >
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"14px 16px", marginBottom:20 }}>
            <p style={{ margin:0, fontSize:14, color:"#991b1b", fontWeight:600 }}>
              Are you sure you want to delete "{deleteTarget.name}"?
            </p>
            <p style={{ margin:"8px 0 0", fontSize:12, color:"#b91c1c", lineHeight:"1.4" }}>
              This will permanently delete this institution along with all its departments, courses, faculty, students, timetables, admissions, and academic records.
            </p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
              style={{ flex:1, padding:10, background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              style={{ flex:1, padding:10, background:"#dc2626", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", opacity: isPending ? 0.6 : 1 }}
            >
              {isPending ? "Deleting…" : "Yes, Delete Institution"}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}