"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
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
import { BookOpenCheck, Plus } from "lucide-react"

import { ProgramList } from "@/components/programs/program-list"
import { CreateProgramDialog } from "@/components/programs/create-program-dialog"

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
  const [programs, setPrograms] =
    useState<ProgramWithDepartment[]>(initialPrograms)

  const [isOpen, setIsOpen] = useState(false)

  const [selectedProgram, setSelectedProgram] =
    useState<Program | null>(null)

  const [isLoading, setIsLoading] = useState(false)

  const { toast } = useToast()

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

      if (!response.ok) {
        throw new Error("Failed to create program")
      }

      await loadPrograms()

      setIsOpen(false)

      toast({
        title: "Success",
        description:
          "Program created successfully",
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

      if (!response.ok) {
        throw new Error("Failed to update program")
      }

      await loadPrograms()

      setIsOpen(false)

      setSelectedProgram(null)

      toast({
        title: "Success",
        description:
          "Program updated successfully",
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
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProgram = async (
    programId: string
  ) => {
    if (
      !confirm(
        "Are you sure you want to delete this program?"
      )
    )
      return

    try {
      const response = await fetch(
        `/api/programs/${programId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to delete")
      }

      await loadPrograms()

      toast({
        title: "Success",
        description:
          "Program deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Delete failed",
        variant: "destructive",
      })
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
              <h1 className="text-3xl font-semibold text-slate-900">Programs</h1>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-[#6C63FF]">
                {programs.length} Active
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Create and manage academic programs with better structure and visibility.</p>
          </div>
        </div>

        <Button
          onClick={() => handleOpenDialog()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          New Program
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-6 shadow-sm">
        <ProgramList
          programs={programs}
          isLoading={isLoading}
          onEdit={handleOpenDialog}
          onDelete={handleDeleteProgram}
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
    </motion.div>
  )
}