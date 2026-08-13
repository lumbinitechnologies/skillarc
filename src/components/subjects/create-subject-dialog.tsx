"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, BookMarked } from "lucide-react"

const subjectTypes = [
  { value: "THEORY",   label: "Theory",   icon: "📖", textClass: "text-[#6C63FF]", bgClass: "bg-[#6C63FF]/5", borderClass: "border-[#6C63FF]/20" },
  { value: "LAB",      label: "Lab",      icon: "🧪", textClass: "text-[#00C2A8]", bgClass: "bg-[#00C2A8]/5", borderClass: "border-[#00C2A8]/20" },
  { value: "ELECTIVE", label: "Elective", icon: "🎯", textClass: "text-[#FFB020]", bgClass: "bg-[#FFB020]/5", borderClass: "border-[#FFB020]/20" },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
      {children}
    </label>
  )
}

function StyledSelect({ value, onChange, children, disabled }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-4 py-2.5 text-sm font-semibold border border-slate-100 rounded-2xl outline-none appearance-none cursor-pointer transition-all duration-200 ${
          disabled 
            ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
            : "bg-slate-50/50 text-slate-800 hover:border-slate-200 focus:border-[#6C63FF] focus:bg-white focus:ring-1 focus:ring-[#6C63FF]/20"
        }`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 16px center",
          paddingRight: "40px",
        }}
      >
        {children}
      </select>
    </div>
  )
}

function StyledInput({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 text-sm font-semibold border border-slate-100 rounded-2xl bg-slate-50/50 text-slate-800 placeholder-slate-400 outline-none hover:border-slate-200 focus:border-[#6C63FF] focus:bg-white focus:ring-1 focus:ring-[#6C63FF]/20 transition-all duration-200"
    />
  )
}

interface Department { id: string; name: string }
interface Program    { id: string; name: string; department_id: string }

export function CreateSubjectDialog({ open, onOpenChange, onSubmit, departments, programs }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<void>
  departments: Department[]
  programs: Program[]
}) {
  const defaultForm = {
    department_id: "",
    program_id: "",
    program_ids: [] as string[],
    semester: 1,
    name: "",
    code: "",
    credits: 4,
    subject_type: "THEORY",
  }
  const [formData, setFormData] = useState(defaultForm)
  const [loading, setLoading] = useState(false)

  function set(key: string, value: any) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // Filter programs by selected department
  const filteredPrograms = useMemo(() =>
    programs.filter(p => p.department_id === formData.department_id),
    [programs, formData.department_id]
  )

  function handleDepartmentChange(department_id: string) {
    setFormData(prev => ({ ...prev, department_id, program_id: "", program_ids: [] }))
  }

  const canSubmit = (formData.program_id || formData.program_ids.length > 0) && formData.name.trim() && formData.code.trim()

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    const { department_id, program_id, ...payload } = formData
    const idsToSend = formData.program_ids.length > 0 
      ? formData.program_ids 
      : (program_id ? [program_id] : [])
    
    await onSubmit({
      ...payload,
      program_ids: idsToSend,
    })
    setFormData(defaultForm)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-lg rounded-3xl border border-slate-100 bg-white/95 backdrop-blur-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-md shadow-indigo-100/50">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">Create Subject</h2>
              <p className="text-xs text-slate-400 mt-0.5">Fill in the subject details below</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-center hover:bg-slate-100 transition-colors duration-200"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Department */}
          <div>
            <FieldLabel>Department</FieldLabel>
            <StyledSelect value={formData.department_id} onChange={handleDepartmentChange}>
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </StyledSelect>
          </div>

          {/* Programs */}
          <div>
            <FieldLabel>Programs *</FieldLabel>
            {!formData.department_id ? (
              <div className="w-full px-4 py-2.5 text-sm font-semibold border border-slate-100 rounded-2xl bg-slate-100 text-slate-400">
                Select a department first
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="w-full px-4 py-2.5 text-sm font-semibold border border-slate-100 rounded-2xl bg-slate-100 text-slate-400">
                No programs for this department
              </div>
            ) : (
              <div className="space-y-2.5 max-h-40 overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                {filteredPrograms.map(p => {
                  const isChecked = formData.program_ids.includes(p.id)
                  return (
                    <label key={p.id} className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const newIds = isChecked
                            ? formData.program_ids.filter(id => id !== p.id)
                            : [...formData.program_ids, p.id]
                          set("program_ids", newIds)
                        }}
                        className="h-4 w-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                      />
                      <span>{p.name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Semester */}
          <div>
            <FieldLabel>Semester</FieldLabel>
            <StyledSelect
              value={String(formData.semester)}
              onChange={v => set("semester", Number(v))}
              disabled={!formData.department_id}
            >
              {!formData.department_id
                ? <option value="">Select a department first</option>
                : [1,2,3,4,5,6,7,8].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))
              }
            </StyledSelect>
          </div>

          {/* Name + Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Subject Name</FieldLabel>
              <StyledInput value={formData.name} onChange={v => set("name", v)} placeholder="e.g. Data Structures" />
            </div>
            <div>
              <FieldLabel>Subject Code</FieldLabel>
              <StyledInput value={formData.code} onChange={v => set("code", v)} placeholder="e.g. CS301" />
            </div>
          </div>

          {/* Credits */}
          <div>
            <FieldLabel>Credits</FieldLabel>
            <StyledSelect value={String(formData.credits)} onChange={v => set("credits", Number(v))}>
              {[1,2,3,4,5,6].map(c => (
                <option key={c} value={c}>{c} {c === 1 ? "Credit" : "Credits"}</option>
              ))}
            </StyledSelect>
          </div>

          {/* Subject Type */}
          <div>
            <FieldLabel>Subject Type</FieldLabel>
            <div className="flex gap-3">
              {subjectTypes.map(t => {
                const active = formData.subject_type === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set("subject_type", t.value)}
                    className={`flex-1 py-3 px-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all duration-200 active:scale-95 ${
                      active
                        ? `border-[#6C63FF] ${t.bgClass} ${t.textClass} scale-[1.02] shadow-sm font-bold`
                        : "border-slate-100 bg-slate-50/20 text-slate-500 hover:border-slate-200 font-semibold"
                    }`}
                  >
                    <span className="text-xl leading-none">{t.icon}</span>
                    <span className="text-[11px] uppercase tracking-wider">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/30">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="flex-[2] py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] hover:from-[#5C53EF] hover:to-[#7B4CE6] rounded-xl shadow-sm hover:shadow-md hover:shadow-indigo-100/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
          >
            {loading ? "Creating…" : "Create Subject"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}