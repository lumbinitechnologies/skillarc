"use client"

import { useState } from "react"
import { useCourses } from "../course-context"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  color: "#111827",
  outline: "none",
  fontFamily: font,
  boxSizing: "border-box",
  transition: "border-color 0.15s",
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
  display: "block",
  fontFamily: font,
}

export default function CreateCourseDialog() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const { addCourse } = useCourses()

  function handleCreateCourse() {
    if (!title.trim()) return

    addCourse({
      id: Date.now(),
      title: title.trim(),
      instructor: "You",
      students: 0,
    })

    setTitle("")
    setDescription("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Trigger button — fully inline styled */}
        <button style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 16px",
          backgroundColor: "#6366f1",
          color: "#fff",
          fontSize: 12, fontWeight: 600,
          borderRadius: 10, border: "none", cursor: "pointer",
          fontFamily: font,
          boxShadow: "0 1px 3px rgba(99,102,241,0.3)",
          transition: "background 0.15s",
        }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#4f46e5")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#6366f1")}
        >
          <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Create Course
        </button>
      </DialogTrigger>

      <DialogContent style={{ fontFamily: font, maxWidth: 480, borderRadius: 20, padding: 0, overflow: "hidden" }}>
        {/* Modal header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #f3f4f6",
          background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)",
        }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: font, margin: 0 }}>
              Create New Course
            </DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            Fill in the details below to add a new course
          </p>
        </div>

        {/* Form body */}
        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Title field */}
          <div>
            <label style={labelStyle}>Course Title</label>
            <input
              style={inputStyle}
              placeholder="e.g. React Fundamentals"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
            />
          </div>

          {/* Description field */}
          <div>
            <label style={labelStyle}>Description <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
            <textarea
              style={{ ...inputStyle, resize: "none", minHeight: 80, lineHeight: 1.5 }}
              placeholder="Enter course description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              onClick={() => setOpen(false)}
              style={{
                flex: 1, padding: "9px 0",
                fontSize: 12, fontWeight: 600,
                borderRadius: 10, border: "1px solid #e5e7eb",
                backgroundColor: "#fff", color: "#374151",
                cursor: "pointer", fontFamily: font,
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f9fafb")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}
            >
              Cancel
            </button>

            <button
              onClick={handleCreateCourse}
              disabled={!title.trim()}
              style={{
                flex: 2, padding: "9px 0",
                fontSize: 12, fontWeight: 600,
                borderRadius: 10, border: "none",
                backgroundColor: title.trim() ? "#6366f1" : "#e5e7eb",
                color: title.trim() ? "#fff" : "#9ca3af",
                cursor: title.trim() ? "pointer" : "not-allowed",
                fontFamily: font,
                boxShadow: title.trim() ? "0 1px 3px rgba(99,102,241,0.3)" : "none",
                transition: "all 0.15s",
              }}
            >
              Create Course
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}