"use client"

import { useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────
type TimePoint = { label: string; value: number }
type OrgStat = { name: string; institutions: number; users: number; admins: number }
type ActivityItem = { date: string; action: string; user: string; org: string; type: "create"|"delete"|"update"|"login" }

type Props = {
  growth: {
    users: TimePoint[]
    organizations: TimePoint[]
    institutions: TimePoint[]
  }
  orgStats: OrgStat[]
  recentActivity: ActivityItem[]
  summary: {
    totalUsers: number
    totalOrgs: number
    totalInstitutions: number
    newUsersThisMonth: number
    newOrgsThisMonth: number
    activeAdmins: number
  }
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function MiniBar({ data, color }: { data: TimePoint[]; color: string }) {
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:48 }}>
      {data.map((d,i) => (
        <div key={i} title={`${d.label}: ${d.value}`} style={{ flex:1, background:color, borderRadius:3, height:`${Math.max((d.value/max)*100,4)}%`, opacity: i===data.length-1 ? 1 : 0.45+(i/data.length)*0.45, transition:"height 0.3s", cursor:"default" }} />
      ))}
    </div>
  )
}

// ─── Horizontal bar ──────────────────────────────────────────────────────────
function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div style={{ flex:1, height:6, background:"#f3f4f6", borderRadius:99, overflow:"hidden" }}>
      <div style={{ width:`${Math.max((value/Math.max(max,1))*100,2)}%`, height:"100%", background:color, borderRadius:99, transition:"width 0.5s" }} />
    </div>
  )
}

const activityIcon: Record<string, string> = { create:"✚", delete:"✕", update:"✎", login:"→" }
const activityBg: Record<string, string> = { create:"#d1fae5", delete:"#fee2e2", update:"#fef3c7", login:"#dbeafe" }
const activityColor: Record<string, string> = { create:"#065f46", delete:"#991b1b", update:"#b45309", login:"#1d4ed8" }

const defaultGrowth = { users: [], organizations: [], institutions: [] }
const defaultSummary = { totalUsers: 0, totalOrgs: 0, totalInstitutions: 0, newUsersThisMonth: 0, newOrgsThisMonth: 0, activeAdmins: 0 }

