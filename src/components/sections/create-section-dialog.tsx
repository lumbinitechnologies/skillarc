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
import type { Section, CreateSectionInput } from "@/modules/sections"
import { useTerms, useIsSchool } from "@/lib/org-type-context"

interface CreateSectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateSectionInput) => Promise<void>
  section?: Section | null
  programs: Array<{ id: string; name: string }>
  facultyAdvisors: Array<{ id: string; name: string; email: string }>
  isLoading?: boolean
}

export function CreateSectionDialog({
  open,
  onOpenChange,
  onSubmit,
  section,
  programs,
  facultyAdvisors,
  isLoading = false,
}: CreateSectionDialogProps) {
  const t = useTerms()
  const isSchool = useIsSchool()
  // Colleges show a semester field (1–8). Schools hide it entirely; we silently
  // default semester=1 so the DB non-null constraint is always satisfied.
  const [formData, setFormData] = useState<CreateSectionInput>({
    name: section?.name || "",
    semester: section?.semester || 1,
    program_id: section?.program_id || "",
    institution_id: section?.institution_id || "",
    faculty_advisor_id: section?.faculty_advisor_id || "",
  })
  const { toast } = useToast()

  useEffect(() => {
    setFormData({
      name: section?.name || "",
      semester: section?.semester || 1,
      program_id: section?.program_id || "",
      institution_id: section?.institution_id || "",
      faculty_advisor_id: section?.faculty_advisor_id || "",
    })
  }, [section])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.program_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    try {
      await onSubmit(formData)
      onOpenChange(false)
      setFormData({
        name: "",
        semester: 1,
        program_id: "",
        institution_id: "",
        faculty_advisor_id: "",
      })
      toast({
        title: "Success",
        description: `${t.section} ${section ? "updated" : "created"} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{section ? `Edit ${t.section}` : `Create ${t.section}`}</DialogTitle>
          <DialogDescription>
            {section
              ? `Update ${t.section.toLowerCase()} details and ${t.faculty_member.toLowerCase()} advisor assignment`
              : `Create a new ${t.section.toLowerCase()} for your ${t.program.toLowerCase()}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.section} Name *</Label>
            <Input
              id="name"
              placeholder={`e.g., ${t.section} A, ${t.section} 1`}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          {/* Semester field — colleges only. Schools don't assign a semester to a section. */}
          <div className={isSchool ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
            {!isSchool && (
              <div className="space-y-2">
                <Label htmlFor="semester">{t.semester} *</Label>
                <Input
                  id="semester"
                  type="number"
                  min="1"
                  max="8"
                  value={formData.semester}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      semester: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="program">{t.program} *</Label>
              <select
                id="program"
                value={formData.program_id ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, program_id: e.target.value })
                }
                className="w-full h-11 px-4 border border-slate-200/80 bg-white/50 text-slate-800 text-sm rounded-2xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all duration-300 font-medium"
                required
              >
                <option value="">Select {t.program.toLowerCase()}</option>
                {programs.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="advisor">{t.faculty_member} Advisor</Label>
            <select
              id="advisor"
              value={formData.faculty_advisor_id ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  faculty_advisor_id: e.target.value || null,
                })
              }
              className="w-full h-11 px-4 border border-slate-200/80 bg-white/50 text-slate-800 text-sm rounded-2xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all duration-300 font-medium"
            >
              <option value="">No advisor</option>
              {facultyAdvisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.name} ({advisor.email})
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 h-11 text-xs font-bold text-slate-600 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 outline-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-[2] h-11 text-xs font-bold text-white rounded-2xl bg-slate-900 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 flex items-center justify-center shadow-md shadow-slate-100 border-none outline-none disabled:opacity-50"
            >
              {isLoading ? "Saving..." : section ? `Update ${t.section}` : `Create ${t.section}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}