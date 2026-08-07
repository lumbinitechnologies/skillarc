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

    if (!formData.name || !formData.department_id) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      await onSubmit(formData)

      onOpenChange(false)

      setFormData({
        name: "",
        department_id: "",
        institution_id: "",
        organization_id: "",
      })

      toast({
        title: "Success",
        description: `Program ${
          program ? "updated" : "created"
        } successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong",
        variant: "destructive",
      })
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
              placeholder="e.g. B.Tech CSE"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              required
            />
          </div>

          {departments.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="department">
                Department *
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
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">
                  Select Department
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
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading
                ? "Saving..."
                : program
                ? "Update Program"
                : "Create Program"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}