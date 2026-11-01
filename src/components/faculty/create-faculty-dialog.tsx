"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { GraduationCap, ShieldAlert } from "lucide-react"
import type { FacultyWithStats, CreateFacultyInput, UpdateFacultyInput } from "@/modules/faculty/types/faculty.types"
import { useTerms } from "@/lib/org-type-context"

interface CreateFacultyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateFacultyInput | UpdateFacultyInput, isEdit: boolean) => Promise<void>
  faculty?: FacultyWithStats | null
  departments?: Array<{ id: string; name: string }>
  isLoading?: boolean
}

export function CreateFacultyDialog({
  open,
  onOpenChange,
  onSubmit,
  faculty,
  departments = [],
  isLoading = false,
}: CreateFacultyDialogProps) {
  const [formData, setFormData] = useState({
    name: faculty?.name || "",
    email: faculty?.email || "",
    department_id: faculty?.department_id || "",
    role: (faculty?.role || "FACULTY") as any,
    is_timetable_builder: faculty?.is_timetable_builder || false,
    phone: faculty?.phone || "",
    employee_id: faculty?.employee_id || "",
  })
  const { toast } = useToast()

  useEffect(() => {
    setFormData({
      name: faculty?.name || "",
      email: faculty?.email || "",
      department_id: faculty?.department_id || (departments.length === 1 ? departments[0].id : ""),
      role: (faculty?.role || "FACULTY") as any,
      is_timetable_builder: faculty?.is_timetable_builder || false,
      phone: faculty?.phone || "",
      employee_id: faculty?.employee_id || "",
    })
  }, [faculty, departments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (formData.email && !formData.email.includes("@")) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    try {
      await onSubmit(formData, !!faculty)
      onOpenChange(false)
      setFormData({ name: "", email: "", department_id: "", role: "FACULTY", is_timetable_builder: false, phone: "", employee_id: "" })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    }
  }

  const isEdit = !!faculty
  const t = useTerms()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl rounded-[28px] sm:max-w-[480px] w-[95%] font-['Plus_Jakarta_Sans',sans-serif]">
        
        {/* Header */}
        <div className="bg-white px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-sm text-slate-800">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                {isEdit ? `Edit ${t.faculty_member} Profile` : `Register ${t.faculty_member}`}
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {isEdit ? `Modify ${t.faculty_member.toLowerCase()} catalog parameters` : `Configure new ${t.faculty_member.toLowerCase()} account metadata`}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Full Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Dr. John Smith"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isEdit}
            />
            {isEdit && (
              <p className="text-[10px] font-semibold text-slate-400 mt-1">
                Email cannot be modified after creation
              </p>
            )}
          </div>

          {/* Phone & Employee ID — 2-col grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employee_id" className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Employee ID</Label>
              <Input
                id="employee_id"
                placeholder="e.g. FAC-101"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              />
            </div>
          </div>

          {/* Department select */}
          {departments.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="department" className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Academic {t.department}</Label>
              <select
                id="department"
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full h-11 px-4 border border-slate-200/80 bg-white/50 text-slate-800 text-sm rounded-2xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all duration-300"
              >
                <option value="">No {t.department} (Unassigned)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-500">
              💡 No {t.department_plural.toLowerCase()} configured yet. You can register {t.faculty_plural.toLowerCase()} now and assign them to a {t.department.toLowerCase()} later from the {t.department_plural} tab.
            </div>
          )}

          {/* Role selector */}
          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Institutional Role</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full h-11 px-4 border border-slate-200/80 bg-white/50 text-slate-800 text-sm rounded-2xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all duration-300"
            >
              <option value="FACULTY">{t.faculty_member}</option>
              <option value="HOD">{t.hod_full}</option>
              <option value="PROGRAM_HEAD">{t.program_head}</option>
            </select>
          </div>

          {/* Timetable Builder toggle */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/40">
            <input
              type="checkbox"
              id="is_timetable_builder"
              checked={formData.is_timetable_builder}
              onChange={(e) => setFormData({ ...formData, is_timetable_builder: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 accent-slate-900 cursor-pointer"
            />
            <div className="flex-1">
              <Label htmlFor="is_timetable_builder" className="text-xs font-bold text-slate-800 cursor-pointer">
                Timetable Builder Access
              </Label>
              <p className="text-[10px] text-slate-400 font-medium">
                Grant permission to construct and modify institution schedules.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 h-11 text-xs font-bold text-slate-600 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 outline-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-[2] h-11 text-xs font-bold text-white rounded-2xl bg-slate-900 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-slate-100 border-none outline-none disabled:opacity-50"
            >
              {isLoading ? "Saving..." : isEdit ? "Save Changes" : `Register ${t.faculty_member}`}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
