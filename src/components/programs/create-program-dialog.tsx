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
import type { Program, CreateProgramInput } from "@/modules/programs"

interface CreateProgramDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateProgramInput) => Promise<void>
  program?: Program | null
  departments: Array<{ id: string; name: string }>
  isLoading?: boolean
}

export function CreateProgramDialog({
  open,
  onOpenChange,
  onSubmit,
  program,
  departments,
  isLoading = false,
}: CreateProgramDialogProps) {
  const [formData, setFormData] = useState<CreateProgramInput>({
    name: program?.name || "",
    department_id: program?.department_id || "",
    institution_id: program?.institution_id || "",
    organization_id: program?.organization_id || "",
  })

  const { toast } = useToast()

  useEffect(() => {
    setFormData({
      name: program?.name || "",
      department_id: program?.department_id || (departments.length === 1 ? departments[0].id : ""),
      institution_id: program?.institution_id || "",
      organization_id: program?.organization_id || "",
    })
  }, [program, departments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a program name",
        variant: "destructive",
      })
      return
    }

    try {
      await onSubmit({
        ...formData,
        name: formData.name.trim(),
        department_id: formData.department_id || null,
      })

      onOpenChange(false)

      setFormData({
        name: "",
        department_id: "",
        institution_id: "",
        organization_id: "",
      })
    } catch {
      // Caller handles error toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {program ? "Edit Program" : "Create Program"}
          </DialogTitle>

          <DialogDescription>
            {program
              ? "Update program details"
              : "Create a new academic program"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Program Name *</Label>

            <Input
              id="name"
              placeholder="e.g. B.Tech Computer Science"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              required
              autoFocus
            />
          </div>

          {departments.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="department">
                Department (Optional)
              </Label>

              <select
                id="department"
                value={formData.department_id || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    department_id: e.target.value,
                  })
                }
                className="w-full h-11 px-4 border border-slate-200/80 bg-white/50 text-slate-800 text-sm rounded-2xl focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all duration-300 font-medium"
              >
                <option value="">
                  No Department (General)
                </option>

                {departments.map((dept) => (
                  <option
                    key={dept.id}
                    value={dept.id}
                  >
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-500">
              💡 No departments configured yet. You can create this program now and assign it to a department later.
            </div>
          )}

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
              {isLoading ? "Saving..." : program ? "Update Program" : "Create Program"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}