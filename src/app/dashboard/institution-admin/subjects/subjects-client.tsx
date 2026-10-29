"use client"

import { useState } from "react"
import { Plus, BookMarked } from "lucide-react"
import { motion } from "framer-motion"
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
import { SubjectsList } from "@/components/subjects/subjects-list"
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"
import { useToast } from "@/components/ui/use-toast"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { SearchBar, FilterSelect } from "@/components/ui/page-shell"

export function SubjectsClientPage({
  initialSubjects,
  departments,
  programs,
  institutionId,
}: any) {
  const [subjects, setSubjects] = useState(initialSubjects)
  const [open, setOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<any>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deptFilter, setDeptFilter] = useState("")
  const [progFilter, setProgFilter] = useState("")

  const { toast } = useToast()
  const t = useTerms()

  function handleOpenDialog(subject?: any) {
    if (subject) {
      setSelectedSubject(subject)
    } else {
      setSelectedSubject(null)
    }
    setOpen(true)
  }

  async function handleCreate(data: any) {
    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        institution_id: institutionId,
      }),
    })

    if (!res.ok) {
      toast({
        title: "Error",
        description: "Failed to create subject",
        variant: "destructive",
      })
      return
    }

    const result = await res.json()
    const createdArray = Array.isArray(result) ? result : [result]

    const formattedSubjects = createdArray.map((subject: any) => {
      const selectedProgram = programs.find((p: any) => p.id === subject.program_id)
      return {
        ...subject,
        program: selectedProgram ? {
          id: selectedProgram.id,
          name: selectedProgram.name,
          department: selectedProgram.department ? {
            id: selectedProgram.department.id,
            name: selectedProgram.department.name
          } : null
        } : null
      }
    })

    setSubjects((prev: any) => [...prev, ...formattedSubjects])
    setOpen(false)

    toast({
      title: "Success",
      description: "Subject created successfully",
    })
  }

  async function handleEdit(data: any) {
    if (!selectedSubject) return
    const res = await fetch(`/api/subjects/${selectedSubject.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      toast({
        title: "Error",
        description: "Failed to update subject",
        variant: "destructive",
      })
      return
    }

    const updated = await res.json()
    const selectedProgram = programs.find((p: any) => p.id === updated.program_id)
    const formatted = {
      ...updated,
      program: selectedProgram ? {
        id: selectedProgram.id,
        name: selectedProgram.name,
        department: selectedProgram.department ? {
          id: selectedProgram.department.id,
          name: selectedProgram.department.name
        } : null
      } : null
    }

    setSubjects((prev: any) => prev.map((s: any) => s.id === selectedSubject.id ? formatted : s))
    setOpen(false)
    setSelectedSubject(null)

    toast({
      title: "Success",
      description: "Subject updated successfully",
    })
  }

  function handleDelete(id: string) {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/subjects/${deleteId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete subject")

      setSubjects((prev: any) => prev.filter((s: any) => s.id !== deleteId))
      setDeleteOpen(false)
      setDeleteId(null)
      toast({
        title: "Deleted",
        description: "Subject removed successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete subject",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Collect program IDs that belong to the selected department (for robust dept filter)
  const programIdsInDept = deptFilter
    ? programs.filter((p: any) => p.department_id === deptFilter).map((p: any) => p.id)
    : null

  const filteredSubjects = subjects.filter((s: any) => {
    const nameMatch = s.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const codeMatch = s.code?.toLowerCase().includes(searchQuery.toLowerCase())
    const deptMatch = s.program?.department?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const progMatch = s.program?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const searchOk = nameMatch || codeMatch || deptMatch || progMatch
    // Use program_id lookup against client-side programs list (robust — works even if nested join is missing)
    const deptOk = !deptFilter || (programIdsInDept !== null && s.program_id && programIdsInDept.includes(s.program_id))
    const progOk = !progFilter || s.program_id === progFilter
    return searchOk && deptOk && progOk
  })

  const filteredPrograms = programs.filter((p: any) => !deptFilter || p.department_id === deptFilter)

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
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#6C63FF] flex-shrink-0">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#6C63FF]">Institution Catalog</p>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-3xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans']">Subjects</h1>
              <span className="bg-indigo-50 text-[#6C63FF] text-xs font-bold px-2 py-0.5 rounded-md font-['Space_Grotesk']">
                {subjects.length} Total
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Manage academic subjects, syllabus configuration, and {t.department_plural.toLowerCase()} settings.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="self-start md:self-auto inline-flex items-center justify-center gap-2 bg-white text-slate-700 text-xs font-semibold px-5 py-3 rounded-2xl shadow-sm hover:bg-slate-50 transition-all duration-200 active:scale-95 flex-shrink-0"
          >
            Import CSV
          </button>
          <button
            onClick={() => handleOpenDialog()}
                 className="self-start md:self-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary-600)] hover:to-[var(--primary-700)] text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Subject
          </button>
        </div>
      </motion.div>

      {/* Search & Filter Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={`Search subjects, codes, or ${t.program_plural.toLowerCase()}…`}
        filters={
          <>
            <FilterSelect
              label={`All ${t.department_plural}`}
              value={deptFilter}
              onChange={(v) => { setDeptFilter(v); setProgFilter("") }}
              options={departments.map((d: any) => ({ value: d.id, label: d.name }))}
            />
            <FilterSelect
              label={`All ${t.program_plural}`}
              value={progFilter}
              onChange={setProgFilter}
              options={filteredPrograms.map((p: any) => ({ value: p.id, label: p.name }))}
            />
          </>
        }
      />

      {/* Main Subjects Display list */}
      <motion.div variants={itemVariants} className="pt-2">
        <SubjectsList
          subjects={filteredSubjects}
          onDelete={handleDelete}
          onEdit={handleOpenDialog}
        />
      </motion.div>

      <CreateSubjectDialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) setSelectedSubject(null)
        }}
        onSubmit={selectedSubject ? handleEdit : handleCreate}
        departments={departments}
        programs={programs}
        subject={selectedSubject}
      />

      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entity="subjects"
        institutionId={institutionId}
        onImported={() => window.location.reload()}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Subject"
        description="Are you sure you want to delete this subject? All associated student records and timetable slots for this subject will be affected."
        loading={isDeleting}
      />
    </motion.div>
  )
}