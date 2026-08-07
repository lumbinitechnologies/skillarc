"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  ArrowLeft,
  Building2,
  BookOpen,
  BookOpenCheck,
  GraduationCap,
  Users,
  Plus,
  Upload,
  BookMarked,
  Search,
} from "lucide-react"

// Import Lists
import { ProgramList } from "@/components/programs/program-list"
import { SectionsList } from "@/components/sections/sections-list"
import { FacultyList } from "@/components/faculty/faculty-list"
import { StudentList } from "@/components/students/student-list"
import { ParentList } from "@/components/parents/parent-list"
import { SubjectsList } from "@/components/subjects/subjects-list"

// Import Dialogs & Modules
import { CreateProgramDialog } from "@/components/programs/create-program-dialog"
import { CreateSectionDialog } from "@/components/sections/create-section-dialog"
import { CreateFacultyDialog } from "@/components/faculty/create-faculty-dialog"
import { CreateStudentDialog } from "@/components/students/create-student-dialog"
import { CreateParentDialog } from "@/components/parents/create-parent-dialog"
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog"
import { BulkImportDialog } from "@/components/import/bulk-import-dialog"
import { FacultySubjectsClientPage } from "@/app/dashboard/institution-admin/faculty-subjects/faculty-subjects-client"
import { facultySubjectService } from "@/modules/faculty-subjects/services/facultySubjectService"
import StudentSearch from "@/modules/students/components/StudentSearch"
import StudentFilters from "@/modules/students/components/StudentFilters"
import StudentDrawer from "@/modules/students/components/StudentDrawer"

import type { Program, ProgramWithDepartment } from "@/modules/programs"
import type { Section, SectionWithFacultyAdvisor } from "@/modules/sections"
import type { FacultyWithStats } from "@/modules/faculty/types/faculty.types"
import type { StudentWithSection } from "@/modules/students"
import type { Parent } from "@/modules/parents"

type Tab = "programs" | "sections" | "faculty" | "students" | "parents" | "courses" | "assign-courses"

interface Props {
  department: { id: string; name: string }
  initialPrograms: ProgramWithDepartment[]
  initialSections: SectionWithFacultyAdvisor[]
  initialFaculty: FacultyWithStats[]
  initialStudents: StudentWithSection[]
  initialTotalStudents: number
  allFacultyAdvisors: Array<{ id: string; name: string; email: string }>
  initialSubjects: any[]
  initialAssignments: any[]
  departments: Array<{ id: string; name: string }>
  institutionId: string
  organizationId: string
}

