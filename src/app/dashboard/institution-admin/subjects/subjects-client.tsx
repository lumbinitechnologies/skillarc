"use client"

import { useState } from "react"
import { Plus, BookMarked, Search } from "lucide-react"
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
import { SubjectsList } from "@/components/subjects/subjects-list"
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"
import { useToast } from "@/components/ui/use-toast"

export function SubjectsClientPage({
  initialSubjects,
  departments,
  programs,
  institutionId,
}: any) {
  const [subjects, setSubjects] = useState(initialSubjects)
  const [open, setOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const { toast } = useToast()

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

  async function handleDelete(id: string) {
    const res = await fetch(`/api/subjects/${id}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      toast({
        title: "Error",
        description: "Failed to delete subject",
        variant: "destructive",
      })
      return
    }

    setSubjects((prev: any) => prev.filter((s: any) => s.id !== id))
    toast({
      title: "Deleted",
      description: "Subject removed successfully",
    })
  }

  const filteredSubjects = subjects.filter((s: any) => {
    const nameMatch = s.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const codeMatch = s.code?.toLowerCase().includes(searchQuery.toLowerCase())
    const deptMatch = s.program?.department?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const progMatch = s.program?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return nameMatch || codeMatch || deptMatch || progMatch
  })

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
            <p className="mt-2 text-sm text-slate-500">Manage academic subjects, syllabus configuration, and department settings.</p>
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
            onClick={() => setOpen(true)}
                 className="self-start md:self-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary-600)] hover:to-[var(--primary-700)] text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Subject
          </button>
        </div>
      </motion.div>

      {/* Search Filter Bar */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.01)] max-w-md"
      >
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search subjects, codes, or programs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
        />
      </motion.div>

      {/* Main Subjects Display list */}
      <motion.div variants={itemVariants} className="pt-2">
        <SubjectsList
          subjects={filteredSubjects}
          onDelete={handleDelete}
        />
      </motion.div>

      <CreateSubjectDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={handleCreate}
        departments={departments}
        programs={programs}
      />

      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entity="subjects"
        institutionId={institutionId}
        onImported={() => window.location.reload()}
      />
    </motion.div>
  )
}