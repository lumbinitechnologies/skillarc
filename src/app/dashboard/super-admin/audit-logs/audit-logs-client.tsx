"use client"

import { useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────
type AuditLog = {
  id: string
  timestamp: string
  action: string
  category: "auth" | "org" | "user" | "institution" | "settings" | "data"
  actor_name: string
  actor_email: string
  actor_role: "SUPER_ADMIN" | "ORG_ADMIN" | "USER"
  target?: string
  metadata?: Record<string, string>
  ip_address?: string
  status: "success" | "failed" | "warning"
}

type Props = {
  logs: AuditLog[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(d: string) {
  return new Date(d).toLocaleString("en-IN", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
}

const catBg: Record<string, string> = {
  auth:"#dbeafe", org:"#fef3c7", user:"#ede9fe", institution:"#d1fae5", settings:"#f3f4f6", data:"#ffedd5"
}
const catColor: Record<string, string> = {
  auth:"#1d4ed8", org:"#b45309", user:"#6d28d9", institution:"#065f46", settings:"#374151", data:"#c2410c"
}
const catIcon: Record<string, string> = {
  auth:"🔐", org:"🏢", user:"👤", institution:"🏫", settings:"⚙️", data:"💾"
}

const statusStyle: Record<string, { bg: string; color: string; dot: string }> = {
  success: { bg:"#d1fae5", color:"#065f46", dot:"#10b981" },
  failed:  { bg:"#fee2e2", color:"#991b1b", dot:"#ef4444" },
  warning: { bg:"#fef3c7", color:"#b45309", dot:"#f59e0b" },
}

const roleBadge: Record<string, { bg: string; color: string }> = {
  SUPER_ADMIN: { bg:"#ede9fe", color:"#6d28d9" },
  ORG_ADMIN:   { bg:"#fef3c7", color:"#b45309" },
  USER:        { bg:"#f3f4f6", color:"#374151" },
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AuditLogsPage({ logs: initial = [] }: Props) {
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const filtered = initial.filter(l =>
    (l.action.toLowerCase().includes(search.toLowerCase()) ||
     l.actor_name.toLowerCase().includes(search.toLowerCase()) ||
     l.actor_email.toLowerCase().includes(search.toLowerCase())) &&
    (!filterCat || l.category === filterCat) &&
    (!filterStatus || l.status === filterStatus) &&
    (!filterRole || l.actor_role === filterRole)
  )

  const pages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .al-page * { box-sizing:border-box; }
        .al-page { font-family:'Plus Jakarta Sans', sans-serif; }
        .al-row { cursor:pointer; transition:background 0.1s; }
        .al-row:hover { background:#f8fafc !important; }
        .al-row.active-row { background:#f8fafc !important; }
        select:focus, input:focus { outline:none; border-color:#475569 !important; box-shadow:0 0 0 3px rgba(71,85,105,0.12); }
        .pg-btn { padding:5px 10px; border:1px solid #e5e7eb; borderRadius:7px; background:none; font-size:12px; fontWeight:600; cursor:pointer; fontFamily:inherit; color:#374151; transition:all 0.12s; }
        .pg-btn:hover { border-color:#475569; }
        .pg-btn.active { background:#1e293b; color:#fff; border-color:#1e293b; }
        .pg-btn:disabled { opacity:0.4; cursor:not-allowed; }
      `}</style>

      <div className="al-page">
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#e2e8f0,#cbd5e1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📋</div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:"#111827", letterSpacing:"-0.02em" }}>Audit Logs</h1>
            </div>
            <p style={{ margin:0, fontSize:13, color:"#9ca3af" }}>Full activity trail across the platform</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <span style={{ background:"#d1fae5", color:"#065f46", fontSize:12, fontWeight:700, padding:"4px 12px", borderRadius:99 }}>
              {initial.filter(l=>l.status==="success").length} success
            </span>
            <span style={{ background:"#fee2e2", color:"#991b1b", fontSize:12, fontWeight:700, padding:"4px 12px", borderRadius:99 }}>
              {initial.filter(l=>l.status==="failed").length} failed
            </span>
            <span style={{ background:"#fef3c7", color:"#b45309", fontSize:12, fontWeight:700, padding:"4px 12px", borderRadius:99 }}>
              {initial.filter(l=>l.status==="warning").length} warnings
            </span>
          </div>
        </div>

        {/* Category quick filters */}
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          {["auth","org","user","institution","settings","data"].map(cat => {
            const count = initial.filter(l=>l.category===cat).length
            if (!count) return null
            return (
              <button key={cat} onClick={() => { setFilterCat(filterCat===cat?"":cat); setPage(1) }}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:99, border:`1.5px solid ${filterCat===cat?catColor[cat]:"#e5e7eb"}`, background:filterCat===cat?catBg[cat]:"#fff", cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s" }}>
                <span style={{ fontSize:13 }}>{catIcon[cat]}</span>
                <span style={{ fontSize:12, fontWeight:600, color:filterCat===cat?catColor[cat]:"#374151", textTransform:"capitalize" }}>{cat}</span>
                <span style={{ background:filterCat===cat?catColor[cat]+"25":"#f3f4f6", color:filterCat===cat?catColor[cat]:"#6b7280", fontSize:11, fontWeight:700, padding:"1px 6px", borderRadius:99 }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, overflow:"hidden" }}>
          {/* Filters */}
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 20px", borderBottom:"1px solid #f3f4f6", flexWrap:"wrap" }}>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#111827", flex:1 }}>
              Logs <span style={{ color:"#9ca3af", fontWeight:400 }}>({filtered.length.toLocaleString()})</span>
            </p>
            <input type="text" placeholder="Search action or actor…" value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }}
              style={{ padding:"7px 12px", fontSize:13, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", width:200 }} />
            <select value={filterStatus} onChange={e=>{ setFilterStatus(e.target.value); setPage(1) }}
              style={{ padding:"7px 12px", fontSize:13, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", cursor:"pointer" }}>
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>
            <select value={filterRole} onChange={e=>{ setFilterRole(e.target.value); setPage(1) }}
              style={{ padding:"7px 12px", fontSize:13, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", cursor:"pointer" }}>
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ORG_ADMIN">Org Admin</option>
              <option value="USER">User</option>
            </select>
          </div>

          {paginated.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 20px", color:"#9ca3af", fontSize:14 }}>No logs found.</div>
          ) : (
            <>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Timestamp","Category","Action","Actor","Status","IP"].map(h => (
                      <th key={h} style={{ textAlign:"left", padding:"10px 20px", fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(log => (
                    <>
                      <tr key={log.id} className={`al-row ${expandedId===log.id?"active-row":""}`}
                        onClick={() => setExpandedId(expandedId===log.id?null:log.id)}
                        style={{ borderBottom: expandedId===log.id?"none":"1px solid #f3f4f6" }}>
                        <td style={{ padding:"11px 20px", fontSize:12, color:"#6b7280", fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>
                          {fmtTime(log.timestamp)}
                        </td>
                        <td style={{ padding:"11px 20px" }}>
                          <span style={{ background:catBg[log.category], color:catColor[log.category], fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:6, display:"inline-flex", alignItems:"center", gap:4, textTransform:"capitalize" }}>
                            {catIcon[log.category]} {log.category}
                          </span>
                        </td>
                        <td style={{ padding:"11px 20px", fontSize:13, color:"#111827", fontWeight:500, maxWidth:260 }}>
                          <span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.action}</span>
                        </td>
                        <td style={{ padding:"11px 20px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:26, height:26, borderRadius:99, background:roleBadge[log.actor_role].bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:roleBadge[log.actor_role].color, flexShrink:0 }}>
                              {log.actor_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ margin:0, fontSize:12, fontWeight:600, color:"#111827" }}>{log.actor_name}</p>
                              <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{log.actor_role.replace("_"," ")}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:"11px 20px" }}>
                          <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:statusStyle[log.status].bg, color:statusStyle[log.status].color, fontSize:12, fontWeight:600, padding:"3px 9px", borderRadius:99 }}>
                            <span style={{ width:5, height:5, borderRadius:99, background:statusStyle[log.status].dot, display:"inline-block" }} />
                            {log.status}
                          </div>
                        </td>
                        <td style={{ padding:"11px 20px", fontSize:11, color:"#9ca3af", fontFamily:"'DM Mono',monospace" }}>{log.ip_address ?? "—"}</td>
                      </tr>
                      {expandedId === log.id && (
                        <tr key={`${log.id}-exp`} style={{ borderBottom:"1px solid #f3f4f6" }}>
                          <td colSpan={6} style={{ padding:"12px 20px 16px 20px", background:"#f8fafc" }}>
                            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, fontSize:12 }}>
                              <div>
                                <p style={{ margin:"0 0 4px", color:"#9ca3af", fontWeight:600, textTransform:"uppercase", fontSize:10, letterSpacing:"0.06em" }}>Actor Email</p>
                                <p style={{ margin:0, color:"#111827", fontFamily:"'DM Mono',monospace" }}>{log.actor_email}</p>
                              </div>
                              {log.target && (
                                <div>
                                  <p style={{ margin:"0 0 4px", color:"#9ca3af", fontWeight:600, textTransform:"uppercase", fontSize:10, letterSpacing:"0.06em" }}>Target</p>
                                  <p style={{ margin:0, color:"#111827" }}>{log.target}</p>
                                </div>
                              )}
                              <div>
                                <p style={{ margin:"0 0 4px", color:"#9ca3af", fontWeight:600, textTransform:"uppercase", fontSize:10, letterSpacing:"0.06em" }}>Log ID</p>
                                <p style={{ margin:0, color:"#374151", fontFamily:"'DM Mono',monospace", fontSize:11 }}>{log.id}</p>
                              </div>
                              {log.metadata && Object.entries(log.metadata).map(([k,v]) => (
                                <div key={k}>
                                  <p style={{ margin:"0 0 4px", color:"#9ca3af", fontWeight:600, textTransform:"uppercase", fontSize:10, letterSpacing:"0.06em" }}>{k}</p>
                                  <p style={{ margin:0, color:"#111827" }}>{v}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pages > 1 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", borderTop:"1px solid #f3f4f6" }}>
                  <p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</p>
                  <div style={{ display:"flex", gap:4 }}>
                    <button className="pg-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</button>
                    {Array.from({ length: Math.min(pages, 5) }, (_,i) => {
                      const p = page <= 3 ? i+1 : page-2+i
                      if (p < 1 || p > pages) return null
                      return <button key={p} className={`pg-btn ${page===p?"active":""}`} onClick={()=>setPage(p)}>{p}</button>
                    })}
                    <button className="pg-btn" disabled={page===pages} onClick={() => setPage(p=>p+1)}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}