"use client"

import { useState, Fragment } from "react"

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d: string) { return new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) }

const typeIcon: Record<string, string> = { college:"🎓", school:"🏫", university:"🏛️", institute:"🔬", other:"🏢" }
const typeBg: Record<string, string> = { college:"#d1fae5", school:"#dbeafe", university:"#ede9fe", institute:"#fef3c7", other:"#f3f4f6" }
const typeColor: Record<string, string> = { college:"#065f46", school:"#1d4ed8", university:"#6d28d9", institute:"#b45309", other:"#374151" }

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InstitutionsPage({ institutions: initial = [] }: Props) {
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterOrg, setFilterOrg] = useState("")
  const [filterActive, setFilterActive] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const orgs = Array.from(new Set(initial.map(i => i.organization_id)))
    .map(id => ({ id, name: initial.find(i => i.organization_id === id)?.organization_name ?? id }))

  const filtered = initial.filter(inst =>
    (inst.name.toLowerCase().includes(search.toLowerCase()) || inst.code.toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || inst.type === filterType) &&
    (!filterOrg || inst.organization_id === filterOrg) &&
    (!filterActive || (filterActive === "active" ? inst.active : !inst.active))
  )

  const totalUsers = initial.reduce((s,i) => s+i.user_count, 0)
  const activeCount = initial.filter(i=>i.active).length

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
              {initial.length - activeCount} Inactive
            </span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
          {[
            { label:"Total Institutions", value:initial.length, bg:"#d1fae5", color:"#065f46", icon:"🏫" },
            { label:"Active", value:activeCount, bg:"#dbeafe", color:"#1d4ed8", icon:"✅" },
            { label:"Total Users", value:totalUsers, bg:"#ede9fe", color:"#6d28d9", icon:"👥" },
            { label:"Avg Users / Inst", value:initial.length ? Math.round(totalUsers/initial.length) : 0, bg:"#fef3c7", color:"#b45309", icon:"📊" },
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
            const count = initial.filter(i=>i.type===t).length
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
                  {["Institution","Code","Type","Organization","Users","Status","Created"].map(h => (
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
                    </tr>
                    {expandedId === inst.id && (
                      <tr key={`${inst.id}-expanded`} style={{ borderBottom:"1px solid #f3f4f6" }}>
                        <td colSpan={7} style={{ padding:"0 20px 16px 64px", background:"#f0fdf4" }}>
                          <div style={{ display:"flex", gap:24, fontSize:13 }}>
                            <div><span style={{ color:"#9ca3af" }}>Institution ID: </span><span style={{ fontFamily:"'DM Mono',monospace", color:"#374151" }}>{inst.id}</span></div>
                            <div><span style={{ color:"#9ca3af" }}>Org ID: </span><span style={{ fontFamily:"'DM Mono',monospace", color:"#374151" }}>{inst.organization_id}</span></div>
                            <div><span style={{ color:"#9ca3af" }}>Total Users: </span><span style={{ fontWeight:600, color:"#111827" }}>{inst.user_count}</span></div>
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
    </>
  )
}