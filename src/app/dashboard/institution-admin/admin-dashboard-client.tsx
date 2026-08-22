"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Building2, Users, GraduationCap, BookOpen,
  LayoutGrid, Clock, ChevronRight, Mail, Plus
} from "lucide-react"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"
type Status = "idle" | "loading" | "success" | "error"

interface Institution { id: string; name: string; domain: string | null }
interface Stats { faculty: number; students: number; courses: number }
interface RecentUser { id: string; email: string; role: string; created_at: string }

export default function AdminDashboardClient({
  institution,
  stats,
  recentUsers,
}: {
  institution: Institution | null
  stats: Stats
  recentUsers: RecentUser[]
}) {
  const router = useRouter()
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("teacher")
  const [inviteStatus, setInviteStatus] = useState<Status>("idle")
  const [inviteError, setInviteError] = useState("")

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviteStatus("loading")
    setInviteError("")
    try {
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          institutionId: institution?.id,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to invite")
      }
      setInviteStatus("success")
      setInviteEmail("")
      setTimeout(() => { setInviteStatus("idle"); router.refresh() }, 2000)
    } catch (err: any) {
      setInviteError(err.message)
      setInviteStatus("error")
    }
  }

  const statCards = [
    { label: "Teachers", value: stats.faculty, accent: "#d1fae5", text: "#065f46", icon: <Users size={17} color="#065f46" /> },
    { label: "Students", value: stats.students, accent: "#dbeafe", text: "#1d4ed8", icon: <GraduationCap size={17} color="#1d4ed8" /> },
    { label: "Courses", value: stats.courses, accent: "#fef3c7", text: "#b45309", icon: <BookOpen size={17} color="#b45309" /> },
  ]

  const quickActions = [
    { label: "Departments", desc: "Manage all departments", icon: "🏢", href: "/dashboard/institution-admin/departments" },
    { label: "Programs", desc: "Manage programs", icon: "🎓", href: "/dashboard/institution-admin/programs" },
    { label: "Teachers", desc: "View & invite faculty", icon: "👨‍🏫", href: "/dashboard/institution-admin/faculty" },
    { label: "Students", desc: "View & invite students", icon: "👩‍🎓", href: "/dashboard/institution-admin/students" },
    { label: "Subjects", desc: "Manage subjects", icon: "📘", href: "/dashboard/institution-admin/subjects" },
    { label: "Timetable", desc: "View & manage timetable", icon: "📅", href: "/dashboard/institution-admin/timetable" },
  ]

  const roleBadgeColor: Record<string, { bg: string; text: string }> = {
    teacher: { bg: "#d1fae5", text: "#065f46" },
    student: { bg: "#dbeafe", text: "#1d4ed8" },
    hod: { bg: "#ede9fe", text: "#6d28d9" },
    program_head: { bg: "#fef3c7", text: "#b45309" },
    institution_admin: { bg: "#fee2e2", text: "#991b1b" },
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ fontFamily: font, maxWidth: 960, margin: "0 auto" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        style={{
          backgroundColor: "#fff", borderRadius: 16, padding: "20px 24px",
          border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Building2 size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
              {institution?.name ?? "Institution Dashboard"}
            </h1>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
              {greeting}, Admin 👋 &nbsp;·&nbsp; {institution?.domain ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/dashboard/institution-admin")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 10, border: "none",
            backgroundColor: "#1d4ed8", color: "#fff",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font,
          }}
        >
          <Plus size={14} /> Invite Member
        </button>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {statCards.map((s, idx) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            style={{
              backgroundColor: "#fff", borderRadius: 14, padding: "16px 20px",
              border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(20,35,75,0.08)",
              display: "flex", alignItems: "center", gap: 14,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10, backgroundColor: s.accent,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: s.text, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          backgroundColor: "#fff", borderRadius: 16, padding: 24,
          border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <LayoutGrid size={15} color="#6b7280" />
          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Quick Actions</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {quickActions.map(a => (
            <div
              key={a.label}
              onClick={() => router.push(a.href)}
              style={{
                border: "1px solid #f3f4f6", borderRadius: 12, padding: "14px 16px",
                cursor: "pointer", transition: "all 0.15s", backgroundColor: "#fafafa",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = "#eff6ff"
                ;(e.currentTarget as HTMLDivElement).style.borderColor = "#bfdbfe"
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = "#fafafa"
                ;(e.currentTarget as HTMLDivElement).style.borderColor = "#f3f4f6"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{a.icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{a.label}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{a.desc}</p>
                </div>
              </div>
              <ChevronRight size={14} color="#d1d5db" />
            </div>
          ))}
        </div>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{
            backgroundColor: "#fff", borderRadius: 16, padding: 24,
            border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Mail size={15} color="#6b7280" />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Invite Member</p>
          </div>

          {inviteStatus === "success" && (
            <div style={{
              backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 8, padding: "10px 14px", marginBottom: 14,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>🎉</span>
              <p style={{ fontSize: 12, color: "#166534", margin: 0, fontWeight: 500 }}>Invite sent!</p>
            </div>
          )}
          {inviteStatus === "error" && (
            <div style={{
              backgroundColor: "#fee2e2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 14px", marginBottom: 14,
            }}>
              <p style={{ fontSize: 12, color: "#991b1b", margin: 0 }}>{inviteError}</p>
            </div>
          )}

          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 5, display: "block" }}>
            Email <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            placeholder="faculty@college.edu"
            value={inviteEmail}
            type="email"
            onChange={e => setInviteEmail(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", fontSize: 13,
              border: "1px solid #e5e7eb", borderRadius: 10,
              backgroundColor: "#f9fafb", color: "#111827",
              outline: "none", marginBottom: 12, boxSizing: "border-box", fontFamily: font,
            }}
          />

          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 5, display: "block" }}>
            Role
          </label>
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", fontSize: 13,
              border: "1px solid #e5e7eb", borderRadius: 10,
              backgroundColor: "#f9fafb", color: "#111827",
              outline: "none", marginBottom: 16, boxSizing: "border-box", fontFamily: font,
            }}
          >
            <option value="teacher">Faculty / Teacher</option>
            <option value="student">Student</option>
            <option value="hod">Head of Department</option>
            <option value="program_head">Program Head</option>
          </select>

          <button
            onClick={handleInvite}
            disabled={!inviteEmail.trim() || inviteStatus === "loading"}
            style={{
              width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700,
              color: "#fff",
              backgroundColor: !inviteEmail.trim() ? "#e5e7eb" : inviteStatus === "loading" ? "#93c5fd" : "#1d4ed8",
              border: "none", borderRadius: 10,
              cursor: !inviteEmail.trim() || inviteStatus === "loading" ? "not-allowed" : "pointer",
              transition: "background 0.15s", fontFamily: font,
            }}
          >
            {inviteStatus === "loading" ? "Sending…" : "Send Invite"}
          </button>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
          style={{
            backgroundColor: "#fff", borderRadius: 16, padding: 24,
            border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Clock size={15} color="#6b7280" />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Recent Members</p>
          </div>

          {recentUsers.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "32px 0",
              border: "1.5px dashed #e5e7eb", borderRadius: 12,
            }}>
              <p style={{ fontSize: 13, color: "#9ca3af" }}>No members yet</p>
              <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 4 }}>Invite someone to get started</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentUsers.map(u => {
                const badge = roleBadgeColor[u.role] ?? { bg: "#f3f4f6", text: "#374151" }
                return (
                  <div key={u.id} style={{
                    border: "1px solid #f3f4f6", borderRadius: 12, padding: "11px 14px",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, backgroundColor: "#f3f4f6",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Mail size={13} color="#6b7280" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 600, color: "#111827",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {u.email}
                      </p>
                      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                      backgroundColor: badge.bg, color: badge.text,
                      textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0,
                    }}>
                      {u.role.replace(/_/g, " ")}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.section>
      </div>
    </motion.div>
  )
}