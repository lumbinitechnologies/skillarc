"use client"

import { useState, useTransition } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────
type PlatformSettings = {
  platform_name: string
  support_email: string
  max_orgs_per_plan: number
  allow_self_registration: boolean
  require_email_verification: boolean
  session_timeout_hours: number
  maintenance_mode: boolean
  maintenance_message: string
  default_timezone: string
  max_institutions_per_org: number
}

type Props = {
  settings: PlatformSettings
  onSave: (settings: Partial<PlatformSettings>) => Promise<{ success: boolean; error?: string }>
  buildVersion?: string
  lastDeployed?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!value)} disabled={disabled}
      style={{ width:44, height:24, borderRadius:99, border:"none", cursor:disabled?"not-allowed":"pointer", padding:2, background:value?"#0f766e":"#e5e7eb", transition:"background 0.2s", position:"relative", display:"inline-flex", alignItems:"center", flexShrink:0 }}>
      <div style={{ width:20, height:20, borderRadius:99, background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.15)", transform:value?"translateX(20px)":"translateX(0)", transition:"transform 0.2s" }} />
    </button>
  )
}

function Toast({ message, type }: { message: string; type: "success"|"error" }) {
  return (
    <div style={{ position:"fixed", bottom:32, right:32, background: type==="success"?"#0f766e":"#dc2626", color:"#fff", padding:"12px 20px", borderRadius:12, fontSize:14, fontWeight:500, zIndex:200, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", display:"flex", alignItems:"center", gap:8 }}>
      <span>{type==="success"?"✓":"✕"}</span>{message}
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
      <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#ccfbf1,#99f6e4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{icon}</div>
      <div>
        <h2 style={{ margin:0, fontSize:15, fontWeight:700, color:"#111827" }}>{title}</h2>
        <p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>{subtitle}</p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { padding:"9px 12px", fontSize:14, border:"1px solid #e5e7eb", borderRadius:8, background:"#f9fafb", color:"#111827", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }

// ─── Main ─────────────────────────────────────────────────────────────────────
const SETTINGS_DEFAULTS: PlatformSettings = {
  platform_name: "SkillArc",
  support_email: "support@skillarc.com",
  max_orgs_per_plan: 50,
  allow_self_registration: false,
  require_email_verification: true,
  session_timeout_hours: 24,
  maintenance_mode: false,
  maintenance_message: "We're performing scheduled maintenance. Back soon!",
  default_timezone: "Asia/Kolkata",
  max_institutions_per_org: 20,
}

export default function SettingsPage({ settings: initial, onSave, buildVersion="1.0.0", lastDeployed }: Props) {
  const seed = initial ?? SETTINGS_DEFAULTS
  const [settings, setSettings] = useState(seed)
  const [saved, setSaved] = useState<PlatformSettings>(seed)
  const [toast, setToast] = useState<{ message:string; type:"success"|"error" } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activeSection, setActiveSection] = useState<"general"|"security"|"limits"|"maintenance">("general")

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved)

  function showToast(msg: string, type: "success"|"error") { setToast({ message:msg, type }); setTimeout(()=>setToast(null), 3500) }
  function set<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    startTransition(async () => {
      const res = await onSave(settings)
      if (res.success) { setSaved(settings); showToast("Settings saved successfully", "success") }
      else { showToast(res.error ?? "Failed to save", "error") }
    })
  }

  function handleDiscard() { setSettings(saved) }

  const sections = [
    { key:"general", label:"General", icon:"⚙️" },
    { key:"security", label:"Security", icon:"🔐" },
    { key:"limits", label:"Limits", icon:"📐" },
    { key:"maintenance", label:"Maintenance", icon:"🔧" },
  ] as const

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .set-page * { box-sizing:border-box; }
        .set-page { font-family:'Plus Jakarta Sans', sans-serif; }
        .set-nav-item { display:flex; align-items:center; gap:10px; padding:9px 14px; border-radius:10px; cursor:pointer; border:none; background:none; font-family:inherit; font-size:13px; font-weight:600; width:100%; text-align:left; transition:all 0.12s; color:#6b7280; }
        .set-nav-item:hover { background:#f0fdfa; color:#0f766e; }
        .set-nav-item.active { background:#ccfbf1; color:#0f766e; }
        input:focus, select:focus, textarea:focus { outline:none; border-color:#0f766e !important; box-shadow:0 0 0 3px rgba(15,118,110,0.12); }
        .set-row { display:flex; align-items:center; justify-content:space-between; padding:16px 0; border-bottom:1px solid #f3f4f6; gap:20px; }
        .set-row:last-child { border-bottom:none; }
        .set-label { font-size:14px; font-weight:600; color:#111827; margin:0 0 3px; }
        .set-desc { font-size:12px; color:#9ca3af; margin:0; }
      `}</style>

      <div className="set-page">
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#ccfbf1,#99f6e4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚙️</div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:"#111827", letterSpacing:"-0.02em" }}>Settings</h1>
            </div>
            <p style={{ margin:0, fontSize:13, color:"#9ca3af" }}>Platform-wide configuration for SkillArc</p>
          </div>
          {isDirty && (
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:12, color:"#9ca3af", background:"#fef3c7", padding:"4px 10px", borderRadius:8 }}>Unsaved changes</span>
              <button onClick={handleDiscard} style={{ padding:"8px 14px", background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Discard</button>
              <button onClick={handleSave} disabled={isPending}
                style={{ padding:"8px 18px", background:"linear-gradient(135deg,#0f766e,#0d9488)", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(15,118,110,0.3)", opacity:isPending?0.6:1 }}>
                {isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:16, alignItems:"start" }}>
          {/* Sidebar nav */}
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:8 }}>
            {sections.map(s => (
              <button key={s.key} className={`set-nav-item ${activeSection===s.key?"active":""}`} onClick={() => setActiveSection(s.key)}>
                <span style={{ fontSize:16 }}>{s.icon}</span>{s.label}
              </button>
            ))}
            <div style={{ margin:"8px 0", borderTop:"1px solid #f3f4f6" }} />
            {/* Build info */}
            <div style={{ padding:"10px 14px" }}>
              <p style={{ margin:"0 0 4px", fontSize:11, color:"#9ca3af", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>Build</p>
              <p style={{ margin:0, fontSize:12, fontFamily:"'DM Mono',monospace", color:"#374151" }}>v{buildVersion}</p>
              {lastDeployed && <p style={{ margin:"2px 0 0", fontSize:11, color:"#9ca3af" }}>Deployed {new Date(lastDeployed).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</p>}
            </div>
          </div>

          {/* Content */}
          <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:14, padding:"24px 28px" }}>

            {/* General */}
            {activeSection === "general" && (
              <>
                <SectionHeader icon="⚙️" title="General Settings" subtitle="Basic platform configuration" />
                <div className="set-row">
                  <div><p className="set-label">Platform Name</p><p className="set-desc">Shown across all interfaces</p></div>
                  <input type="text" value={settings.platform_name} onChange={e=>set("platform_name",e.target.value)} style={{ ...inputStyle, width:260 }} />
                </div>
                <div className="set-row">
                  <div><p className="set-label">Support Email</p><p className="set-desc">Used for system notifications</p></div>
                  <input type="email" value={settings.support_email} onChange={e=>set("support_email",e.target.value)} style={{ ...inputStyle, width:260 }} />
                </div>
                <div className="set-row">
                  <div><p className="set-label">Default Timezone</p><p className="set-desc">For timestamps and scheduling</p></div>
                  <select value={settings.default_timezone} onChange={e=>set("default_timezone",e.target.value)} style={{ ...inputStyle, width:220, cursor:"pointer" }}>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
                <div className="set-row">
                  <div><p className="set-label">Self Registration</p><p className="set-desc">Allow users to sign up on their own</p></div>
                  <Toggle value={settings.allow_self_registration} onChange={v=>set("allow_self_registration",v)} />
                </div>
              </>
            )}

            {/* Security */}
            {activeSection === "security" && (
              <>
                <SectionHeader icon="🔐" title="Security Settings" subtitle="Authentication and access controls" />
                <div className="set-row">
                  <div><p className="set-label">Email Verification</p><p className="set-desc">Require email verification on signup</p></div>
                  <Toggle value={settings.require_email_verification} onChange={v=>set("require_email_verification",v)} />
                </div>
                <div className="set-row">
                  <div>
                    <p className="set-label">Session Timeout</p>
                    <p className="set-desc">Auto logout after inactivity (hours)</p>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <input type="number" min={1} max={168} value={settings.session_timeout_hours} onChange={e=>set("session_timeout_hours",Number(e.target.value))} style={{ ...inputStyle, width:90, textAlign:"center" }} />
                    <span style={{ fontSize:13, color:"#9ca3af" }}>hours</span>
                  </div>
                </div>
                <div style={{ marginTop:24, padding:"16px 20px", background:"#f0fdfa", border:"1px solid #99f6e4", borderRadius:12 }}>
                  <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:700, color:"#0f766e" }}>🔒 Security Tip</p>
                  <p style={{ margin:0, fontSize:13, color:"#115e59" }}>We recommend a session timeout of 8–24 hours for org admins and enabling email verification for all new accounts.</p>
                </div>
              </>
            )}

            {/* Limits */}
            {activeSection === "limits" && (
              <>
                <SectionHeader icon="📐" title="Platform Limits" subtitle="Caps on organizations and institutions" />
                <div className="set-row">
                  <div>
                    <p className="set-label">Max Organizations per Plan</p>
                    <p className="set-desc">Hard limit on org creation per subscription</p>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <input type="number" min={1} max={1000} value={settings.max_orgs_per_plan} onChange={e=>set("max_orgs_per_plan",Number(e.target.value))} style={{ ...inputStyle, width:100, textAlign:"center" }} />
                    <span style={{ fontSize:13, color:"#9ca3af" }}>orgs</span>
                  </div>
                </div>
                <div className="set-row">
                  <div>
                    <p className="set-label">Max Institutions per Org</p>
                    <p className="set-desc">How many institutions one org can create</p>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <input type="number" min={1} max={500} value={settings.max_institutions_per_org} onChange={e=>set("max_institutions_per_org",Number(e.target.value))} style={{ ...inputStyle, width:100, textAlign:"center" }} />
                    <span style={{ fontSize:13, color:"#9ca3af" }}>institutions</span>
                  </div>
                </div>
                <div style={{ marginTop:24, padding:"16px 20px", background:"#f0fdfa", border:"1px solid #99f6e4", borderRadius:12 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>
                    {[
                      { label:"Max Orgs / Plan", value:settings.max_orgs_per_plan },
                      { label:"Max Institutions / Org", value:settings.max_institutions_per_org },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign:"center" }}>
                        <p style={{ margin:"0 0 4px", fontSize:22, fontWeight:700, color:"#0f766e", fontFamily:"'DM Mono',monospace" }}>{s.value}</p>
                        <p style={{ margin:0, fontSize:12, color:"#115e59", fontWeight:600 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Maintenance */}
            {activeSection === "maintenance" && (
              <>
                <SectionHeader icon="🔧" title="Maintenance Mode" subtitle="Temporarily restrict platform access" />
                <div className="set-row">
                  <div>
                    <p className="set-label">Enable Maintenance Mode</p>
                    <p className="set-desc">Blocks all non-super-admin access</p>
                  </div>
                  <Toggle value={settings.maintenance_mode} onChange={v=>set("maintenance_mode",v)} />
                </div>
                <div className="set-row">
                  <div style={{ flex:1 }}>
                    <p className="set-label">Maintenance Message</p>
                    <p className="set-desc" style={{ marginBottom:10 }}>Shown to users when maintenance mode is on</p>
                    <textarea value={settings.maintenance_message} onChange={e=>set("maintenance_message",e.target.value)} rows={3}
                      style={{ ...inputStyle, width:"100%", resize:"vertical", lineHeight:1.5, fontSize:13 }}
                      placeholder="We're performing scheduled maintenance. Back soon!" />
                  </div>
                </div>
                {settings.maintenance_mode && (
                  <div style={{ marginTop:8, padding:"14px 18px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:12 }}>
                    <p style={{ margin:0, fontSize:13, color:"#991b1b", fontWeight:600 }}>
                      ⚠️ Maintenance mode is ON. Users cannot access the platform. Remember to save and then turn this off when done.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Save button at bottom of content */}
            <div style={{ marginTop:28, paddingTop:20, borderTop:"1px solid #f3f4f6", display:"flex", justifyContent:"flex-end", gap:10 }}>
              {isDirty && <button onClick={handleDiscard} style={{ padding:"9px 18px", background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Discard</button>}
              <button onClick={handleSave} disabled={isPending || !isDirty}
                style={{ padding:"9px 22px", background: isDirty ? "linear-gradient(135deg,#0f766e,#0d9488)" : "#e5e7eb", color: isDirty ? "#fff" : "#9ca3af", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor: isDirty ? "pointer" : "not-allowed", fontFamily:"inherit", boxShadow: isDirty ? "0 4px 14px rgba(15,118,110,0.25)" : "none", opacity:isPending?0.6:1, transition:"all 0.2s" }}>
                {isPending ? "Saving…" : isDirty ? "Save Changes" : "No Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}