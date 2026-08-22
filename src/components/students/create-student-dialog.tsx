"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  GraduationCap,
  User,
  Phone,
  BookOpen,
  KeyRound,
  ChevronDown,
  Check,
  ArrowRight,
  ArrowLeft,
  Mail,
  Search,
  Users
} from "lucide-react"
import type { StudentWithSection, CreateStudentInput, UpdateStudentInput } from "@/modules/students"

interface CreateStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateStudentInput | UpdateStudentInput, isEdit: boolean) => Promise<void>
  student?: StudentWithSection | null
  sections: Array<{ id: string; name: string; semester: number; program_id: string }>
  programs: Array<{ id: string; name: string }>
  isLoading?: boolean
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 160 : -160,
    opacity: 0,
    filter: "blur(4px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      x: { type: "spring" as const, stiffness: 260, damping: 25 },
      opacity: { duration: 0.15 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 160 : -160,
    opacity: 0,
    filter: "blur(4px)",
    transition: {
      x: { type: "spring" as const, stiffness: 260, damping: 25 },
      opacity: { duration: 0.15 },
    },
  }),
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

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(0)
  const [formData, setFormData] = useState<CreateStudentInput | UpdateStudentInput>(fromStudent())
  const { toast } = useToast()

  // Reset steps and form state when modal toggles
  useEffect(() => {
    if (open) {
      setStep(1)
      setDirection(0)
      setFormData(fromStudent())
    }
  }, [open, student])

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

  const handleNextStep = () => {
    if (step === 1) {
      if (!(formData.name || "").trim()) {
        toast({ title: "Validation Error", description: "Full Name is required.", variant: "destructive" })
        return
      }
      if (!student && !((formData as any).email || "").trim()) {
        toast({ title: "Validation Error", description: "Email address is required.", variant: "destructive" })
        return
      }
      setDirection(1)
      setStep(2)
    } else if (step === 2) {
      if (!formData.program_id) {
        toast({ title: "Validation Error", description: "Please select a Program.", variant: "destructive" })
        return
      }
      if (!formData.semester) {
        toast({ title: "Validation Error", description: "Please select a Semester.", variant: "destructive" })
        return
      }
      if (!formData.section_id) {
        toast({ title: "Validation Error", description: "Please select a Section.", variant: "destructive" })
        return
      }
      setDirection(1)
      setStep(3)
    }
  }

  const handlePrevStep = () => {
    setDirection(-1)
    setStep(prev => Math.max(1, prev - 1))
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
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Something went wrong", variant: "destructive" })
    }
  }

  const isEdit = !!student

  const stepsList = [
    { label: "Identity", icon: User },
    { label: "Academics", icon: BookOpen },
    { label: "Guardian", icon: Users }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-[28px] sm:max-w-[540px] w-[95%] font-['Plus_Jakarta_Sans',sans-serif]">
        
        {/* Glow Spheres */}
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200/50 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-52 h-52 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200/30 blur-3xl pointer-events-none" />

        {/* Header (Clean, Editorial white layout) */}
        <div className="bg-white px-6 py-5 flex items-center justify-between border-b border-slate-100 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-sm text-slate-800">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                {isEdit ? "Edit Student Profile" : "Register Student"}
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {isEdit ? "Modify student catalog parameters" : "Configure new student catalog metadata"}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/50 flex items-center justify-center cursor-pointer transition-all duration-200"
          >
            <X size={15} className="text-slate-500" />
          </button>
        </div>

        {/* Step Progress Line */}
        <div className="relative flex items-center justify-between px-10 py-5 border-b border-slate-100 bg-slate-50/10">
          <div className="absolute left-[52px] right-[52px] top-1/2 h-[2px] bg-slate-100 -translate-y-1/2 z-0" />
          <div
            className="absolute left-[52px] top-1/2 h-[2px] bg-slate-900 -translate-y-1/2 transition-all duration-300 z-0"
            style={{ width: `${(step - 1) * 50}%` }}
          />
          {stepsList.map((s, idx) => {
            const StepIcon = s.icon
            const isCompleted = step > idx + 1
            const isActive = step === idx + 1
            return (
              <div key={idx} className="relative z-10 flex flex-col items-center gap-1.5">
                <div className={`h-9 w-9 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
                  isCompleted || isActive
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200"
                    : "bg-white border-slate-200 text-slate-400"
                }`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                  isActive || isCompleted ? "text-slate-900" : "text-slate-400"
                }`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Sliding Body */}
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="px-6 py-5 flex flex-col gap-4 max-h-[52vh] overflow-y-auto"
            >
              {step === 1 && (
                <>
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Full Name <span className="text-red-500">*</span></label>
                    <Input
                      placeholder="e.g. Arjun Reddy"
                      value={formData.name}
                      onChange={e => set("name", e.target.value)}
                      className="h-12 px-4 rounded-2xl border border-slate-200/80 bg-white/50 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 text-slate-800 placeholder-slate-400 text-sm font-medium outline-none"
                    />
                  </div>

                  {/* Email — create only */}
                  {!isEdit && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Email Address <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Input
                          type="email"
                          placeholder="student@college.edu"
                          value={(formData as any).email || ""}
                          onChange={e => set("email", e.target.value)}
                          className="h-12 pl-11 pr-4 rounded-2xl border border-slate-200/80 bg-white/50 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 text-slate-800 placeholder-slate-400 text-sm font-medium outline-none"
                        />
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Phone Number</label>
                    <div className="relative">
                      <Input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={(formData as any).phone || ""}
                        onChange={e => set("phone", e.target.value)}
                        className="h-12 pl-11 pr-4 rounded-2xl border border-slate-200/80 bg-white/50 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 text-slate-800 placeholder-slate-400 text-sm font-medium outline-none"
                      />
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* Reg No & Admission Year */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Reg. Number</label>
                      <Input
                        placeholder="e.g. 22CSE001"
                        value={(formData as any).registration_number || ""}
                        onChange={e => set("registration_number", e.target.value)}
                        className="h-12 px-4 rounded-2xl border border-slate-200/80 bg-white/50 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 text-slate-800 placeholder-slate-400 text-sm font-medium outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Admission Year</label>
                      <div className="relative">
                        <select
                          value={(formData as any).admission_year || currentYear}
                          onChange={e => set("admission_year", parseInt(e.target.value))}
                          className="w-full h-12 pl-4 pr-10 rounded-2xl border border-slate-200/80 bg-white/50 text-sm font-medium text-slate-800 outline-none appearance-none transition-all duration-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md cursor-pointer"
                        >
                          {admissionYearOptions.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  {/* Program */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Academic Program <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                        value={formData.program_id || ""}
                        onChange={e => handleProgramChange(e.target.value)}
                        className="w-full h-12 pl-4 pr-10 rounded-2xl border border-slate-200/80 bg-white/50 text-sm font-medium text-slate-800 outline-none appearance-none transition-all duration-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md cursor-pointer"
                      >
                        <option value="">Select program...</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Semester & Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Semester <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select
                          value={formData.semester || ""}
                          onChange={e => handleSemesterChange(e.target.value)}
                          disabled={!formData.program_id}
                          className="w-full h-12 pl-4 pr-10 rounded-2xl border border-slate-200/80 bg-white/50 text-sm font-medium text-slate-800 outline-none appearance-none transition-all duration-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                        >
                          {!formData.program_id ? (
                            <option value="">Select program first</option>
                          ) : availableSemesters.length === 0 ? (
                            <option value="">No semesters</option>
                          ) : (
                            availableSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)
                          )}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Section <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select
                          value={formData.section_id || ""}
                          onChange={e => set("section_id", e.target.value)}
                          disabled={!formData.program_id}
                          className="w-full h-12 pl-4 pr-10 rounded-2xl border border-slate-200/80 bg-white/50 text-sm font-medium text-slate-800 outline-none appearance-none transition-all duration-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {!formData.program_id
                              ? "Select program first"
                              : filteredSections.length === 0
                                ? "No sections available"
                                : "Select section"}
                          </option>
                          {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  {/* Search Existing Parent */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Search Existing Parent</label>
                    <div className="relative">
                      <Input
                        placeholder="Type name or email to auto-fill..."
                        onChange={async (e) => {
                          const term = e.target.value;
                          if (term.length > 2) {
                            try {
                              const res = await fetch(`/api/parents?institution_id=${(formData as any).institution_id || student?.institution_id || ""}`);
                              if (res.ok) {
                                const parentList = await res.json();
                                const matched = parentList.find((p: any) =>
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
                        className="h-12 pl-11 pr-4 rounded-2xl border border-slate-200/80 bg-white/50 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 text-slate-800 placeholder-slate-400 text-sm font-medium outline-none"
                      />
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* Parent Name & Email */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Parent/Guardian Name</label>
                      <Input
                        placeholder="Name"
                        value={(formData as any).parentName || ""}
                        onChange={e => set("parentName", e.target.value)}
                        className="h-12 px-4 rounded-2xl border border-slate-200/80 bg-white/50 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 text-slate-800 placeholder-slate-400 text-sm font-medium outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Parent/Guardian Email</label>
                      <Input
                        type="email"
                        placeholder="parent@example.com"
                        value={(formData as any).parentEmail || ""}
                        onChange={e => set("parentEmail", e.target.value)}
                        disabled={isEdit}
                        className="h-12 px-4 rounded-2xl border border-slate-200/80 bg-white/50 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 text-slate-800 placeholder-slate-400 text-sm font-medium disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed outline-none"
                      />
                    </div>
                  </div>

                  {/* Parent Phone & Relationship */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Parent Phone</label>
                      <Input
                        placeholder="Phone"
                        value={(formData as any).parentPhone || ""}
                        onChange={e => set("parentPhone", e.target.value)}
                        className="h-12 px-4 rounded-2xl border border-slate-200/80 bg-white/50 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 text-slate-800 placeholder-slate-400 text-sm font-medium outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Relationship</label>
                      <div className="relative">
                        <select
                          value={(formData as any).parentRelationship || "Guardian"}
                          onChange={e => set("parentRelationship", e.target.value)}
                          className="w-full h-12 pl-4 pr-10 rounded-2xl border border-slate-200/80 bg-white/50 text-sm font-medium text-slate-800 outline-none appearance-none transition-all duration-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-md cursor-pointer"
                        >
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Account setup warning */}
                  {!isEdit && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex gap-3 items-start p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mt-2"
                    >
                      <div className="w-7 h-7 rounded-xl flex-shrink-0 bg-white flex items-center justify-center border border-slate-200 shadow-sm text-slate-700">
                        <KeyRound size={13} />
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                        A temporary credentials password will be generated automatically and dispatched to the student's email.
                      </p>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-slate-50/30 z-10 relative">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="flex-1 h-11 text-xs font-bold text-slate-600 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 flex items-center justify-center gap-1.5 outline-none"
            >
              <ArrowLeft size={14} />
              Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 text-xs font-bold text-slate-600 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 outline-none"
            >
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              className="flex-[2] h-11 text-xs font-bold text-white rounded-2xl bg-slate-900 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-slate-200 border-none outline-none"
            >
              Continue
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-[2] h-11 text-xs font-bold text-white rounded-2xl bg-slate-900 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-slate-200 border-none outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Saving..." : isEdit ? "Save Changes" : "Register Student"}
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}