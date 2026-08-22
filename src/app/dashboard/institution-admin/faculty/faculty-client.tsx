"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
}

import { Users, Plus, Upload } from "lucide-react"
import { FacultyList } from "@/components/faculty/faculty-list"
import { CreateFacultyDialog } from "@/components/faculty/create-faculty-dialog"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"
import { useToast } from "@/components/ui/use-toast"
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
  const [isOpen, setIsOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyWithStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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
          body: JSON.stringify(
            isEdit
              ? data
              : {
                  ...data,
                  institution_id: institutionId,
                }
          ),
        }
      )

      if (!response.ok) throw new Error(isEdit ? "Failed to update faculty" : "Failed to create faculty")

      await loadFaculty()
      setIsOpen(false)
      setSelectedFaculty(null)
      toast({
        title: "Success",
        description: isEdit ? "Faculty updated successfully" : "Faculty created successfully",
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

  const handleDelete = async (facultyId: string) => {
    if (!confirm("Are you sure you want to delete this faculty member?")) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/faculty/${facultyId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete faculty")
      await loadFaculty()
      toast({
        title: "Success",
        description: "Faculty removed successfully",
      })
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-5 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-[#6C63FF]">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#6C63FF]">Faculty Management</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-slate-900">Faculty</h1>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-[#6C63FF]">
                {faculty.length} Listed
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Track faculty members, departments, and teaching assignments.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => setIsOpen(true)} className="rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md">
            <Plus className="mr-2 h-4 w-4" />
            Add Faculty
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6 shadow-sm">
        <FacultyList
          faculty={faculty}
          isLoading={isLoading}
          onEdit={(faculty) => {
            setSelectedFaculty(faculty)
            setIsOpen(true)
          }}
          onDelete={handleDelete}
        />
      </Card>
      </motion.div>

      <CreateFacultyDialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setSelectedFaculty(null)
        }}
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
    </motion.div>
  )
}
