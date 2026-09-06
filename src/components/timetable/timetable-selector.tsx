"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layers, CalendarDays, Users2, Check, ChevronDown, CalendarRange } from "lucide-react"

const font = "'Plus Jakarta Sans', 'DM Sans', sans-serif"

interface Department {
  id: string
  name: string
}
interface Program {
  id: string
  name: string
  department_id?: string | null
}
interface Section {
  id: string
  name: string
  semester: number
  program_id: string
}
interface Props {
  departments: Department[]
  programs: Program[]
  sections: Section[]
}

type StepState = "done" | "active" | "locked"

function StepRow({
  index,
  state,
  icon,
  label,
  children,
  isLast,
}: {
  index: number
  state: StepState
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div style={{ display: "flex", gap: 14 }}>
      {/* Rail: number/check + connecting line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 1 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 800,
            transition: "background 0.2s, color 0.2s",
            background:
              state === "done"
                ? "linear-gradient(135deg, #E57D37, #EAAD62)"
                : state === "active"
                ? "#fff7ed"
                : "#f3f4f6",
            color: state === "done" ? "#fff" : state === "active" ? "#E57D37" : "#9ca3af",
            border: state === "active" ? "1.5px solid #fed7aa" : "1.5px solid transparent",
          }}
        >
          {state === "done" ? <Check size={14} strokeWidth={2.5} /> : index}
        </div>
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              minHeight: 28,
              marginTop: 4,
              borderRadius: 1,
              background: state === "done" ? "#fed7aa" : "#e5e7eb",
              transition: "background 0.2s",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ color: state === "locked" ? "#9ca3af" : "#E57D37", display: "flex" }}>{icon}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: state === "locked" ? "#9ca3af" : "#1f2937",
            }}
          >
            {label}
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

function FlowSelect({
  value,
  onChange,
  disabled,
  placeholder,
  lockedHint,
  children,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  placeholder: string
  lockedHint?: string
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <div
        style={{
          width: "100%",
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 500,
          color: "#b0b4bd",
          backgroundColor: "#fafafa",
          border: "1.5px dashed #e5e7eb",
          borderRadius: 11,
          fontFamily: font,
        }}
      >
        {lockedHint || placeholder}
      </div>
    )
  }

  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 36px 10px 14px",
          fontSize: 13,
          fontWeight: 600,
          color: value ? "#111827" : "#9ca3af",
          backgroundColor: "#fff",
          border: value ? "1.5px solid #fed7aa" : "1.5px solid #e5e7eb",
          borderRadius: 11,
          fontFamily: font,
          outline: "none",
          appearance: "none",
          cursor: "pointer",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#E57D37"
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(229,125,55,0.12)"
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = value ? "#fed7aa" : "#e5e7eb"
          e.currentTarget.style.boxShadow = "none"
        }}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown
        size={14}
        color="#6b7280"
        style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      />
    </div>
  )
}

export function TimetableSelector({ departments, programs, sections }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [selectedProgram, setSelectedProgram] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")
  const [selectedSection, setSelectedSection] = useState("")

  useEffect(() => {
    const queryDepartment = searchParams.get("department") ?? ""
    const queryProgram = searchParams.get("program") ?? ""
    const querySemester = searchParams.get("semester") ?? ""
    const querySection = searchParams.get("section") ?? ""

    let department = queryDepartment
    if (!department && queryProgram) {
      const program = programs.find((p) => p.id === queryProgram)
      department = program?.department_id ?? ""
    }

    setSelectedDepartment(department)
    setSelectedProgram(queryProgram)
    setSelectedSemester(querySemester)
    setSelectedSection(querySection)
  }, [searchParams, programs])

  const availablePrograms = useMemo(() => {
    if (!selectedDepartment) return programs
    return programs.filter((p) => p.department_id === selectedDepartment)
  }, [programs, selectedDepartment])

  const semesters = useMemo(() => {
    if (!selectedProgram) return []
    return [
      ...new Set(sections.filter((s) => s.program_id === selectedProgram).map((s) => s.semester)),
    ].sort((a, b) => a - b)
  }, [selectedProgram, sections])

  const availableSections = useMemo(() => {
    if (!selectedProgram || !selectedSemester) return []
    return sections.filter(
      (s) => s.program_id === selectedProgram && s.semester === Number(selectedSemester)
    )
  }, [selectedProgram, selectedSemester, sections])

  const departmentName = departments.find((d) => d.id === selectedDepartment)?.name
  const programName = programs.find((p) => p.id === selectedProgram)?.name
  const sectionName = availableSections.find((s) => s.id === selectedSection)?.name

  const canBuild = Boolean(selectedDepartment && selectedProgram && selectedSemester && selectedSection)

  return (
    <Card
      className="max-w-xl overflow-hidden"
      style={{ fontFamily: font, border: "1px solid #ececef", borderRadius: 18 }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid #f1f1f3",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "linear-gradient(135deg, #E57D37, #EAAD62)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 3px 8px rgba(229,125,55,0.3)",
          }}
        >
          <CalendarRange size={18} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>
            Build Timetable
          </h2>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
            Narrow down to a section to start scheduling classes
          </p>
        </div>
      </div>

      {/* Step flow */}
      <div style={{ padding: "22px 24px 6px" }}>
        <StepRow
          index={1}
          state={selectedDepartment ? "done" : "active"}
          icon={<Layers size={14} />}
          label="Department"
        >
          <FlowSelect
            value={selectedDepartment}
            placeholder="Select a department"
            onChange={(v) => {
              setSelectedDepartment(v)
              setSelectedProgram("")
              setSelectedSemester("")
              setSelectedSection("")
            }}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </FlowSelect>
        </StepRow>

        <StepRow
          index={2}
          state={!selectedDepartment ? "locked" : selectedProgram ? "done" : "active"}
          icon={<Layers size={14} />}
          label="Program"
        >
          <FlowSelect
            value={selectedProgram}
            placeholder="Select a program"
            disabled={!selectedDepartment}
            lockedHint="Choose a department first"
            onChange={(v) => {
              setSelectedProgram(v)
              setSelectedSemester("")
              setSelectedSection("")
            }}
          >
            {availablePrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </FlowSelect>
        </StepRow>

        <StepRow
          index={3}
          state={!selectedProgram ? "locked" : selectedSemester ? "done" : "active"}
          icon={<CalendarDays size={14} />}
          label="Semester"
        >
          <FlowSelect
            value={selectedSemester}
            placeholder="Select a semester"
            disabled={!selectedProgram}
            lockedHint="Choose a program first"
            onChange={(v) => {
              setSelectedSemester(v)
              setSelectedSection("")
            }}
          >
            {semesters.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </FlowSelect>
        </StepRow>

        <StepRow
          index={4}
          state={!selectedSemester ? "locked" : selectedSection ? "done" : "active"}
          icon={<Users2 size={14} />}
          label="Section"
          isLast
        >
          <FlowSelect
            value={selectedSection}
            placeholder="Select a section"
            disabled={!selectedSemester}
            lockedHint="Choose a semester first"
            onChange={setSelectedSection}
          >
            {availableSections.map((s) => (
              <option key={s.id} value={s.id}>
                Section {s.name}
              </option>
            ))}
          </FlowSelect>
        </StepRow>
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 24px 22px" }}>
        {canBuild && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              fontSize: 12,
              fontWeight: 600,
              color: "#6b7280",
              marginBottom: 14,
              padding: "8px 12px",
              backgroundColor: "#f9fafb",
              borderRadius: 9,
              border: "1px solid #f1f1f3",
            }}
          >
            <span style={{ color: "#E57D37" }}>{departmentName}</span>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span>{programName}</span>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span>Semester {selectedSemester}</span>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span>Section {sectionName}</span>
          </div>
        )}
        <Button
          className="w-full"
          disabled={!canBuild}
          onClick={() =>
            router.push(
              `/dashboard/institution-admin/timetable/builder?department=${selectedDepartment}&program=${selectedProgram}&semester=${selectedSemester}&section=${selectedSection}`
            )
          }
          style={{
            height: 42,
            fontWeight: 700,
            fontSize: 13,
            borderRadius: 11,
            fontFamily: font,
            background: canBuild ? "linear-gradient(135deg, #E57D37, #EAAD62)" : undefined,
            boxShadow: canBuild ? "0 4px 12px rgba(229,125,55,0.3)" : "none",
            border: "none",
          }}
        >
          Open Timetable Builder
        </Button>
      </div>
    </Card>
  )
}