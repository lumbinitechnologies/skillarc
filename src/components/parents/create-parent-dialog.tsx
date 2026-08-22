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
import type { Parent, CreateParentInput, UpdateParentInput } from "@/modules/parents"
import { Trash2, Search } from "lucide-react"

interface CreateParentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateParentInput | UpdateParentInput, isEdit: boolean) => Promise<void>
  parent?: Parent | null
  isLoading?: boolean
  onRelationsChanged?: () => void
}

export function CreateParentDialog({
  open,
  onOpenChange,
  onSubmit,
  parent,
  isLoading = false,
  onRelationsChanged,
}: CreateParentDialogProps) {
  const [formData, setFormData] = useState<CreateParentInput | UpdateParentInput>({
    name: parent?.name || "",
    email: parent?.email || "",
    password: "",
    institution_id: parent?.institution_id || "",
    organization_id: parent?.organization_id || null,
  })
  const [linkedStudents, setLinkedStudents] = useState<any[]>([])
  const [studentSearch, setStudentSearch] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [relationship, setRelationship] = useState("Father")
  const [isLinking, setIsLinking] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setFormData({
      name: parent?.name || "",
      email: parent?.email || "",
      password: "",
      institution_id: parent?.institution_id || "",
      organization_id: parent?.organization_id || null,
    })
    setLinkedStudents((parent as any)?.students || [])
    setStudentSearch("")
    setSearchResults([])
    setRelationship("Father")
  }, [parent])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (studentSearch.trim().length > 1) {
        try {
          const res = await fetch(`/api/students?search=${studentSearch}&institution_id=${(formData as any).institution_id || parent?.institution_id || ""}`)
          if (res.ok) {
            const data = await res.json()
            const filtered = (data.students || []).filter(
              (s: any) => !linkedStudents.some((l) => l.id === s.id)
            )
            setSearchResults(filtered)
          }
        } catch (error) {
          console.error("Failed to search students:", error)
        }
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [studentSearch, linkedStudents, (formData as any).institution_id, parent])

  const handleLinkStudent = async (student: any) => {
    if (!parent?.id) return
    setIsLinking(true)
    try {
      const res = await fetch("/api/parents/relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_id: parent.id,
          student_id: student.id,
          relationship,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to link student")
      }

      const newRelation = await res.json()
      setLinkedStudents(prev => [...prev, {
        id: student.id,
        name: student.name,
        email: student.email,
        registration_number: student.registration_number,
        relationship: newRelation.relationship,
        relationId: newRelation.id
      }])
      setStudentSearch("")
      setSearchResults([])
      toast({ title: "Success", description: "Student linked successfully" })
      onRelationsChanged?.()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlinkStudent = async (relationId: string, studentId: string) => {
    if (!confirm("Are you sure you want to unlink this student?")) return
    setIsLinking(true)
    try {
      const res = await fetch(`/api/parents/relations?id=${relationId || ""}&parent_id=${parent?.id || ""}&student_id=${studentId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to unlink student")

      setLinkedStudents(prev => prev.filter(s => s.relationId !== relationId && s.id !== studentId))
      toast({ title: "Success", description: "Student unlinked successfully" })
      onRelationsChanged?.()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLinking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || (!parent && !(formData as CreateParentInput).email)) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      })
      return
    }

    try {
      await onSubmit(formData, !!parent)
      onOpenChange(false)
      setFormData({
        name: "",
        email: "",
        password: "",
        institution_id: "",
        organization_id: null,
      })
      toast({
        title: "Success",
        description: parent ? "Parent updated successfully" : "Parent created successfully",
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{parent ? "Edit Parent" : "Create Parent"}</DialogTitle>
          <DialogDescription>
            {parent ? "Update parent details" : "Create a new parent account"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Parent name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {!parent && (
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="parent@example.com"
                value={(formData as CreateParentInput).email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          )}

          {!parent && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Optional temporary password"
                value={"password" in formData ? formData.password || "" : ""}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
          )}

          {parent && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900">Manage Linked Students</h4>
              
              <div className="space-y-2">
                {linkedStudents.length > 0 ? (
                  linkedStudents.map((stud) => (
                    <div key={stud.id} className="flex items-center justify-between rounded-xl border bg-gray-50 p-2.5 text-sm">
                      <div>
                        <p className="font-semibold text-gray-900">{stud.name}</p>
                        <p className="text-xs text-gray-500">{stud.registration_number || "No USN"} · {stud.relationship}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUnlinkStudent(stud.relationId, stud.id)}
                        disabled={isLinking}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">No students linked to this parent.</p>
                )}
              </div>

              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-dashed">
                <Label className="text-xs font-semibold text-gray-700">Link a Student</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search name or USN..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="rounded-xl border border-slate-200 text-xs px-2.5 h-9 outline-none focus:border-slate-900 bg-white/50 cursor-pointer text-slate-800 font-semibold"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border bg-white divide-y">
                    {searchResults.map((stud) => (
                      <div key={stud.id} className="flex items-center justify-between p-2 text-xs">
                        <div>
                          <p className="font-semibold text-gray-900">{stud.name}</p>
                          <p className="text-gray-500">{stud.registration_number || "No USN"} · {stud.email}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleLinkStudent(stud)}
                          disabled={isLinking}
                          className="h-7 px-2.5 text-[11px] bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl border-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Link
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isLinking}
              className="rounded-2xl h-11 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 outline-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isLinking}
              className="flex-1 h-11 text-xs font-bold text-white rounded-2xl bg-slate-900 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 shadow-md shadow-slate-100 border-none outline-none"
            >
              {isLoading ? "Saving..." : parent ? "Update Parent" : "Create Parent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}