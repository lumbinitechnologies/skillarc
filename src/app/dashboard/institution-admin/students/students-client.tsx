"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { GraduationCap, Plus, Upload } from "lucide-react"
import { StudentList } from "@/components/students/student-list"
import { CreateStudentDialog } from "@/components/students/create-student-dialog"
import { useToast } from "@/components/ui/use-toast"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import StudentSearch from "@/modules/students/components/StudentSearch"
import StudentFilters from "@/modules/students/components/StudentFilters"
import StudentDrawer from "@/modules/students/components/StudentDrawer"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"
import { PageShell, PageHeader, itemVariants, actionButtonClass } from "@/components/ui/page-shell"
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
  const { toast } = useToast()

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
    <PageShell>
      <PageHeader
        icon={<GraduationCap className="h-5 w-5" />}
        eyebrow="Student Operations"
        title="Students"
        count={totalCount}
        countLabel="Enrolled"
        subtitle="Manage enrollments, section assignments, and student records in one place."
        actions={
          <>
            <button onClick={() => setIsImportOpen(true)} className={actionButtonClass.secondary}>
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
            <button onClick={() => setIsOpen(true)} className={actionButtonClass.primary}>
              <Plus className="h-4 w-4" />
              New Student
            </button>
          </>
        }
      />

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
            onEdit={(student) => { setSelectedStudent(student); setIsOpen(true) }}
            onView={(student) => { setSelectedStudent(student); setDrawerOpen(true) }}
            onDelete={triggerDelete}
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
    </PageShell>
  )
}
