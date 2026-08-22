"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Users, BookOpen, Clock, UserCheck, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

interface Subject {
  id: string
  name: string
  code: string
  facultyId: string | null
  facultyName: string
}

interface Faculty {
  id: string
  name: string
  email: string
}

export default function HodDashboardClient({
  hod,
  stats,
  faculty,
  subjects,
}: {
  hod: { name: string; email: string; institution: string }
  stats: { facultyCount: number; subjectsCount: number }
  faculty: Faculty[]
  subjects: Subject[]
}) {
  const router = useRouter()
  const [selectedSubjectId, setSelectedSubjectId] = useState("")
  const [selectedFacultyId, setSelectedFacultyId] = useState("")
  const [allocationStatus, setAllocationStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const unassignedCount = subjects.filter(s => !s.facultyId).length
  const assignedPercentage = subjects.length > 0 
    ? Math.round(((subjects.length - unassignedCount) / subjects.length) * 100) 
    : 100

  async function handleAssign() {
    if (!selectedSubjectId) return
    setAllocationStatus("loading")
    setErrorMsg("")
    
    try {
      const { error } = await supabase
        .from("subjects")
        .update({ faculty_id: selectedFacultyId || null })
        .eq("id", selectedSubjectId)

      if (error) throw error

      setAllocationStatus("success")
      setSelectedSubjectId("")
      setSelectedFacultyId("")
      setTimeout(() => {
        setAllocationStatus("idle")
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update allocation")
      setAllocationStatus("error")
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ fontFamily: font, maxWidth: 960, margin: "0 auto" }}
    >
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        style={{
          backgroundColor: "#fff", borderRadius: 16, padding: "20px 24px",
          border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <UserCheck size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
              Department Head Portal
            </h1>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
              {hod.institution} &nbsp;·&nbsp; Head of Department: <strong>{hod.name}</strong>
            </p>
          </div>
        </div>
        <button
          onClick={() => router.refresh()}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 10, border: "1px solid #e5e7eb",
            backgroundColor: "#fff", color: "#374151",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font,
          }}
        >
          <RefreshCw size={12} /> Sync Data
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Department Faculty", value: stats.facultyCount, accent: "#d1fae5", text: "#065f46", icon: <Users size={17} color="#065f46" /> },
          { label: "Active Subjects", value: stats.subjectsCount, accent: "#dbeafe", text: "#1d4ed8", icon: <BookOpen size={17} color="#1d4ed8" /> },
          { label: "Unallocated Subjects", value: unassignedCount, accent: unassignedCount > 0 ? "#fee2e2" : "#fef3c7", text: unassignedCount > 0 ? "#991b1b" : "#b45309", icon: <Clock size={17} color={unassignedCount > 0 ? "#991b1b" : "#b45309"} /> },
        ].map((s, idx) => (
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
            }}>
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

      {/* Core Split Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 16 }}>
        
        {/* Left Side: Subject Assignment Tool */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{
            backgroundColor: "#fff", borderRadius: 16, padding: 24,
            border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            display: "flex", flexDirection: "column", gap: 16,
          }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Assign Faculty</h2>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Bind faculty to curricular syllabus subjects</p>
          </div>

          {allocationStatus === "success" && (
            <div style={{
              backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
            }}>
              <CheckCircle2 size={14} color="#166534" />
              <p style={{ fontSize: 12, color: "#166534", margin: 0, fontWeight: 500 }}>Allocation updated successfully!</p>
            </div>
          )}

          {allocationStatus === "error" && (
            <div style={{
              backgroundColor: "#fee2e2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
            }}>
              <AlertCircle size={14} color="#991b1b" />
              <p style={{ fontSize: 11, color: "#991b1b", margin: 0 }}>{errorMsg}</p>
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 5, display: "block" }}>
              Select Subject <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px", fontSize: 13,
                border: "1px solid #e5e7eb", borderRadius: 10,
                backgroundColor: "#f9fafb", color: "#111827",
                outline: "none", boxSizing: "border-box", fontFamily: font,
              }}
            >
              <option value="">-- Choose Subject --</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name} ({s.facultyId ? "Allocated" : "Unallocated"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 5, display: "block" }}>
              Assign Faculty
            </label>
            <select
              value={selectedFacultyId}
              onChange={e => setSelectedFacultyId(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px", fontSize: 13,
                border: "1px solid #e5e7eb", borderRadius: 10,
                backgroundColor: "#f9fafb", color: "#111827",
                outline: "none", boxSizing: "border-box", fontFamily: font,
              }}
            >
              <option value="">-- Unassign / Clear --</option>
              {faculty.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAssign}
            disabled={!selectedSubjectId || allocationStatus === "loading"}
            style={{
              width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700,
              color: "#fff",
              backgroundColor: !selectedSubjectId ? "#e5e7eb" : allocationStatus === "loading" ? "#93c5fd" : "#1d4ed8",
              border: "none", borderRadius: 10,
              cursor: !selectedSubjectId || allocationStatus === "loading" ? "not-allowed" : "pointer",
              transition: "background 0.15s", fontFamily: font,
              marginTop: 8,
            }}
          >
            {allocationStatus === "loading" ? "Assigning..." : "Assign Faculty"}
          </button>

          {/* Allocation Ratio Bar */}
          <div style={{ marginTop: 12, borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>Allocation Rate</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{assignedPercentage}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, backgroundColor: "#e5e7eb", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, backgroundColor: "#10b981", width: `${assignedPercentage}%`, transition: "width 0.4s" }} />
            </div>
          </div>
        </motion.div>

        {/* Right Side: Subjects Listing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
          style={{
            backgroundColor: "#fff", borderRadius: 16, padding: 24,
            border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Curriculum Overview</h2>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Manage department workloads and syllabus allocation</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "400px", overflowY: "auto", paddingRight: 4 }}>
            {subjects.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "40px 0",
                border: "1.5px dashed #e5e7eb", borderRadius: 12,
              }}>
                <p style={{ fontSize: 13, color: "#9ca3af" }}>No department subjects mapped</p>
                <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 4 }}>Invite courses or assign batches first.</p>
              </div>
            ) : (
              subjects.map(s => {
                const isAssigned = !!s.facultyId
                return (
                  <div key={s.id} style={{
                    border: "1px solid #f3f4f6", borderRadius: 12, padding: "12px 16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    backgroundColor: isAssigned ? "#fff" : "#fafafa",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        backgroundColor: isAssigned ? "#dbeafe" : "#fee2e2",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700, color: isAssigned ? "#1d4ed8" : "#991b1b",
                      }}>
                        📘
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.name}</p>
                        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                          Code: <strong>{s.code}</strong> &nbsp;·&nbsp; Faculty: <strong style={{ color: isAssigned ? "#10b981" : "#ef4444" }}>{s.facultyName}</strong>
                        </p>
                      </div>
                    </div>

                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "3px 8px", borderRadius: 6,
                      fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                      backgroundColor: isAssigned ? "#d1fae5" : "#fee2e2",
                      color: isAssigned ? "#065f46" : "#991b1b",
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: isAssigned ? "#10b981" : "#ef4444", display: "inline-block" }} />
                      {isAssigned ? "ALLOCATED" : "PENDING"}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  )
}
