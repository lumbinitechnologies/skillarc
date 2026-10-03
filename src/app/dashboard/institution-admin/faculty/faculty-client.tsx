"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { GraduationCap, Plus, Upload } from "lucide-react"
import { FacultyList } from "@/components/faculty/faculty-list"
import { CreateFacultyDialog } from "@/components/faculty/create-faculty-dialog"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"
import { useToast } from "@/components/ui/use-toast"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { PageShell, PageHeader, SearchBar, itemVariants, actionButtonClass } from "@/components/ui/page-shell"
import type { FacultyWithStats, CreateFacultyInput, UpdateFacultyInput } from "@/modules/faculty/types/faculty.types"

interface FacultyClientPageProps {
  initialFaculty: FacultyWithStats[]
  departments: Array<{ id: string; name: string }>
  institutionId: string
}

export function FacultyClientPage({
  initialFaculty,
  departments,
  institutionId,
}: FacultyClientPageProps) {
  const [faculty, setFaculty] = useState<FacultyWithStats[]>(initialFaculty)
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyWithStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { toast } = useToast()

  const loadFaculty = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/faculty?institution_id=${institutionId}`)
      if (!response.ok) throw new Error("Failed to load faculty")
      const data = await response.json()
      setFaculty(data)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load faculty",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateOrUpdate = async (
    data: CreateFacultyInput | UpdateFacultyInput,
    isEdit: boolean
  ) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        isEdit ? `/api/faculty/${selectedFaculty?.id}` : "/api/faculty",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isEdit ? data : { ...data, institution_id: institutionId }),
        }
      )
      if (!response.ok) throw new Error(isEdit ? "Failed to update faculty" : "Failed to create faculty")
      await loadFaculty()
      setIsOpen(false)
      setSelectedFaculty(null)
      toast({
        title: "Success",
        description: isEdit ? "Faculty updated" : "Faculty member added",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Operation failed",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const triggerDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true) }

  const confirmDelete = async () => {
    if (!deleteId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/faculty/${deleteId}`, { method: "DELETE" })
      const resData = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(resData.error || "Failed to delete faculty")
      await loadFaculty()
      setDeleteOpen(false)
      setDeleteId(null)
      toast({ title: "Removed", description: "Faculty member removed" })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete faculty",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendInvite = async (targetFaculty: FacultyWithStats) => {
    try {
      toast({ title: "Sending…", description: `Sending invite to ${targetFaculty.email}` })
      const response = await fetch("/api/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetFaculty.email,
          role: targetFaculty.role || "FACULTY",
          institutionId,
        }),
      })
      const data = await response.json()
      if (!response.ok || data.error) throw new Error(data.error || "Failed to resend invite")
      toast({ title: "Invitation Sent", description: `Email sent to ${targetFaculty.email}` })
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to resend", variant: "destructive" })
    }
  }

  const filtered = faculty.filter(
    (f) =>
      !search ||
      f.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageShell>
      <PageHeader
        icon={<GraduationCap className="h-5 w-5" />}
        eyebrow="Faculty Management"
        title="Faculty"
        count={faculty.length}
        countLabel="Members"
        subtitle="Track faculty members, departments, and teaching assignments."
        actions={
          <>
            <button onClick={() => setIsImportOpen(true)} className={actionButtonClass.secondary}>
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
            <button onClick={() => setIsOpen(true)} className={actionButtonClass.primary}>
              <Plus className="h-4 w-4" />
              Add Faculty
            </button>
          </>
        }
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email…"
      />

      <motion.div variants={itemVariants}>
        <FacultyList
          faculty={filtered}
          isLoading={isLoading}
          onEdit={(f) => { setSelectedFaculty(f); setIsOpen(true) }}
          onDelete={triggerDelete}
          onResendInvite={handleResendInvite}
        />
      </motion.div>

      <CreateFacultyDialog
        open={isOpen}
        onOpenChange={(open) => { setIsOpen(open); if (!open) setSelectedFaculty(null) }}
        onSubmit={handleCreateOrUpdate}
        faculty={selectedFaculty}
        departments={departments}
        isLoading={isLoading}
      />

      <BulkImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        entity="faculty"
        institutionId={institutionId}
        onImported={() => loadFaculty()}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Remove Faculty Member"
        description="This will remove the faculty member and unassign their timetable slots and subject assignments."
        loading={isLoading}
      />
    </PageShell>
  )
}
