"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { SearchBar, FilterSelect, itemVariants } from "@/components/ui/page-shell"
import { useTerms } from "@/lib/org-type-context"

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

import { BookOpenCheck, Plus, Upload } from "lucide-react"

import { ProgramList } from "@/components/programs/program-list"
import { CreateProgramDialog } from "@/components/programs/create-program-dialog"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"

import type {
  Program,
  ProgramWithDepartment,
  CreateProgramInput,
} from "@/modules/programs"

interface ProgramsClientPageProps {
  initialPrograms: ProgramWithDepartment[]
  departments: Array<{
    id: string
    name: string
  }>
  institutionId: string
  organizationId: string
}

export function ProgramsClientPage({
  initialPrograms,
  departments,
  institutionId,
  organizationId,
}: ProgramsClientPageProps) {
  const t = useTerms()
  const [programs, setPrograms] =
    useState<ProgramWithDepartment[]>(initialPrograms)

  const [isOpen, setIsOpen] = useState(false)

  const [selectedProgram, setSelectedProgram] =
    useState<Program | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [isImportOpen, setIsImportOpen] = useState(false)

  const loadPrograms = async () => {
    try {
      const response = await fetch(
        `/api/programs?institution_id=${institutionId}`
      )

      if (!response.ok) {
        throw new Error("Failed to load programs")
      }

      const data = await response.json()

      setPrograms(data)
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load programs",
        variant: "destructive",
      })
    }
  }

  const handleCreateProgram = async (
    data: CreateProgramInput
  ) => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          institution_id: institutionId,
          organization_id: organizationId,
        }),
      })

      const resData = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(resData.error || "Failed to create program")
      }

      await loadPrograms()

      setIsOpen(false)

      toast({
        title: "Success",
        description:
          `${t.program} created successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create program",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditProgram = async (
    data: CreateProgramInput
  ) => {
    if (!selectedProgram) return

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/programs/${selectedProgram.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(data),
        }
      )

      const resData = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(resData.error || "Failed to update program")
      }

      await loadPrograms()

      setIsOpen(false)

      setSelectedProgram(null)

      toast({
        title: "Success",
        description:
          `${t.program} updated successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update program",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const triggerDelete = (id: string) => {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/programs/${deleteId}`,
        {
          method: "DELETE",
        }
      )

      const resData = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(resData.error || "Failed to delete program")
      }

      await loadPrograms()
      setDeleteOpen(false)
      setDeleteId(null)

      toast({
        title: "Success",
        description: `${t.program} deleted successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Delete failed",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (
    program?: ProgramWithDepartment
  ) => {
    if (program) {
      setSelectedProgram(program)
    } else {
      setSelectedProgram(null)
    }

    setIsOpen(true)
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
            <BookOpenCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#6C63FF]">Academic Planning</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-slate-900">{t.program_plural}</h1>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-[#6C63FF]">
                {programs.length} Active
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Create and manage {t.program_plural.toLowerCase()} with better structure and visibility.</p>
          </div>
        </div>

        <Button
          onClick={() => handleOpenDialog()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          New {t.program}
        </Button>
        <Button
          onClick={() => setIsImportOpen(true)}
          variant="outline"
          className="inline-flex items-center gap-2 rounded-2xl border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </motion.div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={`Search ${t.program_plural.toLowerCase()}…`}
        filters={
          <FilterSelect
            label={`All ${t.department_plural}`}
            value={deptFilter}
            onChange={setDeptFilter}
            options={departments.map(d => ({ value: d.id, label: d.name }))}
          />
        }
      />

      <motion.div variants={itemVariants}>
        <Card className="p-6 shadow-sm">
        <ProgramList
          programs={programs.filter(p => {
            const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.department?.name?.toLowerCase().includes(search.toLowerCase())
            const matchDept = !deptFilter || p.department_id === deptFilter
            return matchSearch && matchDept
          })}
          isLoading={isLoading}
          onEdit={handleOpenDialog}
          onDelete={triggerDelete}
        />
      </Card>
      </motion.div>

      <CreateProgramDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onSubmit={
          selectedProgram
            ? handleEditProgram
            : handleCreateProgram
        }
        program={selectedProgram}
        departments={departments}
        isLoading={isLoading}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title={`Delete ${t.program}`}
        description={`Are you sure you want to delete this ${t.program.toLowerCase()}? All classes, students, and subjects associated with this ${t.program.toLowerCase()} will be affected.`}
        loading={isLoading}
      />

      <BulkImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        entity="programs"
        institutionId={institutionId}
        onImported={loadPrograms}
      />
    </motion.div>
  )
}