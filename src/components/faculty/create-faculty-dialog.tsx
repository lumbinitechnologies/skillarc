"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import type { FacultyWithStats, CreateFacultyInput, UpdateFacultyInput } from "@/modules/faculty/types/faculty.types"

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
  })
  const { toast } = useToast()

  useEffect(() => {
    setFormData({
      name: faculty?.name || "",
      email: faculty?.email || "",
      department_id: faculty?.department_id || "",
      role: (faculty?.role || "FACULTY") as any,
      is_timetable_builder: faculty?.is_timetable_builder || false,
    })
  }, [faculty])

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
      setFormData({ name: "", email: "", department_id: "", role: "FACULTY", is_timetable_builder: false })
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
          <DialogTitle>{faculty ? "Edit Faculty" : "Create Faculty"}</DialogTitle>
          <DialogDescription>
            {faculty
              ? "Update faculty member details and assign roles"
              : "Create a new faculty member account"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Dr. John Smith"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., john@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              disabled={!!faculty}
            />
            {faculty && (
              <p className="text-xs text-gray-500">
                Email cannot be changed after creation
              </p>
            )}
          </div>

          {departments.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <select
                id="department"
                value={formData.department_id}
                onChange={(e) =>
                  setFormData({ ...formData, department_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 bg-white text-slate-800 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Role selector (HOD / Program Head / Faculty) */}
          <div className="space-y-2">
            <Label htmlFor="role">Institutional Role</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 bg-white text-slate-800 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="FACULTY">Faculty Member</option>
              <option value="HOD">Head of Department (HOD)</option>
              <option value="PROGRAM_HEAD">Program Head</option>
            </select>
          </div>

          {/* Timetable Builder toggle */}
          <div className="flex items-center gap-3 py-2 px-1 border border-slate-100 rounded-lg bg-slate-50/50">
            <input
              type="checkbox"
              id="is_timetable_builder"
              checked={formData.is_timetable_builder}
              onChange={(e) =>
                setFormData({ ...formData, is_timetable_builder: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
            />
            <div>
              <Label htmlFor="is_timetable_builder" className="text-xs font-bold text-slate-700 cursor-pointer">
                Timetable Builder Access
              </Label>
              <p className="text-[10px] text-slate-400">
                Grant permission to create and build timetables.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-[#6C63FF] hover:bg-[#5b52e0] text-white">
              {isLoading ? "Saving..." : faculty ? "Update Faculty" : "Create Faculty"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
