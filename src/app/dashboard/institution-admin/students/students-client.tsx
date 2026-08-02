"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { GraduationCap, Plus, Upload } from "lucide-react"
import { StudentList } from "@/components/students/student-list"
import { CreateStudentDialog } from "@/components/students/create-student-dialog"
import { useToast } from "@/components/ui/use-toast"
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

  const handleDelete = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/students/${studentId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete student")
      // If we just deleted the last item on this page, go back one
      const newPage = students.length === 1 && page > 1 ? page - 1 : page
      setPage(newPage)
      await loadStudents(newPage, limit)
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col gap-5 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-[#6C63FF]">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#6C63FF]">Student Operations</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-slate-900">Students</h1>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-[#6C63FF]">
                {totalCount} Records
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Manage enrollments, section assignments, and student records in one place.</p>
          </div>
        </div>
        {(!enabledFeatures || enabledFeatures.includes("direct_onboarding")) && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(true)} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={() => setIsOpen(true)} className="rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md">
              <Plus className="mr-2 h-4 w-4" />
              New Student
            </Button>
          </div>
        )}
      </div>

      <StudentSearch value={search} onChange={(v) => { setSearch(v); setPage(1) }} />

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
          onDelete={handleDelete}
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
    </div>
  )
}