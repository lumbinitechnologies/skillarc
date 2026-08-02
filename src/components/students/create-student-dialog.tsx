"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { X, GraduationCap, User, Phone, BookOpen, KeyRound, ChevronDown } from "lucide-react"
import type { StudentWithSection, CreateStudentInput, UpdateStudentInput } from "@/modules/students"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

interface CreateStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateStudentInput | UpdateStudentInput, isEdit: boolean) => Promise<void>
  student?: StudentWithSection | null
  sections: Array<{ id: string; name: string; semester: number; program_id: string }>
  programs: Array<{ id: string; name: string }>
  isLoading?: boolean
}

function SectionDivider({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 2px" }}>
      <div style={{
        width: 24, height: 24, borderRadius: 7,
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        boxShadow: "0 2px 6px rgba(99,102,241,0.35)",
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, #ede9fe, transparent)" }} />
    </div>
  )
}

function FieldLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.03em", textTransform: "uppercase" }}>
        {children}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </p>
      {hint && <span style={{ fontSize: 10.5, fontWeight: 500, color: "#9ca3af", textTransform: "none" }}>{hint}</span>}
    </div>
  )
}

function StyledSelect({ value, onChange, children, disabled }: {
  value: string | number
  onChange: (v: string) => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: "100%", padding: "9px 32px 9px 12px", fontSize: 13, fontWeight: 500,
          border: "1.5px solid #e5e7eb", borderRadius: 10,
          backgroundColor: disabled ? "#f9fafb" : "#fff",
          color: disabled ? "#9ca3af" : "#111827",
          outline: "none", fontFamily: font, cursor: disabled ? "not-allowed" : "pointer",
          appearance: "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onFocus={e => { if (!disabled) { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)" } }}
        onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none" }}
      >
        {children}
      </select>
      <ChevronDown size={14} color={disabled ? "#cbd5e1" : "#6b7280"} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  )
}

