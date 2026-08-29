"use client"

import { useState, useEffect, useCallback } from "react"
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
import { GraduationCap, Plus, Upload } from "lucide-react"
import { StudentList } from "@/components/students/student-list"
import { CreateStudentDialog } from "@/components/students/create-student-dialog"
import { useToast } from "@/components/ui/use-toast"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import StudentSearch from "@/modules/students/components/StudentSearch"
import StudentFilters from "@/modules/students/components/StudentFilters"
import StudentDrawer from "@/modules/students/components/StudentDrawer"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"
import type { StudentWithSection, CreateStudentInput, UpdateStudentInput } from "@/modules/students"

const ROWS_OPTIONS = [10, 25, 50, 100] as const

interface StudentsClientPageProps {
  initialStudents: StudentWithSection[]
  initialTotalCount: number
  sections: Array<{ id: string; name: string; semester: number; program_id: string }>
  programs: Array<{ id: string; name: string }>
  institutionId: string
}

export function StudentsClientPage({
  initialStudents,
  initialTotalCount,
  sections,
  programs,
  institutionId,
}: StudentsClientPageProps) {
  const [students, setStudents]       = useState<StudentWithSection[]>(initialStudents)
  const [totalCount, setTotalCount]   = useState(initialTotalCount)
  const [page, setPage]               = useState(1)
  const [limit, setLimit]             = useState<number>(25)

  const [search, setSearch]                   = useState("")
  const [selectedProgram, setSelectedProgram] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")
  const [selectedSection, setSelectedSection] = useState("")

  const [isOpen, setIsOpen]           = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentWithSection | null>(null)
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [enabledFeatures, setEnabledFeatures] = useState<string[] | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function getFeatures() {
      try {
        const res = await fetch("/api/org-features")
        const json = await res.json()
        setEnabledFeatures(json.features || [])
      } catch (err) {
        console.error("Failed to load org features:", err)
      }
    }
    getFeatures()
  }, [])

  // ── Fetch page from server ──────────────────────────────────────────────
  const loadStudents = useCallback(async (targetPage = page, targetLimit = limit) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        institution_id: institutionId,
        page: String(targetPage),
        limit: String(targetLimit),
      })
      const response = await fetch(`/api/students?${params}`)
      if (!response.ok) throw new Error("Failed to load students")
      const data = await response.json()
      setStudents(data.students)
      setTotalCount(data.totalCount)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load students",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [institutionId, page, limit, toast])

  // Re-fetch whenever page or limit changes
  useEffect(() => {
    loadStudents(page, limit)
  }, [page, limit]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pagination helpers ──────────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(totalCount / limit))
  const rangeFrom   = totalCount === 0 ? 0 : (page - 1) * limit + 1
  const rangeTo     = Math.min(page * limit, totalCount)

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit)
    setPage(1)
  }

  function handlePrev() { if (page > 1) setPage((p) => p - 1) }
  function handleNext() { if (page < totalPages) setPage((p) => p + 1) }

  // ── CRUD ────────────────────────────────────────────────────────────────
  const handleCreateOrUpdate = async (
    data: CreateStudentInput | UpdateStudentInput,
    isEdit: boolean
  ) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        isEdit ? `/api/students/${selectedStudent?.id}` : "/api/students",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, institution_id: institutionId }),
        }
      )
      if (!response.ok) throw new Error(isEdit ? "Failed to update student" : "Failed to create student")
      await loadStudents(page, limit)
      setIsOpen(false)
      setSelectedStudent(null)
      toast({
        title: "Success",
        description: isEdit ? "Student updated successfully" : "Student created successfully",
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

  const triggerDelete = (id: string) => {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/students/${deleteId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete student")
      // If we just deleted the last item on this page, go back one
      const newPage = students.length === 1 && page > 1 ? page - 1 : page
      setPage(newPage)
      await loadStudents(newPage, limit)
      setDeleteOpen(false)
      setDeleteId(null)
      toast({ title: "Success", description: "Student removed successfully" })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete student",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ── Client-side filter (on the current page slice) ──────────────────────
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name?.toLowerCase().includes(search.toLowerCase()) ||
      student.email?.toLowerCase().includes(search.toLowerCase()) ||
      student.registration_number?.toLowerCase().includes(search.toLowerCase())

    const matchesProgram  = !selectedProgram  || student.program_id  === selectedProgram
    const matchesSemester = !selectedSemester || student.semester    === Number(selectedSemester)
    const matchesSection  = !selectedSection  || student.section_id  === selectedSection

    return matchesSearch && matchesProgram && matchesSemester && matchesSection
  })

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-5 rounded-3xl bg-gradient-to-br from-white via-white to-indigo-50/15 p-6 shadow-sm border border-indigo-100/30 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-[#6C63FF] border border-indigo-100/50 shadow-sm shadow-indigo-100/40">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6C63FF]">Student Operations</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] tracking-tight flex">
                {"Students".split("").map((char, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 15, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      delay: 0.1 + index * 0.04,
                      duration: 0.45,
                      ease: [0.34, 1.56, 0.64, 1]
                    }}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>
              <span className="rounded-full bg-indigo-50 border border-indigo-100/50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#6C63FF] font-['Space_Grotesk']">
                {totalCount} Records
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Manage enrollments, section assignments, and student records in one place.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Student
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <StudentSearch value={search} onChange={(v) => { setSearch(v); setPage(1) }} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <StudentFilters
        programs={programs}
        sections={sections}
        selectedProgram={selectedProgram}
        selectedSemester={selectedSemester}
        selectedSection={selectedSection}
        onProgramChange={(v) => { setSelectedProgram(v);  setPage(1) }}
        onSemesterChange={(v) => { setSelectedSemester(v); setPage(1) }}
        onSectionChange={(v) => { setSelectedSection(v);  setPage(1) }}
      />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden">
        <StudentList
          students={filteredStudents}
          isLoading={isLoading}
          onEdit={(student) => {
            setSelectedStudent(student)
            setIsOpen(true)
          }}
          onView={(student) => {
            setSelectedStudent(student)
            setDrawerOpen(true)
          }}
          onDelete={triggerDelete}
          // Pagination footer props
          totalCount={totalCount}
          page={page}
          limit={limit}
          totalPages={totalPages}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          onPrev={handlePrev}
          onNext={handleNext}
          onLimitChange={handleLimitChange}
        />
      </Card>
      </motion.div>

      <CreateStudentDialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setSelectedStudent(null)
        }}
        onSubmit={handleCreateOrUpdate}
        student={selectedStudent}
        sections={sections}
        programs={programs}
        isLoading={isLoading}
      />

      <BulkImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        entity="students"
        institutionId={institutionId}
        onImported={() => loadStudents(page, limit)}
      />

      <StudentDrawer
        open={drawerOpen}
        student={selectedStudent}
        onClose={() => setDrawerOpen(false)}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Student Profile"
        description="Are you sure you want to remove this student? This will permanently delete their portal access and enrollment details."
        loading={isLoading}
      />
    </motion.div>
  )
}