export function DepartmentDetailClient({
  department,
  initialPrograms,
  initialSections,
  initialFaculty,
  initialStudents,
  initialTotalStudents,
  allFacultyAdvisors,
  initialSubjects,
  initialAssignments,
  departments,
  institutionId,
  organizationId,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("programs")
  const { toast } = useToast()

  // --- Entity States ---
  const [programs, setPrograms] = useState<ProgramWithDepartment[]>(initialPrograms)
  const [sections, setSections] = useState<SectionWithFacultyAdvisor[]>(initialSections)
  const [faculty, setFaculty] = useState<FacultyWithStats[]>(initialFaculty)
  const [students, setStudents] = useState<StudentWithSection[]>(initialStudents)
  const [subjects, setSubjects] = useState<any[]>(initialSubjects)
  const [assignments, setAssignments] = useState<any[]>(initialAssignments)
  const [parents, setParents] = useState<Parent[]>([])

  // --- Pagination & Filters for Students ---
  const [studentCount, setStudentCount] = useState(initialTotalStudents)
  const [studentPage, setStudentPage] = useState(1)
  const [studentLimit, setStudentLimit] = useState<number>(25)
  const [studentSearch, setStudentSearch] = useState("")
  const [studentProgFilter, setStudentProgFilter] = useState("")
  const [studentSemFilter, setStudentSemFilter] = useState("")
  const [studentSecFilter, setStudentSecFilter] = useState("")

  // --- UI Dialog States ---
  const [isProgramOpen, setIsProgramOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)

  const [isSectionOpen, setIsSectionOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<Section | null>(null)

  const [isFacultyOpen, setIsFacultyOpen] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyWithStats | null>(null)

  const [isStudentOpen, setIsStudentOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentWithSection | null>(null)
  const [isStudentDrawerOpen, setIsStudentDrawerOpen] = useState(false)

  const [isParentOpen, setIsParentOpen] = useState(false)
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null)

  const [isSubjectOpen, setIsSubjectOpen] = useState(false)
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("")

  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importEntity, setImportEntity] = useState<"students" | "faculty" | "parents" | "subjects">("students")

  const [isLoading, setIsLoading] = useState(false)

  // Wrap department object into array for single selection locking in create dialogs
  const lockedDepartment = [{ id: department.id, name: department.name }]

  // --- API Loaders ---
  const loadPrograms = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/programs?institution_id=${institutionId}&department_id=${department.id}`)
      if (!res.ok) throw new Error("Failed to load programs")
      const data = await res.json()
      setPrograms(data)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load programs",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadSections = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/sections?institution_id=${institutionId}&department_id=${department.id}`)
      if (!res.ok) throw new Error("Failed to load sections")
      const data = await res.json()
      setSections(data)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load sections",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadFaculty = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/faculty?institution_id=${institutionId}&department_id=${department.id}`)
      if (!res.ok) throw new Error("Failed to load faculty")
      const data = await res.json()
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

  const loadStudents = useCallback(
    async (targetPage = studentPage, targetLimit = studentLimit) => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          institution_id: institutionId,
          department_id: department.id,
          page: String(targetPage),
          limit: String(targetLimit),
        })
        const res = await fetch(`/api/students?${params}`)
        if (!res.ok) throw new Error("Failed to load students")
        const data = await res.json()
        setStudents(data.students)
        setStudentCount(data.totalCount)
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load students",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [institutionId, department.id, studentPage, studentLimit, toast]
  )

  const loadParents = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/parents?institution_id=${institutionId}&department_id=${department.id}`)
      if (!res.ok) throw new Error("Failed to load parents")
      const data = await res.json()
      setParents(data)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load parents",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadSubjects = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/subjects?institution_id=${institutionId}&department_id=${department.id}`)
      if (!res.ok) throw new Error("Failed to load subjects")
      const data = await res.json()
      setSubjects(data)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load subjects",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadAssignments = async () => {
    setIsLoading(true)
    try {
      const data = await facultySubjectService.getFacultyAssignments(institutionId)
      const deptSubjectIds = subjects.map((s) => s.id)
      const filtered = (data || []).filter((rel: any) => deptSubjectIds.includes(rel.subject_id))
      setAssignments(filtered)
    } catch (error) {
      console.error("Failed to load assignments", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load students when pagination updates
  useEffect(() => {
    loadStudents(studentPage, studentLimit)
  }, [studentPage, studentLimit]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load data when tab becomes active
  useEffect(() => {
    if (activeTab === "parents") {
      loadParents()
    } else if (activeTab === "courses") {
      loadSubjects()
    } else if (activeTab === "assign-courses") {
      loadAssignments()
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- CRUD Handlers ---

  // 1. Programs CRUD
  const handleCreateOrUpdateProgram = async (data: any) => {
    setIsLoading(true)
    try {
      const method = selectedProgram ? "PUT" : "POST"
      const url = selectedProgram ? `/api/programs/${selectedProgram.id}` : "/api/programs"
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          institution_id: institutionId,
          organization_id: organizationId,
        }),
      })

      if (!response.ok) throw new Error("Failed to save program")
      await loadPrograms()
      setIsProgramOpen(false)
      setSelectedProgram(null)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save program",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProgram = async (programId: string) => {
    if (!confirm("Are you sure you want to delete this program?")) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/programs/${programId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete program")
      await loadPrograms()
      toast({ title: "Success", description: "Program deleted successfully" })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete program",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 2. Sections CRUD
  const handleCreateOrUpdateSection = async (data: any) => {
    setIsLoading(true)
    try {
      const method = selectedSection ? "PUT" : "POST"
      const url = selectedSection ? `/api/sections/${selectedSection.id}` : "/api/sections"
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          institution_id: institutionId,
        }),
      })

      if (!response.ok) throw new Error("Failed to save section")
      await loadSections()
      setIsSectionOpen(false)
      setSelectedSection(null)
      toast({
        title: "Success",
        description: `Section ${selectedSection ? "updated" : "created"} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save section",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/sections/${sectionId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete section")
      await loadSections()
      toast({ title: "Success", description: "Section deleted successfully" })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete section",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 3. Faculty CRUD
  const handleCreateOrUpdateFaculty = async (data: any, isEdit: boolean) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        isEdit ? `/api/faculty/${selectedFaculty?.id}` : "/api/faculty",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit ? data : { ...data, institution_id: institutionId }
          ),
        }
      )

      if (!response.ok) throw new Error("Failed to save faculty")
      await loadFaculty()
      setIsFacultyOpen(false)
      setSelectedFaculty(null)
      toast({
        title: "Success",
        description: `Faculty ${isEdit ? "updated" : "created"} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save faculty",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteFaculty = async (facultyId: string) => {
    if (!confirm("Are you sure you want to delete this faculty member?")) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/faculty/${facultyId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete faculty")
      await loadFaculty()
      toast({ title: "Success", description: "Faculty member removed" })
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

  // 4. Students CRUD
  const handleCreateOrUpdateStudent = async (data: any, isEdit: boolean) => {
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
      if (!response.ok) throw new Error("Failed to save student")
      await loadStudents(studentPage, studentLimit)
      setIsStudentOpen(false)
      setSelectedStudent(null)
      toast({
        title: "Success",
        description: `Student ${isEdit ? "updated" : "registered"} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save student",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/students/${studentId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete student")
      const newPage = students.length === 1 && studentPage > 1 ? studentPage - 1 : studentPage
      setStudentPage(newPage)
      await loadStudents(newPage, studentLimit)
      toast({ title: "Success", description: "Student removed" })
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

  // 5. Parents CRUD
  const handleCreateOrUpdateParent = async (data: any, isEdit: boolean) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        isEdit ? `/api/parents/${selectedParent?.id}` : "/api/parents",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, institution_id: institutionId }),
        }
      )
      if (!response.ok) throw new Error("Failed to save parent")
      await loadParents()
      setIsParentOpen(false)
      setSelectedParent(null)
      toast({
        title: "Success",
        description: `Parent ${isEdit ? "updated" : "created"} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save parent",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteParent = async (parentId: string) => {
    if (!confirm("Are you sure you want to delete this parent?")) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/parents/${parentId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete parent")
      await loadParents()
      toast({ title: "Success", description: "Parent removed" })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete parent",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 6. Courses CRUD
  const handleCreateSubject = async (data: any) => {
    setIsLoading(true)
    try {
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

      if (!res.ok) throw new Error("Failed to create subject")

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
      setIsSubjectOpen(false)

      toast({
        title: "Success",
        description: "Subject created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create subject",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/subjects/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete subject")

      setSubjects((prev: any) => prev.filter((s: any) => s.id !== id))
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
      setIsLoading(false)
    }
  }

  // --- Student Filtering Logic (client slice) ---
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.email?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.registration_number?.toLowerCase().includes(studentSearch.toLowerCase())

    const matchesProgram = !studentProgFilter || student.program_id === studentProgFilter
    const matchesSemester = !studentSemFilter || student.semester === Number(studentSemFilter)
    const matchesSection = !studentSecFilter || student.section_id === studentSecFilter

    return matchesSearch && matchesProgram && matchesSemester && matchesSection
  })

  // --- Subject Filtering Logic ---
  const filteredSubjects = subjects.filter((s: any) => {
    const nameMatch = s.name?.toLowerCase().includes(subjectSearchQuery.toLowerCase())
    const codeMatch = s.code?.toLowerCase().includes(subjectSearchQuery.toLowerCase())
    const progMatch = s.program?.name?.toLowerCase().includes(subjectSearchQuery.toLowerCase())
    return nameMatch || codeMatch || progMatch
  })

  // --- Student Pagination Info ---
  const totalPages = Math.max(1, Math.ceil(studentCount / studentLimit))
  const rangeFrom = studentCount === 0 ? 0 : (studentPage - 1) * studentLimit + 1
  const rangeTo = Math.min(studentPage * studentLimit, studentCount)

  const triggerImport = (entity: "students" | "faculty" | "parents" | "subjects") => {
    setImportEntity(entity)
    setIsImportOpen(true)
  }

  const onImported = () => {
    if (importEntity === "students") loadStudents(studentPage, studentLimit)
    if (importEntity === "faculty") loadFaculty()
    if (importEntity === "parents") loadParents()
    if (importEntity === "subjects") loadSubjects()
  }

  const sectionsForStudentComponents = sections.map((s) => ({
    id: s.id,
    name: s.name,
    semester: s.semester,
    program_id: s.program_id || "",
  }))

  const facultyForAssignment = faculty.map((f) => ({
    id: f.id,
    name: f.name || "Unknown",
    department: department.name,
  }))

  const programsForSubjectDialog = programs.map((p) => ({
    id: p.id,
    name: p.name,
    department_id: p.department_id || "",
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Back button and title header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/institution-admin/departments"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#6C63FF] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Departments
        </Link>

        <div className="flex flex-col gap-5 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-[#6C63FF]">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6C63FF]">
                Department Workspace
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">
                {department.name}
              </h1>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="flex items-center gap-6 text-sm text-slate-500 font-medium">
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900 font-mono">{programs.length}</span>
              <span>Programs</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900 font-mono">{sections.length}</span>
              <span>Sections</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900 font-mono">{faculty.length}</span>
              <span>Faculty</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern, elegant tabs selector */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {[
          { id: "programs", label: "Programs", count: programs.length, icon: BookOpenCheck },
          { id: "sections", label: "Sections", count: sections.length, icon: BookOpen },
          { id: "courses", label: "Courses", count: subjects.length, icon: BookMarked },
          { id: "assign-courses", label: "Assign Courses", count: assignments.length, icon: BookOpen },
          { id: "faculty", label: "Faculty", count: faculty.length, icon: Users },
          { id: "students", label: "Students", count: studentCount, icon: GraduationCap },
          { id: "parents", label: "Parents", count: parents.length, icon: Users },
        ].map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition duration-200 ${
                isActive
                  ? "border-[#6C63FF] text-[#6C63FF]"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  isActive ? "bg-indigo-50 text-[#6C63FF]" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab content renders */}
      <div className="space-y-6">
        
        {/* TAB 1: PROGRAMS */}
        {activeTab === "programs" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-sm font-medium text-slate-500">Manage all undergraduate & postgraduate programs.</span>
              <Button
                onClick={() => {
                  setSelectedProgram(null)
                  setIsProgramOpen(true)
                }}
                className="rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white font-semibold hover:shadow-md transition"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Program
              </Button>
            </div>
            <Card className="p-6 shadow-sm border border-slate-100">
              <ProgramList
                programs={programs}
                isLoading={isLoading}
                onEdit={(p) => {
                  setSelectedProgram(p)
                  setIsProgramOpen(true)
                }}
                onDelete={handleDeleteProgram}
              />
            </Card>
          </div>
        )}

        {/* TAB 2: SECTIONS */}
        {activeTab === "sections" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-sm font-medium text-slate-500">Manage class sections and assign faculty advisors.</span>
              <Button
                onClick={() => {
                  setSelectedSection(null)
                  setIsSectionOpen(true)
                }}
                className="rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white font-semibold hover:shadow-md transition"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Section
              </Button>
            </div>
            <Card className="p-6 shadow-sm border border-slate-100">
              <SectionsList
                sections={sections}
                isLoading={isLoading}
                onEdit={(s) => {
                  setSelectedSection(s)
                  setIsSectionOpen(true)
                }}
                onDelete={handleDeleteSection}
              />
            </Card>
          </div>
        )}

        {/* TAB: COURSES */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-500">Manage academic courses (subjects) belonging to this department.</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => triggerImport("subjects")}
                  className="rounded-2xl text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Button
                  onClick={() => {
                    setIsSubjectOpen(true)
                  }}
                  className="rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white font-semibold hover:shadow-md transition"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Course
                </Button>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-slate-100 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search subjects, codes, or programs..."
                value={subjectSearchQuery}
                onChange={(e) => setSubjectSearchQuery(e.target.value)}
                className="w-full text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
              />
            </div>

            <div className="pt-2">
              <SubjectsList
                subjects={filteredSubjects}
                onDelete={handleDeleteSubject}
              />
            </div>
          </div>
        )}

        {/* TAB: ASSIGN COURSES */}
        {activeTab === "assign-courses" && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm font-medium text-slate-500">Assign subjects/courses to department faculty members.</p>
            </div>
            <FacultySubjectsClientPage
              faculty={facultyForAssignment}
              subjects={subjects}
              assignments={assignments}
            />
          </div>
        )}

        {/* TAB 3: FACULTY */}
        {activeTab === "faculty" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-500">Manage teaching faculty members assigned to this department.</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => triggerImport("faculty")}
                  className="rounded-2xl text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Button
                  onClick={() => {
                    setSelectedFaculty(null)
                    setIsFacultyOpen(true)
                  }}
                  className="rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white font-semibold hover:shadow-md transition"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Faculty
                </Button>
              </div>
            </div>
            <Card className="p-6 shadow-sm border border-slate-100">
              <FacultyList
                faculty={faculty}
                isLoading={isLoading}
                onEdit={(f) => {
                  setSelectedFaculty(f)
                  setIsFacultyOpen(true)
                }}
                onDelete={handleDeleteFaculty}
              />
            </Card>
          </div>
        )}

        {/* TAB 4: STUDENTS */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-500">Manage registered students and section assignments.</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => triggerImport("students")}
                  className="rounded-2xl text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Button
                  onClick={() => {
                    setSelectedStudent(null)
                    setIsStudentOpen(true)
                  }}
                  className="rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white font-semibold hover:shadow-md transition"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Student
                </Button>
              </div>
            </div>

            <StudentSearch value={studentSearch} onChange={(v) => { setStudentSearch(v); setStudentPage(1) }} />

            <StudentFilters
              programs={programs}
              sections={sectionsForStudentComponents}
              selectedProgram={studentProgFilter}
              selectedSemester={studentSemFilter}
              selectedSection={studentSecFilter}
              onProgramChange={(v) => { setStudentProgFilter(v); setStudentPage(1) }}
              onSemesterChange={(v) => { setStudentSemFilter(v); setStudentPage(1) }}
              onSectionChange={(v) => { setStudentSecFilter(v); setStudentPage(1) }}
            />

            <Card className="overflow-hidden shadow-sm border border-slate-100">
              <StudentList
                students={filteredStudents}
                isLoading={isLoading}
                onEdit={(s) => {
                  setSelectedStudent(s)
                  setIsStudentOpen(true)
                }}
                onView={(s) => {
                  setSelectedStudent(s)
                  setIsStudentDrawerOpen(true)
                }}
                onDelete={handleDeleteStudent}
                totalCount={studentCount}
                page={studentPage}
                limit={studentLimit}
                totalPages={totalPages}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                onPrev={() => { if (studentPage > 1) setStudentPage((p) => p - 1) }}
                onNext={() => { if (studentPage < totalPages) setStudentPage((p) => p + 1) }}
                onLimitChange={(lim) => { setStudentLimit(lim); setStudentPage(1) }}
              />
            </Card>
          </div>
        )}

        {/* TAB 5: PARENTS */}
        {activeTab === "parents" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-500">Track and manage parent accounts linked to department students.</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => triggerImport("parents")}
                  className="rounded-2xl text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Button
                  onClick={() => {
                    setSelectedParent(null)
                    setIsParentOpen(true)
                  }}
                  className="rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white font-semibold hover:shadow-md transition"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Parent
                </Button>
              </div>
            </div>

            <Card className="p-6 shadow-sm border border-slate-100">
              <ParentList
                parents={parents}
                isLoading={isLoading}
                onEdit={(p) => {
                  setSelectedParent(p)
                  setIsParentOpen(true)
                }}
                onDelete={handleDeleteParent}
              />
            </Card>
          </div>
        )}
      </div>

      {/* Dialog: Create/Edit Program */}
      <CreateProgramDialog
        open={isProgramOpen}
        onOpenChange={setIsProgramOpen}
        onSubmit={handleCreateOrUpdateProgram}
        program={selectedProgram}
        departments={lockedDepartment}
        isLoading={isLoading}
      />

      {/* Dialog: Create/Edit Section */}
      <CreateSectionDialog
        open={isSectionOpen}
        onOpenChange={setIsSectionOpen}
        onSubmit={handleCreateOrUpdateSection}
        section={selectedSection}
        programs={programs}
        facultyAdvisors={allFacultyAdvisors}
        isLoading={isLoading}
      />

      {/* Dialog: Create/Edit Faculty */}
      <CreateFacultyDialog
        open={isFacultyOpen}
        onOpenChange={setIsFacultyOpen}
        onSubmit={handleCreateOrUpdateFaculty}
        faculty={selectedFaculty}
        departments={lockedDepartment}
        isLoading={isLoading}
      />

      {/* Dialog: Create/Edit Student */}
      <CreateStudentDialog
        open={isStudentOpen}
        onOpenChange={(open) => {
          setIsStudentOpen(open)
          if (!open) setSelectedStudent(null)
        }}
        onSubmit={handleCreateOrUpdateStudent}
        student={selectedStudent}
        sections={sectionsForStudentComponents}
        programs={programs}
        isLoading={isLoading}
      />

      {/* Dialog: Create/Edit Parent */}
      <CreateParentDialog
        open={isParentOpen}
        onOpenChange={(open) => {
          setIsParentOpen(open)
          if (!open) setSelectedParent(null)
        }}
        onSubmit={handleCreateOrUpdateParent}
        onRelationsChanged={loadParents}
        parent={selectedParent}
        isLoading={isLoading}
      />

      {/* Dialog: Create Subject */}
      <CreateSubjectDialog
        open={isSubjectOpen}
        onOpenChange={setIsSubjectOpen}
        onSubmit={handleCreateSubject}
        departments={lockedDepartment}
        programs={programsForSubjectDialog}
      />

      {/* Dialog: CSV Import */}
      <BulkImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        entity={importEntity}
        institutionId={institutionId}
        onImported={onImported}
      />

      {/* Drawer: View Student Details */}
      <StudentDrawer
        open={isStudentDrawerOpen}
        student={selectedStudent}
        onClose={() => setIsStudentDrawerOpen(false)}
      />

    </div>
  )
}
