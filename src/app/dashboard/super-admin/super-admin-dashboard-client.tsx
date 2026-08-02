"use client"

import { useState, useTransition } from "react"
import { createOrganization, createOrgAdmin } from "./actions"

type Organization = {
  id: string
  name: string
  created_at: string
  institution_count: number
}

type OrgAdmin = {
  id: string
  name: string
  email: string
  created_at: string
  organization_id: string
  organization_name: string
}

type Props = {
  admin: { name: string; email: string }
  stats: {
    organizations: number
    orgAdmins: number
    institutions: number
    users: number
  }
  organizations: Organization[]
  orgAdmins: OrgAdmin[]
}

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: string
  accent: string
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "20px 24px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 8px 24px rgba(0,0,0,0.08)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "none"
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "#9ca3af",
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 28,
            fontWeight: 700,
            color: "#111827",
            lineHeight: 1,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  )
}

// ─── Modal Shell ─────────────────────────────────────────────────────────────
function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          width: "100%",
          maxWidth: 480,
          padding: "28px 32px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
              }}
            >
              {title}
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              color: "#9ca3af",
              lineHeight: 1,
              padding: 4,
              borderRadius: 6,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Field ───────────────────────────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: "#111827",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 14,
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  background: "#f9fafb",
  color: "#111827",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({
  message,
  type,
}: {
  message: string
  type: "success" | "error"
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        right: 32,
        background: type === "success" ? "#0f766e" : "#dc2626",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 500,
        zIndex: 200,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span>{type === "success" ? "✓" : "✕"}</span>
      {message}
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
        color: "#9ca3af",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminDashboardClient({
  admin,
  stats,
  organizations,
  orgAdmins,
}: Props) {
  const [activeTab, setActiveTab] = useState<"organizations" | "admins">(
    "organizations"
  )
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error"
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Local state for optimistic UI
  const [localOrgs, setLocalOrgs] = useState(organizations ?? [])
  const [localAdmins, setLocalAdmins] = useState(orgAdmins ?? [])

  // Create Org form
  const [orgName, setOrgName] = useState("")
  const [orgError, setOrgError] = useState("")

  // Create Admin form
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminOrgId, setAdminOrgId] = useState("")
  const [adminError, setAdminError] = useState("")

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleEnterOrg(orgId: string) {
    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "ORG_ADMIN",
          organization_id: orgId,
        }),
      })
      if (res.ok) {
        window.location.href = "/dashboard"
      } else {
        showToast("Failed to enter organization", "error")
      }
    } catch (err) {
      console.error(err)
      showToast("Error entering organization", "error")
    }
  }

  async function handleImpersonateAdmin(adminId: string, orgId: string) {
    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "ORG_ADMIN",
          organization_id: orgId,
          user_id: adminId,
        }),
      })
      if (res.ok) {
        window.location.href = "/dashboard"
      } else {
        showToast("Failed to impersonate admin", "error")
      }
    } catch (err) {
      console.error(err)
      showToast("Error impersonating admin", "error")
    }
  }

  async function handleCreateOrg() {
    if (!orgName.trim()) {
      setOrgError("Organization name is required.")
      return
    }
    setOrgError("")
    startTransition(async () => {
      const result = await createOrganization(orgName.trim())
      if (result.success && result.org) {
        setLocalOrgs((prev) => [
          {
            id: result.org!.id,
            name: result.org!.name,
            created_at: result.org!.created_at,
            institution_count: 0,
          },
          ...prev,
        ])
        setOrgName("")
        setShowCreateOrg(false)
        showToast(`"${result.org.name}" created successfully`, "success")
      } else {
        setOrgError(result.error ?? "Something went wrong.")
        showToast(result.error ?? "Failed to create organization", "error")
      }
    })
  }

  async function handleCreateAdmin() {
    if (!adminName.trim()) {
      setAdminError("Full name is required.")
      return
    }
    if (!adminEmail.trim()) {
      setAdminError("Email is required.")
      return
    }
    if (!adminPassword || adminPassword.length < 8) {
      setAdminError("Password must be at least 8 characters.")
      return
    }
    if (!adminOrgId) {
      setAdminError("Please select an organization.")
      return
    }
    setAdminError("")
    startTransition(async () => {
      const result = await createOrgAdmin({
        name: adminName.trim(),
        email: adminEmail.trim(),
        password: adminPassword,
        organization_id: adminOrgId,
      })
      if (result.success && result.admin) {
        const org = localOrgs.find((o) => o.id === adminOrgId)
        setLocalAdmins((prev) => [
          {
            id: result.admin!.id,
            name: result.admin!.name,
            email: result.admin!.email,
            created_at: new Date().toISOString(),
            organization_id: adminOrgId,
            organization_name: org?.name ?? "—",
          },
          ...prev,
        ])
        setAdminName("")
        setAdminEmail("")
        setAdminPassword("")
        setAdminOrgId("")
        setShowCreateAdmin(false)
        showToast(`Admin "${result.admin.name}" created`, "success")
      } else {
        setAdminError(result.error ?? "Something went wrong.")
        showToast(result.error ?? "Failed to create admin", "error")
      }
    })
  }

  const tabs = [
    { key: "organizations", label: "Organizations", count: localOrgs?.length ?? 0 },
    { key: "admins", label: "Org Admins", count: localAdmins?.length ?? 0 },
  ] as const

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        :root {
          --sa-bg:     #f8fafc;
          --sa-card:   #ffffff;
          --sa-border: #e2e8f0;
          --sa-text:   #111827;
          --sa-muted:  #6b7280;
          --sa-accent: #6c63ff;
          --sa-accent2:#8b5cf6;
          --sa-input:  #f8fafc;
        }

        * { box-sizing: border-box; }

        .sa-page {
          font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
          min-height: 100%;
          background: #f8fafc;
        }

        .sa-main { width: 100%; }

        .sa-topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .sa-page-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .sa-page-sub {
          font-size: 12px;
          color: #9ca3af;
          margin: 4px 0 0;
        }

        .sa-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 1100px) {
          .sa-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .sa-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
        }

        .sa-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .sa-tabs {
          display: flex;
          gap: 4px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 3px;
        }

        .sa-tab {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: none;
          color: #6b7280;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
        }

        .sa-tab.active {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }

        .sa-tab-count {
          background: #e2e8f0;
          color: #6b7280;
          font-size: 11px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 99px;
        }

        .sa-tab.active .sa-tab-count {
          background: linear-gradient(135deg, #6c63ff, #8b5cf6);
          color: #fff;
        }

        .sa-btn-primary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #6c63ff, #8b5cf6);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          box-shadow: 0 4px 14px rgba(108,99,255,0.3);
          transition: opacity 0.15s, transform 0.12s;
        }

        .sa-btn-primary:hover { opacity: 0.88; }
        .sa-btn-primary:active { transform: scale(0.97); }
        .sa-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .sa-btn-amber {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #ffb020;
          color: #111827;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          box-shadow: 0 4px 14px rgba(255,176,32,0.25);
          transition: opacity 0.15s, transform 0.12s;
        }

        .sa-btn-amber:hover { opacity: 0.88; }
        .sa-btn-amber:active { transform: scale(0.97); }
        .sa-btn-amber:disabled { opacity: 0.5; cursor: not-allowed; }

        .sa-btn-outline-indigo {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 1.5px solid #6c63ff;
          color: #6c63ff;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
          margin-left: 8px;
        }
        .sa-btn-outline-indigo:hover {
          background: rgba(108, 99, 255, 0.08);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(108, 99, 255, 0.12);
        }
        .sa-btn-outline-indigo:active {
          transform: translateY(0) scale(0.98);
        }

        .sa-btn-outline-purple {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 1.5px solid #8b5cf6;
          color: #8b5cf6;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .sa-btn-outline-purple:hover {
          background: rgba(139, 92, 246, 0.08);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.12);
        }
        .sa-btn-outline-purple:active {
          transform: translateY(0) scale(0.98);
        }

        .sa-btn-submit {
          width: 100%;
          padding: 11px;
          background: linear-gradient(135deg, #6c63ff, #8b5cf6);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          margin-top: 8px;
          box-shadow: 0 4px 14px rgba(108,99,255,0.25);
          transition: opacity 0.15s;
        }

        .sa-btn-submit:hover { opacity: 0.88; }
        .sa-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .sa-table {
          width: 100%;
          border-collapse: collapse;
        }

        .sa-table th {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #9ca3af;
          padding: 11px 20px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .sa-table td {
          padding: 13px 20px;
          font-size: 14px;
          color: #111827;
          border-bottom: 1px solid #f3f4f6;
        }

        .sa-table tr:last-child td { border-bottom: none; }

        .sa-table tbody tr { transition: background 0.1s; }
        .sa-table tbody tr:hover { background: #f9fafb; }

        .sa-org-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #fef3c7;
          color: #b45309;
          font-size: 12px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 99px;
        }

        .sa-count-badge {
          display: inline-block;
          background: #ede9fe;
          color: #5b21b6;
          font-size: 12px;
          font-weight: 600;
          padding: 2px 10px;
          border-radius: 99px;
          font-family: 'DM Mono', monospace;
        }

        .sa-error {
          color: #dc2626;
          font-size: 13px;
          margin: 8px 0 0;
        }

        input, select {
          font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
        }

        input:focus, select:focus {
          outline: none;
          border-color: #4f46e5 !important;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.12);
        }
      `}</style>

      <div className="sa-page">
        {/* ── Main ── */}
        <main className="sa-main">
          {/* Top bar */}
          <div className="sa-topbar">
            <div>
              <h1 className="sa-page-title">Platform Overview</h1>
              <p className="sa-page-sub">
                Manage organizations and administrators across SkillArc
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="sa-btn-primary"
                onClick={() => setShowCreateOrg(true)}
              >
                <span style={{ fontSize: 16 }}>+</span> New Organization
              </button>
              <button
                className="sa-btn-amber"
                onClick={() => setShowCreateAdmin(true)}
              >
                <span style={{ fontSize: 16 }}>+</span> New Org Admin
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="sa-stats-grid">
            <StatCard
              label="Organizations"
              value={stats.organizations}
              icon="🏢"
              accent="#dbeafe"
            />
            <StatCard
              label="Org Admins"
              value={stats.orgAdmins}
              icon="👤"
              accent="#ede9fe"
            />
            <StatCard
              label="Institutions"
              value={stats.institutions}
              icon="🏫"
              accent="#d1fae5"
            />
            <StatCard
              label="Platform Users"
              value={stats.users}
              icon="👥"
              accent="#fce7f3"
            />
          </div>

          {/* Section */}
          <div className="sa-section">
            <div className="sa-section-header">
              <div className="sa-tabs">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    className={`sa-tab ${activeTab === t.key ? "active" : ""}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                    <span className="sa-tab-count">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Organizations Table */}
            {activeTab === "organizations" && (
              <>
                {(localOrgs?.length ?? 0) === 0 ? (
                  <EmptyState message="No organizations yet. Create your first one." />
                ) : (
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Organization</th>
                        <th>Institutions</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localOrgs.map((org) => (
                        <tr key={org.id}>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                              }}
                            >
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 10,
                                  background: "#dbeafe",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 700,
                                  fontSize: 14,
                                  color: "#1d4ed8",
                                  flexShrink: 0,
                                }}
                              >
                                {org.name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600 }}>{org.name}</span>
                            </div>
                          </td>
                          <td>
                            <span className="sa-count-badge">
                              {org.institution_count} inst.
                            </span>
                          </td>
                          <td style={{ color: "#9ca3af" }}>
                            {new Date(org.created_at).toLocaleDateString(
                              "en-IN",
                              { day: "numeric", month: "short", year: "numeric" }
                            )}
                          </td>
                          <td>
                            <button
                              style={{
                                background: "none",
                                border: "1px solid #e5e7eb",
                                borderRadius: 7,
                                padding: "4px 12px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                color: "#4f46e5",
                                fontFamily: "inherit",
                                transition: "background 0.12s",
                              }}
                              onClick={() => {
                                setAdminOrgId(org.id)
                                setShowCreateAdmin(true)
                              }}
                            >
                              + Add Admin
                            </button>
                            <button
                              className="sa-btn-outline-indigo"
                              onClick={() => handleEnterOrg(org.id)}
                            >
                              Enter Org
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* Org Admins Table */}
            {activeTab === "admins" && (
              <>
                {(localAdmins?.length ?? 0) === 0 ? (
                  <EmptyState message="No org admins yet. Create one." />
                ) : (
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Admin</th>
                        <th>Organization</th>
                        <th>Email</th>
                        <th>Added</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localAdmins.map((admin) => (
                        <tr key={admin.id}>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 99,
                                  background: "#ede9fe",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#6d28d9",
                                  flexShrink: 0,
                                }}
                              >
                                {(admin.name || admin.email)
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600 }}>
                                {admin.name || "—"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="sa-org-pill">
                              🏢 {admin.organization_name}
                            </span>
                          </td>
                          <td style={{ color: "#9ca3af" }}>
                            {admin.email}
                          </td>
                          <td style={{ color: "#9ca3af" }}>
                            {new Date(admin.created_at).toLocaleDateString(
                              "en-IN",
                              { day: "numeric", month: "short", year: "numeric" }
                            )}
                          </td>
                          <td>
                            <button
                              className="sa-btn-outline-purple"
                              onClick={() => handleImpersonateAdmin(admin.id, admin.organization_id)}
                            >
                              Impersonate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* ── Create Organization Modal ── */}
      {showCreateOrg && (
        <Modal
          title="Create Organization"
          subtitle="Organizations are top-level entities that own institutions."
          onClose={() => {
            setShowCreateOrg(false)
            setOrgName("")
            setOrgError("")
          }}
        >
          <Field label="Organization Name">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Lumbini Technologies"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handleCreateOrg()}
              autoFocus
            />
          </Field>
          {orgError && <p className="sa-error">{orgError}</p>}
          <button
            className="sa-btn-submit"
            onClick={handleCreateOrg}
            disabled={isPending}
          >
            {isPending ? "Creating…" : "Create Organization"}
          </button>
        </Modal>
      )}

      {/* ── Create Org Admin Modal ── */}
      {showCreateAdmin && (
        <Modal
          title="Create Org Admin"
          subtitle="This person will manage everything under their organization."
          onClose={() => {
            setShowCreateAdmin(false)
            setAdminName("")
            setAdminEmail("")
            setAdminPassword("")
            setAdminOrgId("")
            setAdminError("")
          }}
        >
          <Field label="Full Name">
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="e.g. Ravi Kumar"
              style={inputStyle}
              autoFocus
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="ravi@lumbini.com"
              style={inputStyle}
            />
          </Field>
          <Field label="Temporary Password">
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Min. 8 characters"
              style={inputStyle}
            />
          </Field>
          <Field label="Organization">
            <select
              value={adminOrgId}
              onChange={(e) => setAdminOrgId(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Select organization…</option>
              {localOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </Field>
          {adminError && <p className="sa-error">{adminError}</p>}
          <button
            className="sa-btn-submit"
            onClick={handleCreateAdmin}
            disabled={isPending}
          >
            {isPending ? "Creating…" : "Create Org Admin"}
          </button>
        </Modal>
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}