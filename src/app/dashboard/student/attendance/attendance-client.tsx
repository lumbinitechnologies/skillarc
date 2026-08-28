"use client"

import { useState } from "react"
import { AlertCircle, CalendarDays, CheckCircle2, Clock, FileText, GraduationCap, Sparkles, UserRound } from "lucide-react"
import { submitLeaveApplicationAction } from "./actions"

interface StudentInfo {
  name: string
  email: string
  institution: string
  sectionName: string
  programName: string
  semester: number | null
  registrationNumber?: string
  phone?: string
  admissionYear?: number | null
}

interface AttendanceEntry {
  id: string
  date: string
  period: number
  subjectName: string
  subjectCode: string
  facultyName: string
  status: string
}

interface SubjectSummary {
  id: string
  name: string
  code: string
  present: number
  absent: number
  late: number
  total: number
  rate: number
}

interface OverallSummary {
  total: number
  present: number
  absent: number
  late: number
  rate: number
}

export default function AttendanceClient({
  student,
  studentId,
  sectionId,
  advisorId,
  institutionId,
  advisorName,
  attendanceEntries,
  subjectSummaries,
  overallSummary,
}: {
  student: StudentInfo
  studentId: string
  sectionId: string | null
  advisorId: string | null
  institutionId: string | null
  advisorName: string
  attendanceEntries: AttendanceEntry[]
  subjectSummaries: SubjectSummary[]
  overallSummary: OverallSummary
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "leave" | "summary">("overview")
  const [leaveReason, setLeaveReason] = useState("")
  const [leaveFromDate, setLeaveFromDate] = useState("")
  const [leaveToDate, setLeaveToDate] = useState("")
  const [leaveNote, setLeaveNote] = useState("")
  const [leaveStatus, setLeaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [leaveFeedback, setLeaveFeedback] = useState<string | null>(null)

  const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
    PRESENT: { bg: "#f0fdf4", color: "#166534", label: "Present" },
    ABSENT: { bg: "#fef2f2", color: "#991b1b", label: "Absent" },
    LATE: { bg: "#eff6ff", color: "#1d4ed8", label: "Late" },
    NOT_MARKED: { bg: "#f5f3ff", color: "#6d28d9", label: "Pending" },
  }

  const tabs = [
    { key: "overview", label: "My Attendance", icon: CalendarDays },
    { key: "leave", label: "Leave Application", icon: FileText },
    { key: "summary", label: "Attendance Summary", icon: Sparkles },
  ] as const

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ backgroundColor: "#fff", borderRadius: 20, padding: "22px 24px", border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #4f46e5, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Attendance center</h1>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>{student.institution} • {student.sectionName}</p>
            </div>
          </div>
          <div style={{ border: "1px solid #ece7ff", background: "#f5f3ff", borderRadius: 999, padding: "8px 12px", color: "#6d28d9", fontSize: 12, fontWeight: 700 }}>
            {student.programName} • Semester {student.semester ?? "—"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                border: active ? "1px solid #e0e7ff" : "1px solid #e5e7eb",
                background: active ? "#eef2ff" : "#fff",
                color: active ? "#4338ca" : "#6b7280",
                borderRadius: 999,
                padding: "9px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
            {[
              { label: "Attendance rate", value: `${overallSummary.rate}%`, sub: `${overallSummary.present + overallSummary.late}/${overallSummary.total} counted`, accent: "#d1fae5", text: "#065f46", icon: <CheckCircle2 size={17} color="#065f46" /> },
              { label: "Present", value: overallSummary.present, sub: "Marked present", accent: "#f0fdf4", text: "#166534", icon: <CheckCircle2 size={17} color="#166534" /> },
              { label: "Absent", value: overallSummary.absent, sub: "Recorded absences", accent: "#fef2f2", text: "#991b1b", icon: <AlertCircle size={17} color="#991b1b" /> },
              { label: "Late", value: overallSummary.late, sub: "Late arrivals", accent: "#eff6ff", text: "#1d4ed8", icon: <Clock size={17} color="#1d4ed8" /> },
            ].map((item) => (
              <div key={item.label} style={{ backgroundColor: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: item.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: item.text, lineHeight: 1, margin: 0 }}>{item.value}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>{item.label}</p>
                  <p style={{ fontSize: 10, color: "#6b7280", margin: "2px 0 0" }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: "#fff", borderRadius: 18, padding: 20, border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>Attendance history</h2>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>Your live attendance record from the section sessions</p>
              </div>
              <div style={{ color: "#4f46e5", fontSize: 11, fontWeight: 700 }}>Live data</div>
            </div>

            {attendanceEntries.length === 0 ? (
              <div style={{ border: "1.5px dashed #e5e7eb", borderRadius: 12, padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                No attendance sessions have been recorded for your section yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {attendanceEntries.map((entry) => {
                  const style = statusStyles[entry.status] ?? statusStyles.NOT_MARKED
                  return (
                    <div key={entry.id} style={{ border: "1px solid #f3f4f6", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", backgroundColor: "#fafafa" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #e0e7ff, #bfdbfe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#4f46e5" }}>
                          P{entry.period}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{entry.subjectCode} • {entry.subjectName}</p>
                          <p style={{ fontSize: 11, color: "#6b7280", margin: "3px 0 0" }}>{entry.facultyName} • {entry.date}</p>
                        </div>
                      </div>
                      <div style={{ backgroundColor: style.bg, color: style.color, padding: "7px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {style.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "leave" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 18, padding: 20, border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>Leave application</h2>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>Request absence for a day or class while keeping your advisor informed</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#6d28d9", fontSize: 12, fontWeight: 700 }}>
                <UserRound size={15} />
                {advisorName}
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, maxWidth: 620 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#374151" }}>
                  From date
                  <input type="date" value={leaveFromDate} onChange={(e) => setLeaveFromDate(e.target.value)} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13 }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#374151" }}>
                  To date
                  <input type="date" value={leaveToDate} onChange={(e) => setLeaveToDate(e.target.value)} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13 }} />
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#374151" }}>
                Reason
                <input type="text" placeholder="Medical, family, or other reason" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13 }} />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#374151" }}>
                Notes
                <textarea rows={4} placeholder="Add any supporting context for your advisor" value={leaveNote} onChange={(e) => setLeaveNote(e.target.value)} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13, resize: "vertical" }} />
              </label>

              <button
                onClick={async () => {
                  if (!leaveFromDate || !leaveToDate) {
                    setLeaveFeedback("Please select both a from-date and a to-date.")
                    setLeaveStatus("error")
                    return
                  }

                  if (new Date(leaveFromDate) > new Date(leaveToDate)) {
                    setLeaveFeedback("The from-date cannot be after the to-date.")
                    setLeaveStatus("error")
                    return
                  }

                  if (!leaveReason.trim()) {
                    setLeaveFeedback("Please add a reason for your leave.")
                    setLeaveStatus("error")
                    return
                  }

                  setLeaveStatus("saving")
                  setLeaveFeedback(null)

                  const result = await submitLeaveApplicationAction({
                    studentId,
                    sectionId,
                    advisorId,
                    institutionId,
                    fromDate: leaveFromDate,
                    toDate: leaveToDate,
                    reason: leaveReason.trim(),
                    notes: leaveNote.trim() || null,
                  })

                  if (result.success) {
                    setLeaveStatus("saved")
                    setLeaveFeedback("Leave request submitted successfully.")
                    setLeaveFromDate("")
                    setLeaveToDate("")
                    setLeaveReason("")
                    setLeaveNote("")
                  } else {
                    setLeaveStatus("error")
                    setLeaveFeedback(result.error ?? "Unable to submit leave request.")
                  }
                }}
                style={{
                  border: "none",
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "fit-content",
                }}
              >
                {leaveStatus === "saving" ? "Submitting…" : "Submit leave request"}
              </button>

              {leaveFeedback && (
                <div
                  style={{
                    border: `1px solid ${leaveStatus === "saved" ? "#dcfce7" : "#fee2e2"}`,
                    backgroundColor: leaveStatus === "saved" ? "#f0fdf4" : "#fff1f2",
                    color: leaveStatus === "saved" ? "#166534" : "#991b1b",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {leaveFeedback}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "summary" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 18, padding: 20, border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>Subject-wise summary</h2>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>A quick view of how each subject is tracking</p>
              </div>
              <div style={{ color: "#4f46e5", fontSize: 11, fontWeight: 700 }}>Updated live</div>
            </div>

            {subjectSummaries.length === 0 ? (
              <div style={{ border: "1.5px dashed #e5e7eb", borderRadius: 12, padding: "24px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                No subject summaries are available yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {subjectSummaries.map((subject) => (
                  <div key={subject.id} style={{ border: "1px solid #f3f4f6", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{subject.code} • {subject.name}</p>
                      <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0" }}>{subject.present} present • {subject.absent} absent • {subject.late} late</p>
                    </div>
                    <div style={{ backgroundColor: "#f5f3ff", color: "#6d28d9", borderRadius: 999, padding: "7px 10px", fontSize: 12, fontWeight: 700 }}>
                      {subject.rate}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
