"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { BookOpen, GraduationCap, LayoutGrid, Award, CheckCircle2, ChevronRight, Settings } from "lucide-react"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

interface Course {
  id: string
  name: string
  code: string
}

export default function ProgramHeadDashboardClient({
  programHead,
  stats,
  courses,
}: {
  programHead: { name: string; email: string; institution: string }
  stats: { studentsCount: number; coursesCount: number }
  courses: Course[]
}) {
  const router = useRouter()
  
  // High-fidelity Mock cohort batches under this program for visual excellence
  const [cohorts] = useState([
    { id: "c1", name: "B.Tech CSE - Batch 2024 (Semester IV)", students: 120, coordinator: "Dr. Alan Turing", compliance: 95 },
    { id: "c2", name: "B.Tech CSE - Batch 2023 (Semester VI)", students: 114, coordinator: "Dr. Grace Hopper", compliance: 88 },
    { id: "c3", name: "B.Tech CSE - Batch 2025 (Semester II)", students: 128, coordinator: "Dr. Richard Feynman", compliance: 100 },
  ])

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
            background: "linear-gradient(135deg, #6d28d9, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <GraduationCap size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
              Program Head Portal
            </h1>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
              {programHead.institution} &nbsp;·&nbsp; Program Director: <strong>{programHead.name}</strong>
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/dashboard/courses")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 10, border: "none",
            backgroundColor: "#6d28d9", color: "#fff",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: font,
          }}
        >
          <BookOpen size={13} /> Manage Curriculum
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Active Cohorts", value: cohorts.length, accent: "#ede9fe", text: "#6d28d9", icon: <LayoutGrid size={17} color="#6d28d9" /> },
          { label: "Core Courses", value: stats.coursesCount, accent: "#dbeafe", text: "#1d4ed8", icon: <BookOpen size={17} color="#1d4ed8" /> },
          { label: "Total Students Enrolled", value: stats.studentsCount, accent: "#fef3c7", text: "#b45309", icon: <GraduationCap size={17} color="#b45309" /> },
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

      {/* Cohort Grid and Courses deck Split */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        
        {/* Left Side: Active Student Cohorts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{
            backgroundColor: "#fff", borderRadius: 16, padding: 24,
            border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Academic Cohorts & Batches</h2>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Monitor batch schedules, student density, and syllabus progress</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cohorts.map(c => (
              <div key={c.id} style={{
                border: "1px solid #f3f4f6", borderRadius: 14, padding: 16,
                display: "flex", flexDirection: "column", gap: 12,
                backgroundColor: "#fafafa",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{c.name}</h3>
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                      Advisor/Coordinator: <strong>{c.coordinator}</strong>
                    </p>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                    backgroundColor: "#ede9fe", color: "#6d28d9",
                  }}>
                    {c.students} Students
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>Timetable / Curriculum Compliance</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#374151" }}>{c.compliance}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, backgroundColor: "#e5e7eb", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 999, backgroundColor: "#8b5cf6", width: `${c.compliance}%`, transition: "width 0.4s" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Side: Core Syllabus Programs */}
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
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Mapped Core Courses</h2>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Curricular streams assigned to this program</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "360px", overflowY: "auto", paddingRight: 4 }}>
            {courses.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "40px 0",
                border: "1.5px dashed #e5e7eb", borderRadius: 12,
              }}>
                <p style={{ fontSize: 13, color: "#9ca3af" }}>No core courses assigned yet</p>
                <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 4 }}>Access org setting dashboard to provision.</p>
              </div>
            ) : (
              courses.map(co => (
                <div key={co.id} style={{
                  border: "1px solid #f3f4f6", borderRadius: 12, padding: "10px 12px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  backgroundColor: "#fff",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, backgroundColor: "#ede9fe",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13,
                    }}>
                      📝
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{co.name}</p>
                      <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{co.code}</p>
                    </div>
                  </div>
                  <ChevronRight size={13} color="#d1d5db" />
                </div>
              ))
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  )
}
