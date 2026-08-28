"use client"

import { useState } from "react"
import { useTimetable } from "../context/timetable-context"
import { timetableService } from "../services/timetableService"
import { TimetableWeek } from "../types/timetable.types"

const font = "'Plus Jakarta Sans', 'Inter', sans-serif"

export default function WeekManagerBar() {
  const {
    institutionId,
    sectionId,
    semester,
    weeks,
    selectedWeek,
    setSelectedWeek,
    reloadWeeks,
    reloadSlots,
    slots,
  } = useTimetable()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  // Form states for Add Week
  const [newWeekTitle, setNewWeekTitle] = useState("")
  const [newStartDate, setNewStartDate] = useState("")
  const [newEndDate, setNewEndDate] = useState("")

  // Form states for Batch Generate
  const [batchCount, setBatchCount] = useState(12)
  const [batchStartDate, setBatchStartDate] = useState(() => {
    const today = new Date()
    // Default to upcoming Monday
    const dayOfWeek = today.getDay()
    const diffToMon = dayOfWeek === 0 ? 1 : 1 - dayOfWeek + 7
    const nextMon = new Date(today)
    nextMon.setDate(today.getDate() + (diffToMon > 7 ? diffToMon - 7 : diffToMon))
    return nextMon.toISOString().split("T")[0]
  })

  // Form state for Copy Schedule
  const [copySourceWeekId, setCopySourceWeekId] = useState<string>("template")

  // Inline date editor for active week
  const [isEditingDates, setIsEditingDates] = useState(false)
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")

  // Open Add Week Modal with sensible auto-defaults
  function handleOpenAdd() {
    setErrorMessage("")
    const nextNum = (weeks.length > 0 ? Math.max(...weeks.map((w) => w.week_number)) : 0) + 1
    setNewWeekTitle(`Week ${nextNum}`)

    if (weeks.length > 0) {
      // Base next week start on last week's end date + 2 days (or +1)
      const lastWeek = weeks[weeks.length - 1]
      const lastEnd = new Date(lastWeek.end_date)
      const nextStart = new Date(lastEnd)
      nextStart.setDate(lastEnd.getDate() + 2) // Next Monday
      const nextEnd = new Date(nextStart)
      nextEnd.setDate(nextStart.getDate() + 5) // Mon-Sat

      setNewStartDate(nextStart.toISOString().split("T")[0])
      setNewEndDate(nextEnd.toISOString().split("T")[0])
    } else {
      const today = new Date()
      setNewStartDate(today.toISOString().split("T")[0])
      const weekEnd = new Date(today)
      weekEnd.setDate(today.getDate() + 5)
      setNewEndDate(weekEnd.toISOString().split("T")[0])
    }

    setShowAddModal(true)
  }

  async function handleCreateWeek(e: React.FormEvent) {
    e.preventDefault()
    if (!institutionId || !sectionId || !semester) return

    try {
      setIsSaving(true)
      setErrorMessage("")
      const nextNum = (weeks.length > 0 ? Math.max(...weeks.map((w) => w.week_number)) : 0) + 1

      const created = await timetableService.createWeek({
        institutionId,
        sectionId,
        semester: Number(semester),
        weekNumber: nextNum,
        title: newWeekTitle.trim() || `Week ${nextNum}`,
        startDate: newStartDate,
        endDate: newEndDate,
      })

      await reloadWeeks()
      setSelectedWeek(created)
      setShowAddModal(false)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create week")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBatchGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!institutionId || !sectionId || !semester) return

    try {
      setIsSaving(true)
      setErrorMessage("")

      await timetableService.batchCreateWeeks({
        institutionId,
        sectionId,
        semester: Number(semester),
        count: Number(batchCount),
        startDate: batchStartDate,
      })

      await reloadWeeks()
      setShowBatchModal(false)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to batch create weeks")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveDates() {
    if (!selectedWeek || !editStartDate || !editEndDate) return

    try {
      setIsSaving(true)
      const updated = await timetableService.updateWeek(selectedWeek.id, {
        startDate: editStartDate,
        endDate: editEndDate,
      })
      await reloadWeeks()
      setSelectedWeek(updated)
      setIsEditingDates(false)
    } catch (err: any) {
      alert("Failed to update week dates: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteSelectedWeek() {
    if (!selectedWeek) return
    if (!confirm(`Are you sure you want to delete "${selectedWeek.title || `Week ${selectedWeek.week_number}`}" and all its scheduled classes?`)) {
      return
    }

    try {
      setIsSaving(true)
      await timetableService.deleteWeek(selectedWeek.id)
      await reloadWeeks()
    } catch (err: any) {
      alert("Failed to delete week: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCopySchedule() {
    if (!selectedWeek || !institutionId || !sectionId || !semester) return

    try {
      setIsSaving(true)
      const sourceId = copySourceWeekId === "template" ? null : copySourceWeekId
      await timetableService.copyWeekSchedule({
        institutionId,
        sectionId,
        semester: Number(semester),
        sourceWeekId: sourceId,
        targetWeekId: selectedWeek.id,
      })

      await reloadSlots()
      setShowCopyModal(false)
    } catch (err: any) {
      alert("Failed to copy schedule: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  function formatDate(d: string) {
    if (!d) return ""
    try {
      const parts = d.split("-")
      if (parts.length === 3) {
        const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      }
      return d
    } catch {
      return d
    }
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        border: "1px solid #f1f5f9",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        padding: "16px 20px",
        marginBottom: 16,
        fontFamily: font,
      }}
    >
      {/* Top row: Header & actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 16,
            }}
          >
            📅
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                Academic Week Schedule
              </h2>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#6366f1",
                  backgroundColor: "#eef2ff",
                  padding: "2px 8px",
                  borderRadius: 99,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Multi-Week Enabled
              </span>
            </div>
            <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
              Select or create a week to build custom dates and period schedules.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {weeks.length > 0 && selectedWeek && (
            <>
              <button
                type="button"
                onClick={() => setShowCopyModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#475569",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  fontFamily: font,
                  transition: "all 0.15s",
                }}
                title="Copy schedule from another week"
              >
                <span>📋</span> Copy Schedule
              </button>

              <button
                type="button"
                onClick={handleDeleteSelectedWeek}
                disabled={isSaving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#ef4444",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fee2e2",
                  cursor: "pointer",
                  fontFamily: font,
                  transition: "all 0.15s",
                }}
                title="Delete this week"
              >
                <span>🗑️</span>
              </button>
            </>
          )}

          {weeks.length === 0 && (
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "#6366f1",
                backgroundColor: "#eef2ff",
                border: "1px solid #c7d2fe",
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              <span>⚡</span> Generate Semester Weeks
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              color: "#ffffff",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.25)",
              fontFamily: font,
            }}
          >
            <span>+</span> Add Week
          </button>
        </div>
      </div>

      {/* Week Selector Tabs / Pills */}
      {weeks.length === 0 ? (
        <div
          style={{
            padding: "24px 16px",
            textAlign: "center",
            backgroundColor: "#f8fafc",
            borderRadius: 12,
            border: "1.5px dashed #e2e8f0",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            No weeks configured yet for this section.
          </p>
          <p style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
            Click <strong>&quot;+ Add Week&quot;</strong> or <strong>&quot;Generate Semester Weeks&quot;</strong> to start building date-specific timetables.
          </p>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 8,
              scrollbarWidth: "thin",
            }}
          >
            {weeks.map((w) => {
              const isSelected = selectedWeek?.id === w.id
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelectedWeek(w)
                    setIsEditingDates(false)
                  }}
                  style={{
                    flexShrink: 0,
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: isSelected ? "1.5px solid #6366f1" : "1px solid #e2e8f0",
                    backgroundColor: isSelected ? "#eef2ff" : "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 3,
                    transition: "all 0.15s ease",
                    fontFamily: font,
                    boxShadow: isSelected ? "0 2px 8px rgba(99, 102, 241, 0.15)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? 800 : 600,
                        color: isSelected ? "#4338ca" : "#1e293b",
                      }}
                    >
                      {w.title || `Week ${w.week_number}`}
                    </span>
                    {isSelected && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          backgroundColor: "#6366f1",
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: isSelected ? "#6366f1" : "#64748b",
                      fontWeight: 500,
                    }}
                  >
                    {formatDate(w.start_date)} – {formatDate(w.end_date)}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Active Week Details & Inline Date Range */}
          {selectedWeek && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 10,
                backgroundColor: "#f8fafc",
                border: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                  Active: {selectedWeek.title || `Week ${selectedWeek.week_number}`}
                </span>

                {!isEditingDates ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#475569",
                        backgroundColor: "#ffffff",
                        padding: "3px 10px",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        fontWeight: 600,
                      }}
                    >
                      📅 {selectedWeek.start_date} to {selectedWeek.end_date}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditStartDate(selectedWeek.start_date)
                        setEditEndDate(selectedWeek.end_date)
                        setIsEditingDates(true)
                      }}
                      style={{
                        fontSize: 11,
                        color: "#6366f1",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        textDecoration: "underline",
                        fontFamily: font,
                      }}
                    >
                      Change Dates
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontFamily: font,
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#64748b" }}>to</span>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontFamily: font,
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveDates}
                      disabled={isSaving}
                      style={{
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: "#6366f1",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontFamily: font,
                      }}
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingDates(false)}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontFamily: font,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {slots.length} {slots.length === 1 ? "class" : "classes"} scheduled this week
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ADD WEEK MODAL ────────────────────────────────────────── */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              width: 380,
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              fontFamily: font,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Add Academic Week
              </h3>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Define the week label and active date range.
              </p>
            </div>

            <form onSubmit={handleCreateWeek} style={{ padding: "18px 24px" }}>
              {errorMessage && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    marginBottom: 14,
                  }}
                >
                  {errorMessage}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 6,
                  }}
                >
                  Week Title / Label
                </label>
                <input
                  type="text"
                  required
                  value={newWeekTitle}
                  onChange={(e) => setNewWeekTitle(e.target.value)}
                  placeholder="e.g. Week 1, Orientation Week"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    fontFamily: font,
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 6,
                    }}
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 12,
                      fontFamily: font,
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 6,
                    }}
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 12,
                      fontFamily: font,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#475569",
                    cursor: "pointer",
                    fontFamily: font,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    flex: 2,
                    padding: "9px 0",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#ffffff",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    border: "none",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    opacity: isSaving ? 0.7 : 1,
                    fontFamily: font,
                  }}
                >
                  {isSaving ? "Creating…" : "Add Week"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── BATCH GENERATE MODAL ──────────────────────────────────── */}
      {showBatchModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              width: 380,
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              fontFamily: font,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                ⚡ Generate Semester Weeks
              </h3>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Auto-generate continuous academic weeks for the full semester.
              </p>
            </div>

            <form onSubmit={handleBatchGenerate} style={{ padding: "18px 24px" }}>
              {errorMessage && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    marginBottom: 14,
                  }}
                >
                  {errorMessage}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 6,
                  }}
                >
                  Number of Weeks
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    fontFamily: font,
                  }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 6,
                  }}
                >
                  Semester Starting Date (Monday)
                </label>
                <input
                  type="date"
                  required
                  value={batchStartDate}
                  onChange={(e) => setBatchStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    fontFamily: font,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#475569",
                    cursor: "pointer",
                    fontFamily: font,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    flex: 2,
                    padding: "9px 0",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#ffffff",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    border: "none",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    opacity: isSaving ? 0.7 : 1,
                    fontFamily: font,
                  }}
                >
                  {isSaving ? "Generating…" : `Generate ${batchCount} Weeks`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── COPY SCHEDULE MODAL ───────────────────────────────────── */}
      {showCopyModal && selectedWeek && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              width: 380,
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              fontFamily: font,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                📋 Copy Schedule
              </h3>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Copy slot classes into <strong>{selectedWeek.title || `Week ${selectedWeek.week_number}`}</strong>
              </p>
            </div>

            <div style={{ padding: "18px 24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 8,
                }}
              >
                Copy From:
              </label>
              <select
                value={copySourceWeekId}
                onChange={(e) => setCopySourceWeekId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  fontFamily: font,
                  backgroundColor: "#fff",
                  marginBottom: 18,
                }}
              >
                <option value="template">Standard Static Timetable (Template)</option>
                {weeks
                  .filter((w) => w.id !== selectedWeek.id)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title || `Week ${w.week_number}`} ({w.start_date} – {w.end_date})
                    </option>
                  ))}
              </select>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#475569",
                    cursor: "pointer",
                    fontFamily: font,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCopySchedule}
                  disabled={isSaving}
                  style={{
                    flex: 2,
                    padding: "9px 0",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#ffffff",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    border: "none",
                    cursor: isSaving ? "not-allowed" : "pointer",
                    opacity: isSaving ? 0.7 : 1,
                    fontFamily: font,
                  }}
                >
                  {isSaving ? "Copying…" : "Copy & Apply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