export default function AnalyticsPage({ growth = defaultGrowth, orgStats = [], recentActivity = [], summary = defaultSummary }: Props) {
  const [activeMetric, setActiveMetric] = useState<"users"|"organizations"|"institutions">("users")
  const [range, setRange] = useState<"7d"|"30d"|"90d">("30d")

  const metricColor = { users:"#f59e0b", organizations:"#3b82f6", institutions:"#10b981" }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .an-page * { box-sizing:border-box; }
        .an-page { font-family:'Plus Jakarta Sans', sans-serif; }
        .metric-tab { padding:6px 14px; border-radius:8px; font-size:13px; fontWeight:600; cursor:pointer; border:none; background:none; transition:all 0.15s; font-family:inherit; }
        .metric-tab.active { background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.08); }
        .range-btn { padding:5px 12px; border-radius:8px; font-size:12px; fontWeight:600; cursor:pointer; border:1.5px solid #e5e7eb; background:none; font-family:inherit; transition:all 0.12s; color:#6b7280; }
        .range-btn.active { border-color:#f59e0b; background:#fef3c7; color:#b45309; }
      `}</style>

      <div className="an-page">
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#fef3c7,#fde68a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📊</div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:"#111827", letterSpacing:"-0.02em" }}>Analytics</h1>
            </div>
            <p style={{ margin:0, fontSize:13, color:"#9ca3af" }}>Platform growth and activity overview</p>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {(["7d","30d","90d"] as const).map(r => (
              <button key={r} className={`range-btn ${range===r?"active":""}`} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        </div>

        {/* Summary stat cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
          {[
            { label:"Total Users", value:summary.totalUsers, delta:summary.newUsersThisMonth, bg:"#fef3c7", accent:"#f59e0b", dark:"#b45309" },
            { label:"Total Organizations", value:summary.totalOrgs, delta:summary.newOrgsThisMonth, bg:"#dbeafe", accent:"#3b82f6", dark:"#1d4ed8" },
            { label:"Active Admins", value:summary.activeAdmins, delta:null, bg:"#d1fae5", accent:"#10b981", dark:"#065f46" },
          ].map(s => (
            <div key={s.label} style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:"18px 20px" }}>
              <p style={{ margin:"0 0 8px", fontSize:11, color:"#9ca3af", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</p>
              <div style={{ display:"flex", alignItems:"baseline", gap:10, justifyContent:"space-between" }}>
                <p style={{ margin:0, fontSize:28, fontWeight:700, color:"#111827", fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{s.value.toLocaleString()}</p>
                {s.delta !== null && (
                  <span style={{ background:s.bg, color:s.dark, fontSize:12, fontWeight:600, padding:"3px 9px", borderRadius:99 }}>+{s.delta} this month</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Growth Chart Card */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
          {/* Chart */}
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"20px 24px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <p style={{ margin:0, fontSize:14, fontWeight:700, color:"#111827" }}>Growth Trend</p>
              <div style={{ display:"flex", gap:3, background:"#f4f5f7", border:"1px solid #e5e7eb", borderRadius:8, padding:3 }}>
                {(["users","organizations","institutions"] as const).map(m => (
                  <button key={m} className={`metric-tab ${activeMetric===m?"active":""}`}
                    style={{ color: activeMetric===m ? metricColor[m] : "#9ca3af" }}
                    onClick={() => setActiveMetric(m)}>
                    {m.charAt(0).toUpperCase()+m.slice(1,4)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:8 }}>
              <MiniBar data={growth[activeMetric]} color={metricColor[activeMetric]} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              {growth[activeMetric].filter((_,i,a)=>i===0||i===Math.floor(a.length/2)||i===a.length-1).map((d,i) => (
                <span key={i} style={{ fontSize:11, color:"#9ca3af" }}>{d.label}</span>
              ))}
            </div>
          </div>

          {/* Top orgs */}
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, padding:"20px 24px" }}>
            <p style={{ margin:"0 0 16px", fontSize:14, fontWeight:700, color:"#111827" }}>Top Organizations by Users</p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {(orgStats ?? []).slice(0,5).map((org,i) => {
                const maxUsers = Math.max(...orgStats.map(o=>o.users), 1)
                return (
                  <div key={i}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:"#9ca3af", width:16, textAlign:"right", fontFamily:"'DM Mono',monospace" }}>#{i+1}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:"#111827" }}>{org.name}</span>
                      </div>
                      <div style={{ display:"flex", gap:12, fontSize:12, color:"#9ca3af" }}>
                        <span><strong style={{ color:"#f59e0b" }}>{org.users}</strong> users</span>
                        <span><strong style={{ color:"#10b981" }}>{org.institutions}</strong> inst.</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:"#9ca3af", width:16 }} />
                      <HBar value={org.users} max={maxUsers} color="#f59e0b" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f3f4f6" }}>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:"#111827" }}>Recent Activity</p>
          </div>
          {(recentActivity ?? []).length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", color:"#9ca3af", fontSize:14 }}>No recent activity.</div>
          ) : (
            <div style={{ padding:"8px 0" }}>
              {recentActivity.slice(0,10).map((item,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 20px", borderBottom: i<recentActivity.length-1 ? "1px solid #f9fafb" : "none" }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:activityBg[item.type], display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:activityColor[item.type], fontWeight:700, flexShrink:0 }}>
                    {activityIcon[item.type]}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#111827", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.action}</p>
                    <p style={{ margin:"1px 0 0", fontSize:11, color:"#9ca3af" }}>by {item.user} · {item.org}</p>
                  </div>
                  <span style={{ fontSize:11, color:"#9ca3af", flexShrink:0, fontFamily:"'DM Mono',monospace" }}>
                    {new Date(item.date).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}