function StyledInput(props: React.ComponentProps<typeof Input> & { style?: React.CSSProperties }) {
  return (
    <Input
      {...props}
      style={{
        fontSize: 13, fontWeight: 500, fontFamily: font,
        border: "1.5px solid #e5e7eb", borderRadius: 10,
        backgroundColor: "#fff", height: 38,
        transition: "border-color 0.15s, box-shadow 0.15s",
        ...props.style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)" }}
      onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none" }}
    />
  )
}

export function CreateStudentDialog({
  open,
  onOpenChange,
  onSubmit,
  student,
  sections,
  programs,
  isLoading = false,
}: CreateStudentDialogProps) {
  const currentYear = new Date().getFullYear()
  const admissionYearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, i) => currentYear - i),
    [currentYear]
  )

  const emptyForm = {
    name: "", email: "",
    section_id: "", semester: 1, program_id: null as string | null,
    institution_id: "", phone: "", registration_number: "",
    admission_year: currentYear,
    parentName: "", parentEmail: "", parentPhone: "", parentRelationship: "Guardian"
  }

  const fromStudent = () => ({
    ...emptyForm,
    name: student?.name || "",
    email: student?.email || "",
    section_id: student?.section_id || "",
    semester: student?.semester || 1,
    program_id: student?.program_id || null,
    institution_id: student?.institution_id || "",
    phone: student?.phone || "",
    registration_number: student?.registration_number || "",
    admission_year: student?.admission_year || currentYear,
  })

  const [formData, setFormData] = useState<CreateStudentInput | UpdateStudentInput>(fromStudent())
  const { toast } = useToast()

  useEffect(() => {
    async function fetchGuardian() {
      if (student?.id) {
        try {
          const res = await fetch(`/api/parents/relations?student_id=${student.id}`)
          if (res.ok) {
            const rels = await res.json()
            if (rels && rels.length > 0) {
              const rel = rels[0]
              setFormData(prev => ({
                ...prev,
                parentName: rel.parent?.name || "",
                parentEmail: rel.parent?.email || "",
                parentPhone: rel.parent?.phone || "",
                parentRelationship: rel.relationship || "Guardian"
              }))
            }
          }
        } catch (err) {
          console.error("Failed to load guardian details:", err)
        }
      }
    }

    setFormData(fromStudent())
    fetchGuardian()
  }, [student])

  const availableSemesters = useMemo(() => [
    ...new Set(
      sections
        .filter(s => (s.program_id || (s as any).program?.id) === formData.program_id)
        .map(s => s.semester)
    ),
  ].sort((a, b) => a - b), [sections, formData.program_id])

  const filteredSections = useMemo(() =>
    sections.filter(s =>
      (s.program_id || (s as any).program?.id) === formData.program_id &&
      s.semester === formData.semester
    ), [sections, formData.program_id, formData.semester])

  // Automatically sync semester state if it's invalid for the selected program
  useEffect(() => {
    if (availableSemesters.length > 0 && (!formData.semester || !availableSemesters.includes(formData.semester))) {
      setFormData(prev => ({ ...prev, semester: availableSemesters[0], section_id: "" }))
    }
  }, [availableSemesters, formData.semester])

  function set(key: string, value: any) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  function handleProgramChange(program_id: string) {
    setFormData(prev => ({ ...prev, program_id, section_id: "", semester: 1 }))
  }

  function handleSemesterChange(v: string) {
    setFormData(prev => ({ ...prev, semester: parseInt(v), section_id: "" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || (!student && !(formData as any).email) || !formData.section_id) {
      toast({ title: "Missing fields", description: "Name, email, and section are required", variant: "destructive" })
      return
    }
    try {
      await onSubmit(formData, !!student)
      onOpenChange(false)
      setFormData(emptyForm)
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Something went wrong", variant: "destructive" })
    }
  }

  const isEdit = !!student

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden" style={{ maxWidth: 520, borderRadius: 20, fontFamily: font, border: "none" }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          padding: "20px 24px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -30, right: -30, width: 120, height: 120,
            borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)",
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <GraduationCap size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                {isEdit ? "Edit Student" : "Register Student"}
              </h2>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>
                {isEdit ? "Update student details" : "Fill in the details below to create an account"}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "none",
              backgroundColor: "rgba(255,255,255,0.15)", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer",
              position: "relative", transition: "background-color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.25)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)")}
          >
            <X size={15} color="#fff" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "62vh", overflowY: "auto" }}>

            {/* ── Student Identity ── */}
            <SectionDivider icon={<User size={13} color="#fff" />} label="Student Identity" />

            {/* Name */}
            <div>
              <FieldLabel required>Full Name</FieldLabel>
              <StyledInput
                placeholder="e.g. Arjun Reddy"
                value={formData.name}
                onChange={e => set("name", e.target.value)}
              />
            </div>

            {/* Email — create only */}
            {!isEdit && (
              <div>
                <FieldLabel required>Email</FieldLabel>
                <StyledInput
                  type="email"
                  placeholder="student@college.edu"
                  value={(formData as any).email || ""}
                  onChange={e => set("email", e.target.value)}
                />
              </div>
            )}

            {/* Phone */}
            <div>
              <FieldLabel>Phone Number</FieldLabel>
              <StyledInput
                type="tel"
                placeholder="e.g. 9876543210"
                value={(formData as any).phone || ""}
                onChange={e => set("phone", e.target.value)}
              />
            </div>

            {/* Reg No + Admission Year */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel>Reg. Number</FieldLabel>
                <StyledInput
                  placeholder="e.g. 22CSE001"
                  value={(formData as any).registration_number || ""}
                  onChange={e => set("registration_number", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Admission Year</FieldLabel>
                <StyledSelect
                  value={(formData as any).admission_year || currentYear}
                  onChange={v => set("admission_year", parseInt(v))}
                >
                  {admissionYearOptions.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </StyledSelect>
              </div>
            </div>

            {/* ── Academic Details ── */}
            <SectionDivider icon={<BookOpen size={13} color="#fff" />} label="Academic Details" />

            {/* Program */}
            <div>
              <FieldLabel required>Program</FieldLabel>
              <StyledSelect value={formData.program_id || ""} onChange={handleProgramChange}>
                <option value="">Select program</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </StyledSelect>
            </div>

            {/* Semester + Section */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel required>Semester</FieldLabel>
                <StyledSelect
                  value={formData.semester || ""}
                  onChange={handleSemesterChange}
                  disabled={!formData.program_id}
                >
                  {!formData.program_id
                    ? <option value="">Select program first</option>
                    : availableSemesters.length === 0
                      ? <option value="">No semesters</option>
                      : availableSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)
                  }
                </StyledSelect>
              </div>
              <div>
                <FieldLabel required>Section</FieldLabel>
                <StyledSelect
                  value={formData.section_id || ""}
                  onChange={v => set("section_id", v)}
                  disabled={!formData.program_id}
                >
                  <option value="">
                    {!formData.program_id
                      ? "Select program first"
                      : filteredSections.length === 0
                        ? "No sections available"
                        : "Select section"}
                  </option>
                  {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </StyledSelect>
              </div>
            </div>

            {/* ── Parent / Guardian Details ── */}
            <SectionDivider icon={<User size={13} color="#fff" />} label="Parent / Guardian Details" />

            <div>
              <FieldLabel>Search Existing Parent</FieldLabel>
              <div style={{ position: "relative" }}>
                <Input
                  placeholder="Type name or email to search existing..."
                  onChange={async (e) => {
                    const term = e.target.value;
                    if (term.length > 2) {
                      try {
                        const res = await fetch(`/api/parents?institution_id=${(formData as any).institution_id || student?.institution_id || ""}`);
                        if (res.ok) {
                          const parents = await res.json();
                          const matched = parents.find((p: any) =>
                            p.name?.toLowerCase().includes(term.toLowerCase()) ||
                            p.email?.toLowerCase().includes(term.toLowerCase())
                          );
                          if (matched) {
                            set("parentName", matched.name || "");
                            set("parentEmail", matched.email || "");
                            set("parentPhone", matched.phone || "");
                          }
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                  style={{
                    fontSize: 13, fontWeight: 500, fontFamily: font,
                    border: "1.5px solid #e5e7eb", borderRadius: 10,
                    backgroundColor: "#fff", height: 38,
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel>Parent/Guardian Name</FieldLabel>
                <StyledInput
                  placeholder="Name"
                  value={(formData as any).parentName || ""}
                  onChange={e => set("parentName", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Parent/Guardian Email</FieldLabel>
                <StyledInput
                  type="email"
                  placeholder="parent@example.com"
                  value={(formData as any).parentEmail || ""}
                  onChange={e => set("parentEmail", e.target.value)}
                  disabled={isEdit}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel>Parent Phone</FieldLabel>
                <StyledInput
                  placeholder="Phone"
                  value={(formData as any).parentPhone || ""}
                  onChange={e => set("parentPhone", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Relationship</FieldLabel>
                <StyledSelect
                  value={(formData as any).parentRelationship || "Guardian"}
                  onChange={v => set("parentRelationship", v)}
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </StyledSelect>
              </div>
            </div>

            {/* ── Account Setup (create only) ── */}
            {!isEdit && (
              <>
                <SectionDivider icon={<KeyRound size={13} color="#fff" />} label="Account Setup" />
                <div style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  padding: "12px 14px", borderRadius: 12,
                  backgroundColor: "#f5f3ff", border: "1px solid #ede9fe",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid #ddd6fe",
                  }}>
                    <KeyRound size={14} color="#7c3aed" />
                  </div>
                  <p style={{ fontSize: 12, color: "#5b21b6", lineHeight: 1.5, fontWeight: 500 }}>
                    A secure temporary password will be generated automatically and sent to the
                    student's email. They'll be asked to set their own password on first login.
                  </p>
                </div>
              </>
            )}

          </div>

          {/* Footer */}
          <div style={{
            padding: "14px 24px", borderTop: "1px solid #f3f4f6",
            display: "flex", gap: 10, backgroundColor: "#fafafa",
          }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              style={{
                flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600,
                color: "#374151", backgroundColor: "#fff",
                border: "1.5px solid #e5e7eb", borderRadius: 10,
                cursor: "pointer", fontFamily: font,
                transition: "background-color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f9fafb"; e.currentTarget.style.borderColor = "#d1d5db" }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = "#e5e7eb" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 2, padding: "10px 0", fontSize: 13, fontWeight: 700, color: "#fff",
                background: isLoading ? "#c4b5fd" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none", borderRadius: 10,
                cursor: isLoading ? "not-allowed" : "pointer",
                fontFamily: font,
                boxShadow: isLoading ? "none" : "0 4px 12px rgba(99,102,241,0.35)",
                transition: "box-shadow 0.15s, transform 0.1s",
              }}
              onMouseDown={e => { if (!isLoading) e.currentTarget.style.transform = "scale(0.98)" }}
              onMouseUp={e => { e.currentTarget.style.transform = "scale(1)" }}
            >
              {isLoading ? "Saving…" : isEdit ? "Save Changes" : "Register Student"}
            </button>
          </div>
        </form>

      </DialogContent>
    </Dialog>
  )
}