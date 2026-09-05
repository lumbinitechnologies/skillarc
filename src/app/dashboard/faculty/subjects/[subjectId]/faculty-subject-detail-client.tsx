"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Book,
  MessageSquare,
  ListTodo,
  Users,
  Settings,
  Plus,
  MoreVertical,
  FileCode,
  CheckCircle,
  FileText,
  Send,
  ClipboardList,
  Calendar,
  ChevronRight,
  Award,
  Trash2,
  Clock,
  ArrowLeft,
  AlertCircle,
  X,
  Play,
  Terminal,
  Loader2,
  Eye,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  User,
  Paperclip,
  Video,
  Save,
  Brain,
  BookOpen,
  FolderKanban,
  Sparkles,
  Layers,
  Sliders,
  Star,
  Printer
} from "lucide-react"

import AttendancePrintModal from "@/modules/attendance/components/AttendancePrintModal"
import GradebookPrintModal from "@/modules/gradebook/components/GradebookPrintModal"
import {
  createAssignmentAction,
  updateAssignmentAction,
  deleteAssignmentAction,
  gradeSubmissionAction,
  runPlagiarismScanAction
} from "@/app/actions/assignments"
import {
  createGradeColumnAction,
  deleteGradeColumnAction,
  updateGradeColumnAction,
  upsertGradeEntryAction,
} from "@/app/actions/gradebook"
import { buildGradeValueMap } from "@/lib/gradebook"
import {
  createMeetingAction,
  endMeetingAction
} from "@/app/actions/meetings"
import {
  createSubjectAnnouncementAction,
  deleteSubjectAnnouncementAction,
} from "@/app/actions/announcements"
import {
  createProjectWithGroupsAction,
  updateProjectGroupAction,
  sendProjectGroupUpdateAction,
  suggestTeamsAIAction,
} from "@/app/actions/project-groups"
import { detectAIContent } from "@/lib/ai-detector"
import { supabase } from "@/lib/supabase"
import {
  getExistingAttendanceAction,
  saveAttendanceAction
} from "@/app/dashboard/faculty/attendance/actions"
import AttendanceOverwriteModal from "@/modules/attendance/components/AttendanceOverwriteModal"
type FacultyTab = "assignments" | "modules" | "syllabus" | "evaluation" | "grades" | "students" | "meetings" | "attendance" | "announcements"

type FacultyWorksheetType = "Assignment" | "Quiz" | "Coding Assignment" | "Material" | "Syllabus"

interface FacultySubjectDetailClientProps {
  facultyId: string
  facultyName: string
  institutionId: string
  subject: {
    id: string
    name: string
    code: string
  }
  sections: Array<{
    id: string
    name: string
  }>
  assignments: Array<any>
  announcements: Array<any>
  submissions: Array<any>
  students: Array<any>
  meetings: Array<any>
  projects: Array<any>
  gradeColumns?: Array<any>
  gradeEntries?: Array<any>
}

export function FacultySubjectDetailClient({
  facultyId,
  facultyName,
  institutionId,
  subject,
  sections,
  assignments,
  announcements,
  submissions,
  students,
  meetings,
  projects,
  gradeColumns = [],
  gradeEntries = [],
}: FacultySubjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<FacultyTab>("assignments")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<FacultyWorksheetType>("Assignment")
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null)
  const [localAnnouncements, setLocalAnnouncements] = useState<any[]>(announcements)

  // Project groups states
  const [localProjects, setLocalProjects] = useState(projects)
  const [selectedSectionId, setSelectedSectionId] = useState("")
  const [projectTitle, setProjectTitle] = useState("")
  const [projectDesc, setProjectDesc] = useState("")
  
  // Roster details
  const [roster, setRoster] = useState<any[]>([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  
  // Team allocation states (NEW)
  const [teamName, setTeamName] = useState("")
  const [maxTeamSize, setMaxTeamSize] = useState(4)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  
  // Separation settings
  const [teamCount, setTeamCount] = useState(3)
  const [themeId, setThemeId] = useState("classic")
  const [focus, setFocus] = useState<"skill_balance" | "role_distribution" | "random">("skill_balance")
  
  // Allocation Outcome
  const [generatedTeams, setGeneratedTeams] = useState<any[]>([])
  const [overallFeedback, setOverallFeedback] = useState("")
  const [allocating, setAllocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedProjId, setExpandedProjId] = useState<string | null>(null)
  const [allocateTab, setAllocateTab] = useState<"projects" | "allocate" | "auto">("projects")
  const [autoGroupSize, setAutoGroupSize] = useState(4)
  const [projectSectionFilter, setProjectSectionFilter] = useState("all")
  const [editingGroup, setEditingGroup] = useState<any | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [editingMemberIds, setEditingMemberIds] = useState<string[]>([])
  const [updatingGroup, setUpdatingGroup] = useState(false)
  const [updateGroup, setUpdateGroup] = useState<any | null>(null)
  const [groupUpdateTitle, setGroupUpdateTitle] = useState("")
  const [groupUpdateMessage, setGroupUpdateMessage] = useState("")
  const [sendingGroupUpdate, setSendingGroupUpdate] = useState(false)

  // Local Toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null)
  const triggerToast = (msg: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Local submissions & Plagiarism state
  const [localSubmissions, setLocalSubmissions] = useState<any[]>(submissions)
  const [isScanningPlagiarism, setIsScanningPlagiarism] = useState(false)
  const [plagiarismScanResult, setPlagiarismScanResult] = useState<{
    rate: number
    risk: string
    matchedStudent: string
  } | null>(null)

  useEffect(() => {
    setLocalSubmissions(submissions)
  }, [submissions])

  // Meetings specific states
  const [localMeetings, setLocalMeetings] = useState<any[]>(meetings)
  const [isStartingMeeting, setIsStartingMeeting] = useState(false)
  const [isCreateMeetingModalOpen, setIsCreateMeetingModalOpen] = useState(false)
  const [meetTitle, setMeetTitle] = useState("")
  const [meetSectionId, setMeetSectionId] = useState(sections[0]?.id || "")
  const [meetType, setMeetType] = useState<"instant" | "scheduled">("instant")
  const [meetStart, setMeetStart] = useState("")
  const [meetEnd, setMeetEnd] = useState("")

  // Attendance specific states
  const [selectedSection, setSelectedSection] = useState(sections[0]?.id || "")
  const [selectedGradeSection, setSelectedGradeSection] = useState(sections[0]?.id || "")
  const [studentPanelTab, setStudentPanelTab] = useState<"students" | "project_groups">("students")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isGradePrintModalOpen, setIsGradePrintModalOpen] = useState(false)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  const [attendanceConflict, setAttendanceConflict] = useState<{
    isConflict: boolean
    loggedByFacultyName: string
    loggedByFacultyEmail?: string
    loggedSubjectName?: string
    loggedSubjectCode?: string
    loggedSessionNotes?: string
  } | null>(null)
  const [isAttendanceOverwriteModalOpen, setIsAttendanceOverwriteModalOpen] = useState(false)

  const [assignmentGradeColumns, setAssignmentGradeColumns] = useState<Array<{ id: string; label: string; max_score: number; weight: number }>>([])
  const [customGradeColumns, setCustomGradeColumns] = useState<Array<{ id: string; label: string; max_score: number; weight: number }>>(
    (gradeColumns ?? []).map((column: any) => ({
      id: column.id,
      label: column.title,
      max_score: Number(column.max_score ?? 100),
      weight: Number(column.weight ?? 0),
    }))
  )
  const [gradeValues, setGradeValues] = useState<Record<string, Record<string, string>>>(() => buildGradeValueMap(gradeEntries || []))
  const [gradeWeightMode, setGradeWeightMode] = useState<"percentage" | "marks">("percentage")

  useEffect(() => {
    const filtered = assignments.filter((a) => a.type !== "Material" && a.type !== "Syllabus")
    const defaultWeight = filtered.length ? Math.floor(100 / filtered.length) : 0
    setAssignmentGradeColumns((prev) => {
      const prevMap = new Map(prev.map((col) => [col.id, col]))
      return filtered.map((a, index) => {
        const existing = prevMap.get(a.id)
        const weight = existing?.weight ?? (index === filtered.length - 1 ? 100 - defaultWeight * (filtered.length - 1) : defaultWeight)
        return {
          id: a.id,
          label: a.title,
          max_score: a.max_score ?? 0,
          weight,
        }
      })
    })
  }, [assignments])

  const assignmentGradesByStudent = React.useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {}
    submissions.forEach((sub: any) => {
      if (!map[sub.student_id]) map[sub.student_id] = {}
      map[sub.student_id][sub.assignment_id] = sub.grade
    })
    return map
  }, [submissions])

  const gradebookStudents = React.useMemo(() => {
    return students.filter(student => student.section_id === selectedGradeSection)
  }, [students, selectedGradeSection])

  const handleAddGradeColumn = async () => {
    const nextIndex = customGradeColumns.length + 1
    const label = `Custom ${nextIndex}`
    const result = await createGradeColumnAction({
      subject_id: subject.id,
      title: label,
      type: "custom",
      max_score: 100,
      weight: 0,
      display_order: customGradeColumns.length,
      created_by: facultyId,
    })

    if (result.success && result.column) {
      setCustomGradeColumns((prev) => [
        ...prev,
        {
          id: result.column.id,
          label: result.column.title,
          max_score: Number(result.column.max_score ?? 100),
          weight: Number(result.column.weight ?? 0),
        },
      ])
      triggerToast("Grade column added.", "success")
    } else {
      triggerToast(result.error || "Failed to add column.", "warning")
    }
  }

  const handleGradeValueChange = async (studentId: string, colId: string, value: string) => {
    setGradeValues((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [colId]: value,
      },
    }))

    const result = await upsertGradeEntryAction({
      column_id: colId,
      student_id: studentId,
      score: value,
      feedback: null,
      graded_by: facultyId,
      subject_id: subject.id,
    })

    if (!result.success) {
      triggerToast(result.error || "Failed to save grade.", "warning")
    }
  }

  const handleGradeColumnLabelChange = async (colId: string, label: string) => {
    setCustomGradeColumns((prev) => prev.map((col) => (col.id === colId ? { ...col, label } : col)))

    const target = customGradeColumns.find((col) => col.id === colId)
    if (!target || !label.trim()) return

    const result = await updateGradeColumnAction({
      id: colId,
      subject_id: subject.id,
      title: label,
    })

    if (!result.success) {
      triggerToast(result.error || "Failed to update column name.", "warning")
    }
  }

  const handleAssignmentColumnWeightChange = (colId: string, weight: number) => {
    setAssignmentGradeColumns((prev) => prev.map((col) => (col.id === colId ? { ...col, weight } : col)))
  }

  const handleGradeColumnWeightChange = async (colId: string, weight: number) => {
    setCustomGradeColumns((prev) => prev.map((col) => (col.id === colId ? { ...col, weight } : col)))

    const result = await updateGradeColumnAction({
      id: colId,
      subject_id: subject.id,
      weight,
    })

    if (!result.success) {
      triggerToast(result.error || "Failed to update column weight.", "warning")
    }
  }

  const handleRemoveGradeColumn = async (colId: string) => {
    const result = await deleteGradeColumnAction(subject.id, colId)
    if (!result.success) {
      triggerToast(result.error || "Failed to remove grade column.", "warning")
      return
    }

    setCustomGradeColumns((prev) => prev.filter((col) => col.id !== colId))
    setGradeValues((prev) => {
      const updated: Record<string, Record<string, string>> = {}
      Object.entries(prev).forEach(([studentId, grades]) => {
        const filteredGrades: Record<string, string> = {}
        Object.entries(grades).forEach(([gradeColId, value]) => {
          if (gradeColId !== colId) {
            filteredGrades[gradeColId] = value
          }
        })
        updated[studentId] = filteredGrades
      })
      return updated
    })
  }

  const getAssignmentGradeForStudent = (studentId: string, assignmentId: string) => {
    return assignmentGradesByStudent[studentId]?.[assignmentId] ?? null
  }

  const computeStudentTotal = (studentId: string) => {
    const assignmentSum = assignmentGradeColumns.reduce((sum, col) => {
      const grade = getAssignmentGradeForStudent(studentId, col.id)
      if (!Number.isFinite(Number(grade)) || col.max_score <= 0) return sum
      return sum + (Number(grade) / col.max_score) * col.weight
    }, 0)

    const customSum = customGradeColumns.reduce((sum, col) => {
      const value = Number(gradeValues[studentId]?.[col.id])
      if (!Number.isFinite(value)) return sum
      if (gradeWeightMode === "marks") {
        return sum + Math.min(value, col.weight)
      }
      return sum + (value * col.weight) / 100
    }, 0)

    return Number((assignmentSum + customSum).toFixed(1))
  }

  useEffect(() => {
    setLocalAnnouncements(announcements)
  }, [announcements])

  useEffect(() => {
    const hour = new Date().getHours()
    const inferredPeriod = hour < 10 ? "1" : hour < 12 ? "2" : hour < 14 ? "3" : hour < 16 ? "4" : "5"
    setSelectedPeriod(inferredPeriod)
  }, [])

  const filteredStudents = React.useMemo(() => {
    return students.filter(student => student.section_id === selectedSection)
  }, [students, selectedSection])

  const markedCount = Object.keys(attendance).length
  const totalStudents = filteredStudents.length
  const completionPercent = totalStudents ? Math.round((markedCount / totalStudents) * 100) : 0
  const presentCount = Object.values(attendance).filter((value) => value === "Present").length
  const absentCount = Object.values(attendance).filter((value) => value === "Absent").length
  const lateCount = Object.values(attendance).filter((value) => value === "Late").length

  useEffect(() => {
    let isActive = true

    async function loadExistingSession() {
      if (!selectedSection || !selectedDate || !selectedPeriod) {
        if (isActive) {
          setAttendance({})
          setSessionNotice(null)
          setAttendanceConflict(null)
        }
        return
      }

      const periodValue = parseInt(selectedPeriod, 10)
      if (isNaN(periodValue)) return

      const result = await getExistingAttendanceAction({
        subjectId: subject.id,
        sectionId: selectedSection,
        attendanceDate: selectedDate,
        period: periodValue,
      })

      if (!isActive) return

      if (result.success && result.exists) {
        setAttendance(result.records ?? {})
        if (result.isLoggedByOther) {
          setAttendanceConflict({
            isConflict: true,
            loggedByFacultyName: result.loggedByFacultyName || "Another Faculty",
            loggedByFacultyEmail: result.loggedByFacultyEmail || "",
            loggedSubjectName: result.loggedSubjectName || "",
            loggedSubjectCode: result.loggedSubjectCode || "",
            loggedSessionNotes: result.sessionNotes || "",
          })
          setSessionNotice(
            `Attendance for this slot was originally recorded by ${result.loggedByFacultyName || "another faculty member"}${result.loggedSubjectCode ? ` (${result.loggedSubjectCode})` : ""}. Any changes will prompt an overwrite confirmation.`
          )
        } else {
          setAttendanceConflict(null)
          setSessionNotice("Existing attendance found for this session. You can edit and save it again.")
        }
      } else {
        setAttendance({})
        setSessionNotice(null)
        setAttendanceConflict(null)
      }
    }

    loadExistingSession()

    return () => {
      isActive = false
    }
  }, [selectedDate, selectedPeriod, selectedSection, subject.id])

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }))
  }

  const handleMarkAllPresent = () => {
    const newAttendance: Record<string, string> = {}
    filteredStudents.forEach((student) => {
      newAttendance[student.id] = "Present"
    })
    setAttendance(newAttendance)
  }

  const todayIso = new Date().toISOString().slice(0, 10)
  const isFutureAttendanceDate = selectedDate > todayIso

  const executeAttendanceSave = async () => {
    setIsSaving(true)
    const periodValue = parseInt(selectedPeriod, 10)
    const result = await saveAttendanceAction({
      subjectId: subject.id,
      sectionId: selectedSection,
      attendanceDate: selectedDate,
      period: periodValue,
      records: attendance,
    })
    setIsSaving(false)
    setIsAttendanceOverwriteModalOpen(false)
    if (result.success) {
      setAttendanceConflict(null)
      triggerToast("Attendance saved successfully!", "success")
      setSessionNotice("Attendance records saved successfully.")
    } else {
      triggerToast(result.error || "Failed to save attendance.", "warning")
    }
  }

  const handleSaveAttendance = async () => {
    if (!selectedSection || !selectedDate || !selectedPeriod) {
      triggerToast("Please set section, date, and period.", "warning")
      return
    }

    if (selectedDate > todayIso) {
      triggerToast("Attendance cannot be logged for future dates. Please select today or an earlier date.", "warning")
      return
    }

    if (attendanceConflict?.isConflict) {
      setIsAttendanceOverwriteModalOpen(true)
      return
    }

    await executeAttendanceSave()
  }

  useEffect(() => {
    setLocalMeetings(meetings)
  }, [meetings])

  useEffect(() => {
    const channel = supabase
      .channel("live_meetings_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetings", filter: `subject_id=eq.${subject.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLocalMeetings(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev
              return [payload.new, ...prev]
            })
          } else if (payload.eventType === "UPDATE") {
            setLocalMeetings(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
          } else if (payload.eventType === "DELETE") {
            setLocalMeetings(prev => prev.filter(m => m.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [subject.id])

  const handleStartInstantMeeting = async (title: string, sectionId: string) => {
    if (!title.trim() || !sectionId) {
      alert("Please provide a title and target section.")
      return
    }
    setIsStartingMeeting(true)
    const res = await createMeetingAction({
      title: title.trim(),
      subject_id: subject.id,
      section_id: sectionId,
      faculty_id: facultyId,
      institution_id: institutionId,
      meeting_type: "instant"
    })
    setIsStartingMeeting(false)
    if (res.success && res.meeting) {
      window.open(`/meetings/${res.meeting.meeting_code}`, "_blank")
    } else {
      alert("Error starting meeting: " + res.error)
    }
  }

  const handleScheduleMeeting = async () => {
    if (!meetTitle.trim() || !meetSectionId || !meetStart || !meetEnd) {
      alert("Please enter title, section, start and end dates.")
      return
    }
    setIsStartingMeeting(true)
    const res = await createMeetingAction({
      title: meetTitle.trim(),
      subject_id: subject.id,
      section_id: meetSectionId,
      faculty_id: facultyId,
      institution_id: institutionId,
      meeting_type: "scheduled",
      scheduled_start: new Date(meetStart).toISOString(),
      scheduled_end: new Date(meetEnd).toISOString()
    })
    setIsStartingMeeting(false)
    if (res.success) {
      setIsCreateMeetingModalOpen(false)
      setMeetTitle("")
      triggerToast("Meeting scheduled successfully!", "success")
    } else {
      alert("Error scheduling meeting: " + res.error)
    }
  }

  const handleEndMeeting = async (meetId: string) => {
    if (!confirm("Are you sure you want to end this lecture meeting?")) return
    const res = await endMeetingAction(meetId, subject.id)
    if (!res.success) {
      alert("Error ending meeting: " + res.error)
    }
  }

  // Posting announcement state
  const [announcementText, setAnnouncementText] = useState("")
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false)

  // State for evaluation queue
  const [activeQueueTab, setActiveQueueTab] = useState<"pending" | "graded">("pending")
  const [currentEvalIdx, setCurrentEvalIdx] = useState(0)
  const [scoreInput, setScoreInput] = useState("")
  const [feedbackInput, setFeedbackInput] = useState("")
  const [isSavingGrade, setIsSavingGrade] = useState(false)

  // Map students for quick lookup
  const studentMap = new Map(students.map(s => [s.id, s]))
  const sectionMap = new Map(sections.map(s => [s.id, s.name]))

  // Filter assignments
  const materials = assignments.filter(a => a.type === "Material" || a.type === "material")
  const standardAssignments = assignments.filter(a => a.type === "Assignment" || a.type === "assignment")
  const quizzes = assignments.filter(a => a.type === "Quiz" || a.type === "quiz")
  const codingAssignments = assignments.filter(a => a.type === "Coding Assignment" || a.type === "coding")
  const announcementsList = localAnnouncements
  const syllabusItems = assignments.filter((a) => a.type === "Syllabus")

  const getSubmissionStats = (assignmentId: string) => {
    const subs = submissions.filter(s => s.assignment_id === assignmentId)
    const graded = subs.filter(s => s.status === "graded").length
    return { total: subs.length, graded, pending: subs.length - graded }
  }

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return "No due date"
    const d = new Date(dueDate)
    if (isNaN(d.getTime())) return dueDate
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const handlePostAnnouncement = async () => {
    if (!announcementText.trim()) return
    setIsPostingAnnouncement(true)

    const sectionIds = sections.map(s => s.id)
    const res = await createSubjectAnnouncementAction({
      subject_id: subject.id,
      faculty_id: facultyId,
      title: `${subject.name} Announcement`,
      description: announcementText.trim(),
      section_ids: sectionIds,
    })

    setIsPostingAnnouncement(false)
    if (res.success) {
      setAnnouncementText("")
      if (res.announcement) {
        setLocalAnnouncements(prev => [res.announcement, ...prev])
      }
    } else {
      alert("Error posting announcement: " + res.error)
    }
  }

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coursework? This will also delete all student submissions.")) return
    const res = await deleteAssignmentAction(id, subject.id)
    if (!res.success) {
      alert("Error deleting coursework: " + res.error)
    }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return
    const res = await deleteSubjectAnnouncementAction(id, subject.id)
    if (!res.success) {
      alert("Error deleting announcement: " + res.error)
      return
    }
    setLocalAnnouncements(prev => prev.filter((ann) => ann.id !== id))
  }

  // Submission details helpers
  const getSubmissionsForAssignment = (assignmentId: string) => {
    return localSubmissions
      .filter(s => s.assignment_id === assignmentId)
      .map(s => {
        const student = studentMap.get(s.student_id)
        return {
          ...s,
          studentName: student?.name || "Unknown Student",
          rollNo: student?.email?.split("@")[0].toUpperCase() || "N/A",
          sectionName: student ? (sectionMap.get(student.section_id) || "N/A") : "N/A"
        }
      })
  }

  const getNotSubmittedForAssignment = (assignment: any) => {
    const assignedSectionIds = assignment.section_ids || []
    const submittedStudentIds = new Set(localSubmissions.filter(s => s.assignment_id === assignment.id).map(s => s.student_id))
    
    return students
      .filter(s => assignedSectionIds.includes(s.section_id) && !submittedStudentIds.has(s.id))
      .map(s => ({
        id: s.id,
        name: s.name,
        rollNo: s.email?.split("@")[0].toUpperCase() || "N/A",
        sectionName: sectionMap.get(s.section_id) || "N/A"
      }))
  }

  // Active Assignment for Grading
  const [selectedGradingAssignment, setSelectedGradingAssignment] = useState<any | null>(null)
  const activeGradingSubmissions = selectedGradingAssignment ? getSubmissionsForAssignment(selectedGradingAssignment.id) : []
  const activeGradingNotSubmitted = selectedGradingAssignment ? getNotSubmittedForAssignment(selectedGradingAssignment) : []

  const pendingGrading = activeGradingSubmissions.filter(s => s.status === "pending")
  const gradedGrading = activeGradingSubmissions.filter(s => s.status === "graded")
  const activeQueueList = activeQueueTab === "pending" ? pendingGrading : gradedGrading
  const currentSub = activeQueueList[currentEvalIdx] || null
  const aiResult = currentSub ? detectAIContent(currentSub.code_content || currentSub.feedback || "") : null

  useEffect(() => {
    if (currentSub) {
      if (currentSub.status === "graded") {
        setScoreInput(currentSub.grade != null ? String(currentSub.grade) : "")
        setFeedbackInput(currentSub.feedback || "")
      } else {
        setScoreInput("")
        setFeedbackInput("")
      }
    } else {
      setScoreInput("")
      setFeedbackInput("")
    }
  }, [currentSub?.id, activeQueueTab])

  const handleSaveGrade = async () => {
    if (!currentSub || !scoreInput) return
    setIsSavingGrade(true)
    try {
      const score = Number(scoreInput)
      if (isNaN(score) || score < 0 || score > (selectedGradingAssignment?.max_score || 100)) {
        setToast({
          message: `Please enter a valid score between 0 and ${selectedGradingAssignment?.max_score || 100}.`,
          type: "warning"
        })
        setIsSavingGrade(false)
        return
      }

      const res = await gradeSubmissionAction(
        currentSub.id,
        score,
        feedbackInput,
        subject.id
      )

      if (res.success) {
        setLocalSubmissions((prev) =>
          prev.map((s) =>
            s.id === currentSub.id
              ? { ...s, grade: score, feedback: feedbackInput, status: "graded" }
              : s
          )
        )
        setToast({ message: "Grade saved successfully!", type: "success" })

        // Adjust index if we graded the last pending item
        if (activeQueueTab === "pending") {
          const remainingPendingCount = pendingGrading.length - 1
          if (remainingPendingCount === 0) {
            setCurrentEvalIdx(0)
          } else if (currentEvalIdx >= remainingPendingCount) {
            setCurrentEvalIdx(remainingPendingCount - 1)
          }
        }
      } else {
        setToast({ message: `Error saving grade: ${res.error || "Unknown error"}`, type: "warning" })
      }
    } catch (err: any) {
      console.error("Save grade error:", err)
      setToast({ message: `Failed to save grade: ${err.message || "Unknown error"}`, type: "warning" })
    } finally {
      setIsSavingGrade(false)
    }
  }

  // --- PROJECT GROUP ALLOCATION CONFIGURATION & UTILS ---
  const POPULAR_ROLES = [
    "Frontend Developer",
    "Backend Developer",
    "Fullstack Engineer",
    "UI/UX Designer",
    "Product Manager",
    "QA Specialist",
    "DevOps Engineer",
    "Data Scientist",
    "Embedded Engineer",
    "Hardware Specialist"
  ]

  const SQUAD_THEMES = [
    { name: "Fantasy Adventurers 🧙‍♂️", id: "fantasy", description: "Guilds of Mages, Rogues, and Warriors." },
    { name: "Sci-Fi Starfleets 🚀", id: "scifi", description: "Cosmic task forces exploring deep space." },
    { name: "Mighty Animals 🦁", id: "animal", description: "Apex predator alliances." },
    { name: "Neon Cyber Hackers 💻", id: "cyber", description: "Consortium of netrunners and coders." },
    { name: "Classic Numbered Squads 📋", id: "classic", description: "Professional, straightforward naming." }
  ]

  const THEME_NAMES: Record<string, { names: string[]; mottos: string[]; descriptions: string[] }> = {
    fantasy: {
      names: ["Aether Wizards", "Shadow Guild", "Crimson Paladins", "Iron Vanguard", "Dragon Sentinels", "Mystic Nomads"],
      mottos: ["Through fire and arcane knowledge!", "We strike from the unseen shadows.", "Valiance is our shield.", "Unbreakable like deep mountain stone."],
      descriptions: ["Esoteric knowledge and strategic planning.", "Agility, deception, and speed.", "Divine defense and support healing."]
    },
    scifi: {
      names: ["Hyperion Crew", "Andromeda Sector", "Nebula Raiders", "Chronos Division", "Solar Sentries"],
      mottos: ["To the edge of the universe!", "Boundless stars, unbroken vision.", "Collect, adapt, and fly."],
      descriptions: ["Interstellar intelligence and warp technology.", "Planetary colonization and resource gathering.", "Aggressive tactical squadron equipped with shields."]
    },
    animal: {
      names: ["Apex Panthers", "Grizzly Syndicate", "Viper Strike Force", "Golden Eagles", "Timber Wolves"],
      mottos: ["Unseen stalkers of the night!", "Raw power, unbreakable resolve.", "One strike, absolute resolve."],
      descriptions: ["Swift, quiet deployment and adaptation.", "Powerhouse squad built to handle workload.", "Calculated precision operations."]
    },
    cyber: {
      names: ["Netrunners Prime", "Buffer Overlords", "Quantum Daemons", "Circuit Breakers", "Zero-Day Syndicate"],
      mottos: ["We code the reality.", "Overriding limits in real time.", "Entangled in superior strategy."],
      descriptions: ["Deep-penetration security and network routing.", "Heavy-compute optimization and pipelines.", "Neural nets and mathematical regressions."]
    },
    classic: {
      names: ["Squad Alpha", "Squad Beta", "Squad Gamma", "Squad Delta", "Squad Epsilon"],
      mottos: ["First in priority, first in result.", "Synergy through continuous balance.", "The solid foundation of operations."],
      descriptions: ["Foundational core squad focused on primary execution.", "Secondary strategic squad specializing in modular support.", "Analytics and verification wing."]
    }
  }

  function handleSectionChange(secId: string) {
    setSelectedSectionId(secId)
    if (!secId) {
      setRoster([])
      return
    }

    const filtered = students.filter((s: any) => s.section_id === secId)
    const enriched = filtered.map((st: any, i: number) => ({
      id: st.id,
      name: st.name,
      email: st.email,
      registration_number: st.registration_number,
      role: POPULAR_ROLES[i % POPULAR_ROLES.length],
      skill: (i % 3) + 3,
      gender: i % 2 === 0 ? "Male" : "Female"
    }))
    setRoster(enriched)
  }

  function getGroupSectionId(group: any) {
    const memberIds = (group.group_members || []).map((member: any) => member.student_id)
    const memberSections = memberIds
      .map((memberId: string) => students.find((student: any) => student.id === memberId)?.section_id)
      .filter(Boolean)
    return memberSections.length > 0 && memberSections.every((sectionId: string) => sectionId === memberSections[0])
      ? memberSections[0]
      : null
  }

  function openGroupEditor(group: any) {
    setEditingGroup(group)
    setEditingGroupName(group.group_name || "")
    setEditingMemberIds((group.group_members || []).map((member: any) => member.student_id))
  }

  async function handleUpdateGroup() {
    if (!editingGroup || !editingGroupName.trim() || editingMemberIds.length === 0) {
      triggerToast("Enter a team name and keep at least one member", "warning")
      return
    }

    setUpdatingGroup(true)
    const result = await updateProjectGroupAction({
      groupId: editingGroup.id,
      groupName: editingGroupName,
      memberIds: editingMemberIds,
      subjectId: subject.id,
    })

    if (result.success) {
      setLocalProjects((prev) => prev.map((project: any) => ({
        ...project,
        project_groups: project.project_groups?.map((group: any) => group.id === editingGroup.id
          ? {
              ...group,
              group_name: editingGroupName.trim(),
              group_members: editingMemberIds.map((studentId) => ({
                student_id: studentId,
                users: { name: students.find((student: any) => student.id === studentId)?.name || "Student" },
              })),
            }
          : group),
      })))
      setEditingGroup(null)
      triggerToast("Team updated successfully", "success")
    } else {
      triggerToast(result.error || "Failed to update team", "warning")
    }
    setUpdatingGroup(false)
  }

  async function handleSendGroupUpdate() {
    if (!updateGroup || !groupUpdateTitle.trim() || !groupUpdateMessage.trim()) {
      triggerToast("Enter an update title and message", "warning")
      return
    }

    setSendingGroupUpdate(true)
    const result = await sendProjectGroupUpdateAction({
      groupId: updateGroup.id,
      title: groupUpdateTitle,
      message: groupUpdateMessage,
      subjectId: subject.id,
    })

    if (result.success) {
      setUpdateGroup(null)
      setGroupUpdateTitle("")
      setGroupUpdateMessage("")
      triggerToast("Update sent to the team", "success")
    } else {
      triggerToast(result.error || "Failed to send update", "warning")
    }
    setSendingGroupUpdate(false)
  }

  function handleAutoGenerateTeams() {
    if (!selectedSectionId) {
      triggerToast("Please select a section", "warning")
      return
    }

    const sectionStudents = students.filter((student: any) => student.section_id === selectedSectionId)
    if (sectionStudents.length === 0) {
      triggerToast("No students found in the selected section", "warning")
      return
    }

    const groupSize = Math.max(2, Math.min(autoGroupSize, sectionStudents.length))
    const enriched = sectionStudents.map((student: any, index: number) => ({
      ...student,
      role: POPULAR_ROLES[index % POPULAR_ROLES.length],
      skill: (index % 3) + 3,
      gender: index % 2 === 0 ? "Male" : "Female",
    }))
    const teams = []

    for (let index = 0; index < enriched.length; index += groupSize) {
      const members = enriched.slice(index, index + groupSize)
      teams.push({
        name: `Team ${teams.length + 1}`,
        description: `Automatically generated team for Section ${sectionMap.get(selectedSectionId) || "students"}.`,
        motto: "Learn together, build together.",
        memberIds: members.map((student: any) => student.id),
        synergyScore: 85,
      })
    }

    setRoster(enriched)
    setGeneratedTeams(teams)
    setSelectedStudentIds([])
    setOverallFeedback(`Created ${teams.length} teams from ${sectionStudents.length} students.`)
    triggerToast(`${teams.length} teams generated successfully`, "success")
  }

  function handleRosterUpdate(id: string, field: "role" | "skill", val: any) {
    setRoster(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m))
  }

  function handleOfflineSplit() {
    if (roster.length === 0) return
    const theme = THEME_NAMES[themeId] || THEME_NAMES.classic
    const teams = Array.from({ length: teamCount }, (_, i) => {
      const presetName = theme.names[i % theme.names.length]
      const motto = theme.mottos[i % theme.mottos.length]
      const desc = theme.descriptions[i % theme.descriptions.length]
      return {
        name: `${presetName} ${i >= theme.names.length ? Math.floor(i / theme.names.length) + 1 : ""}`.trim(),
        description: desc,
        motto,
        memberIds: [] as string[],
        synergyScore: 80 + (i % 3) * 5
      }
    })

    if (focus === "random") {
      const shuffled = [...roster].sort(() => Math.random() - 0.5)
      shuffled.forEach((m, idx) => {
        teams[idx % teamCount].memberIds.push(m.id)
      })
    } else if (focus === "skill_balance") {
      const sorted = [...roster].sort((a, b) => b.skill - a.skill)
      sorted.forEach(m => {
        let minTeam = teams[0]
        let minSkill = Infinity
        for (const t of teams) {
          const tSkill = t.memberIds.reduce((sum, id) => sum + (roster.find(r => r.id === id)?.skill || 0), 0)
          if (tSkill < minSkill) {
            minSkill = tSkill
            minTeam = t
          }
        }
        minTeam.memberIds.push(m.id)
      })
    } else {
      const rolesMap: Record<string, any[]> = {}
      roster.forEach(m => {
        if (!rolesMap[m.role]) rolesMap[m.role] = []
        rolesMap[m.role].push(m)
      })
      Object.keys(rolesMap).forEach((role, idx) => {
        rolesMap[role].forEach((m, mIdx) => {
          teams[(idx + mIdx) % teamCount].memberIds.push(m.id)
        })
      })
    }

    setGeneratedTeams(teams)
    setOverallFeedback("Offline structural split completed successfully.")
  }

  async function handleAISplit() {
    if (roster.length === 0) return
    setAllocating(true)
    const membersData = roster.map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      skill: r.skill,
      gender: r.gender
    }))

    const res = (await suggestTeamsAIAction(membersData, {
      teamCount,
      theme: themeId,
      focus
    })) as any

    if (res.success && res.data) {
      setGeneratedTeams(res.data.teams || [])
      setOverallFeedback(res.data.overallFeedback || "AI split complete.")
    } else {
      handleOfflineSplit()
    }
    setAllocating(false)
  }

  async function handlePublish() {
    if (!projectTitle.trim()) {
      alert("Please enter a project title.")
      return
    }
    if (generatedTeams.length === 0) {
      alert("No teams generated to publish.")
      return
    }

    setSaving(true)
    const result = await createProjectWithGroupsAction({
      title: projectTitle,
      description: projectDesc,
      subject_id: subject.id,
      faculty_id: facultyId,
      groups: generatedTeams
    })

    if (result.success) {
      triggerToast("Project groups published successfully!", "success")
      setProjectTitle("")
      setProjectDesc("")
      setGeneratedTeams([])
      setRoster([])
      setSelectedSectionId("")
      setAllocateTab("projects")
      // Refetch / update localProjects list
      setLocalProjects(prev => [
        {
          id: result.projectId,
          title: projectTitle,
          description: projectDesc,
          created_at: new Date().toISOString(),
          project_groups: generatedTeams.map((gt, i) => ({
            id: `new-g-${i}`,
            group_name: gt.name,
            group_members: gt.memberIds.map((mId: string) => ({
              student_id: mId,
              users: { name: roster.find(r => r.id === mId)?.name || "Student" }
            }))
          }))
        },
        ...prev
      ])
    } else {
      alert(`Failed to save: ${result.error}`)
    }
    setSaving(false)
  }

  const typeConfig = {
    'Assignment': { icon: FileText, color: 'text-[#6C63FF]', bg: 'bg-[#6C63FF]/5', border: 'border-[#6C63FF]/15', label: 'Assignment' },
    'Quiz': { icon: Brain, color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/5', border: 'border-[#8B5CF6]/15', label: 'Quiz' },
    'Coding Assignment': { icon: FileCode, color: 'text-[#38bdf8]', bg: 'bg-[#38bdf8]/5', border: 'border-[#38bdf8]/15', label: 'Coding' },
    'Material': { icon: BookOpen, color: 'text-[#00C2A8]', bg: 'bg-[#00C2A8]/5', border: 'border-[#00C2A8]/15', label: 'Material' },
    'Syllabus': { icon: Book, color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/5', border: 'border-[#f59e0b]/15', label: 'Syllabus' },
  } as any

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Banner (Bright, airy layout) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Soft radial aura */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-radial-gradient from-indigo-50/50 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <Link href="/dashboard/faculty/subjects" className="text-xs font-bold text-[#6C63FF] hover:text-[#5C53EF] flex items-center gap-1 transition-colors">
              <ArrowLeft size={14} /> Back to assigned subjects
            </Link>
            <h1 className="text-3xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans']">{subject.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-semibold mt-1">
              <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md font-['Space_Grotesk'] text-[11px] font-bold text-slate-600">{subject.code}</span>
              <span>•</span>
              <span>Teaching Sections: {sections.map(s => s.name).join(", ") || "None"}</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-150 rounded-2xl px-5 py-3 text-slate-850 flex items-center gap-4 self-start md:self-center">
            <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/5 flex items-center justify-center text-[#6C63FF]">
              <Users size={20} />
            </div>
            <div>
              <div className="text-lg font-bold font-['Space_Grotesk'] text-slate-900 leading-none">
                {students.length}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total Enrolled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu with premium pill buttons */}
      <div className="w-full bg-white/80 border border-slate-100 rounded-2xl p-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] backdrop-blur-md flex flex-wrap gap-1">
        {[
          { id: "assignments", label: "Assignments", icon: ListTodo },
          { id: "modules", label: "Modules", icon: BookOpen },
          { id: "syllabus", label: "Syllabus", icon: Book },
          { id: "evaluation", label: "Evaluation", icon: CheckCircle },
          { id: "meetings", label: "Video Classroom", icon: Video },
          { id: "announcements", label: "Stream", icon: MessageSquare },
          { id: "students", label: "Roster", icon: Users },
          { id: "attendance", label: "Attendance", icon: ClipboardList },
          { id: "grades", label: "Grades", icon: Award },
        ].map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any)
                setSelectedGradingAssignment(null)
              }}
              className={`flex-1 min-w-[100px] flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs transition-all duration-200 active:scale-95 cursor-pointer ${
                active
                  ? "bg-[#6C63FF] text-white shadow-md shadow-indigo-100"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 mr-2 ${active ? "text-white" : "text-slate-400"}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Main Body */}
      <div className="w-full">
        
        {/* Tab 1: Assignments */}
        {activeTab === "assignments" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">Coursework & Assignments</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Manage and track student assignments, quizzes, and coding tasks</p>
              </div>
              <div className="relative group self-start sm:self-auto">
                <button className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary-600)] hover:to-[var(--primary-700)] text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-sm hover:shadow-md hover:shadow-indigo-100 transition-all duration-200 active:scale-95 cursor-pointer">
                  <Plus size={14} /> Create Assignment
                </button>
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 py-1.5 overflow-hidden">
                  {(["Assignment", "Quiz", "Coding Assignment"] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setModalType(type)
                        setEditingAssignment(null)
                        setIsModalOpen(true)
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 hover:text-[#6C63FF] transition-colors cursor-pointer"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {standardAssignments.length === 0 && quizzes.length === 0 && codingAssignments.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
                <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-700 font-bold text-lg">No Assignments or Quizzes Created</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">Create course assignments, quizzes, or coding worksheets for your sections.</p>
                <button
                  onClick={() => {
                    setModalType("Assignment")
                    setIsModalOpen(true)
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Create Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {/* Standard Assignments */}
                {standardAssignments.length > 0 && (
                  <SectionGroup
                    label="Assignments"
                    items={standardAssignments}
                    type="Assignment"
                    cfg={typeConfig["Assignment"]}
                    statsFn={getSubmissionStats}
                    onEdit={(a) => { setEditingAssignment(a); setModalType(a.type); setIsModalOpen(true) }}
                    onDelete={handleDeleteAssignment}
                    formatDate={formatDueDate}
                    onGrade={(a) => { setSelectedGradingAssignment(a); setActiveTab("evaluation") }}
                  />
                )}

                {/* Quizzes */}
                {quizzes.length > 0 && (
                  <SectionGroup
                    label="Quizzes"
                    items={quizzes}
                    type="Quiz"
                    cfg={typeConfig["Quiz"]}
                    statsFn={getSubmissionStats}
                    onEdit={(a) => { setEditingAssignment(a); setModalType(a.type); setIsModalOpen(true) }}
                    onDelete={handleDeleteAssignment}
                    formatDate={formatDueDate}
                    onGrade={(a) => { setSelectedGradingAssignment(a); setActiveTab("evaluation") }}
                  />
                )}

                {/* Coding Assignments */}
                {codingAssignments.length > 0 && (
                  <SectionGroup
                    label="Coding Worksheets"
                    items={codingAssignments}
                    type="Coding Assignment"
                    cfg={typeConfig["Coding Assignment"]}
                    statsFn={getSubmissionStats}
                    onEdit={(a) => { setEditingAssignment(a); setModalType(a.type); setIsModalOpen(true) }}
                    onDelete={handleDeleteAssignment}
                    formatDate={formatDueDate}
                    onGrade={(a) => { setSelectedGradingAssignment(a); setActiveTab("evaluation") }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Modules */}
        {activeTab === "modules" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">Learning Modules & Materials</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Upload lecture slides, notes, and study resources for students</p>
              </div>
              <button
                onClick={() => {
                  setModalType("Material")
                  setEditingAssignment(null)
                  setIsModalOpen(true)
                }}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary-600)] hover:to-[var(--primary-700)] text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-sm hover:shadow-md hover:shadow-indigo-100 transition-all duration-200 active:scale-95 cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} /> Add Module
              </button>
            </div>

            {materials.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-700 font-bold text-lg">No Modules Available</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">Upload syllabus modules, lecture slides, and resource materials for this course.</p>
                <button
                  onClick={() => {
                    setModalType("Material")
                    setEditingAssignment(null)
                    setIsModalOpen(true)
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  + Add Module Now
                </button>
              </div>
            ) : (
              <SectionGroup
                label="Modules"
                items={materials}
                type="Material"
                cfg={typeConfig["Material"]}
                statsFn={getSubmissionStats}
                onEdit={(a) => { setEditingAssignment(a); setModalType(a.type); setIsModalOpen(true) }}
                onDelete={handleDeleteAssignment}
                formatDate={formatDueDate}
                onGrade={(a) => { setSelectedGradingAssignment(a); setActiveTab("grades") }}
              />
            )}
          </div>
        )}

        {/* Tab 3: Syllabus */}
        {activeTab === "syllabus" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">Course Syllabus & Curriculum</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Publish unit breakdown, course objectives, and curriculum guidelines</p>
              </div>
              <button
                onClick={() => {
                  setModalType("Syllabus")
                  setEditingAssignment(null)
                  setIsModalOpen(true)
                }}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary-600)] hover:to-[var(--primary-700)] text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-sm hover:shadow-md hover:shadow-indigo-100 transition-all duration-200 active:scale-95 cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} /> Add Syllabus
              </button>
            </div>

            {syllabusItems.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <Book className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-700 font-bold text-lg">No Syllabus Overview Yet</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">Add a syllabus overview, curriculum guidelines, or unit breakdown for this course.</p>
                <button
                  onClick={() => {
                    setModalType("Syllabus")
                    setEditingAssignment(null)
                    setIsModalOpen(true)
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  + Add Syllabus Now
                </button>
              </div>
            ) : (
              <SectionGroup
                label="Syllabus"
                items={syllabusItems}
                type="Syllabus"
                cfg={typeConfig["Syllabus"]}
                statsFn={getSubmissionStats}
                onEdit={(a) => { setEditingAssignment(a); setModalType(a.type); setIsModalOpen(true) }}
                onDelete={handleDeleteAssignment}
                formatDate={formatDueDate}
                onGrade={() => {}}
              />
            )}
          </div>
        )}

        {/* Tab 4: Evaluation */}
        {activeTab === "evaluation" && (
          <div>
            {!selectedGradingAssignment ? (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Select Coursework to Evaluate</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.filter(a => a.type !== "Material").map(a => {
                    const stats = getSubmissionStats(a.id)
                    const cfg = typeConfig[a.type] || typeConfig["Assignment"]
                    const Icon = cfg.icon
                    return (
                      <div
                        key={a.id}
                        className="bg-white border border-slate-200 hover:border-indigo-400 p-5 rounded-2xl shadow-sm transition-all flex items-center justify-between group cursor-pointer"
                        onClick={() => {
                          setSelectedGradingAssignment(a)
                          setCurrentEvalIdx(0)
                          setActiveQueueTab("pending")
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{a.title}</h3>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Max Score: {a.max_score}</span>
                              <span>•</span>
                              <span>Due {formatDueDate(a.due_date)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-700">{stats.total} submissions</span>
                            <div className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full mt-1 border border-orange-100">
                              {stats.pending} pending
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-slate-400" />
                        </div>
                      </div>
                    )
                  })}
                  {assignments.filter(a => a.type !== "Material").length === 0 && (
                    <div className="text-center py-10 bg-white border rounded-2xl text-slate-400 col-span-2">
                      No gradeable coursework has been created yet.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden h-[680px]">
                {/* Left side: Evaluation Queue */}
                <div className="w-full lg:w-80 border-r border-slate-200 flex flex-col flex-shrink-0 bg-slate-50">
                  <div className="p-4 border-b bg-white flex justify-between items-center">
                    <button
                      onClick={() => setSelectedGradingAssignment(null)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                    >
                      <ArrowLeft size={14} /> Back to List
                    </button>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full uppercase">
                      {selectedGradingAssignment.type}
                    </span>
                  </div>
                  <div className="p-4 border-b border-slate-200 bg-white space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setActiveQueueTab("pending"); setCurrentEvalIdx(0) }}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all border ${
                          activeQueueTab === "pending"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Pending ({pendingGrading.length})
                      </button>
                      <button
                        onClick={() => { setActiveQueueTab("graded"); setCurrentEvalIdx(0) }}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all border ${
                          activeQueueTab === "graded"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Graded ({gradedGrading.length})
                      </button>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>{activeGradingSubmissions.length} total submitted</span>
                      <span>{Math.round((gradedGrading.length / (activeGradingSubmissions.length || 1)) * 100)}% graded</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {activeQueueList.length === 0 && (
                      <div className="text-center py-10 text-xs text-slate-400">
                        {activeQueueTab === "pending" ? "All submissions graded! 🎉" : "No graded submissions yet."}
                      </div>
                    )}
                    {activeQueueList.map((sub, idx) => (
                      <button
                        key={sub.id}
                        onClick={() => setCurrentEvalIdx(idx)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                          currentSub?.id === sub.id
                            ? "border-indigo-600 bg-white shadow-sm"
                            : "border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 text-xs truncate">
                              {idx + 1}. {sub.studentName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5 font-mono">
                              {sub.rollNo} • Section {sub.sectionName}
                            </div>
                          </div>
                          {sub.status === "graded" && (
                            <span className="text-[10px] font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                              {sub.grade}/{selectedGradingAssignment.max_score}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}

                    {/* Not Submitted list */}
                    {activeGradingNotSubmitted.length > 0 && (
                      <div className="pt-4 mt-4 border-t border-slate-200">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                          Not Submitted ({activeGradingNotSubmitted.length})
                        </h4>
                        {activeGradingNotSubmitted.map((student) => (
                          <div key={student.id} className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/50 flex items-center gap-2 opacity-60 mb-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-600 text-[11px] truncate">{student.name}</div>
                              <div className="text-slate-400 text-[9px] font-semibold font-mono truncate">
                                {student.rollNo} • Sec {student.sectionName}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Grading Dashboard */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                  {currentSub ? (
                    <div className="flex-grow flex flex-col overflow-hidden h-full">
                      {/* Submission Info Header */}
                      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-lg">{currentSub.studentName}</h3>
                          <div className="text-xs text-slate-400 mt-0.5 font-semibold font-mono">
                            Roll No: {currentSub.rollNo} • Section: {currentSub.sectionName} • Submitted: {new Date(currentSub.submitted_at).toLocaleDateString("en-IN")}
                          </div>
                        </div>
                        {currentSub.status === "graded" && (
                          <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-green-200">
                            Score: {currentSub.grade}/{selectedGradingAssignment.max_score}
                          </span>
                        )}
                      </div>

                      {/* Playground / File Viewer / Quiz answers */}
                      <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-6">
                        {/* Coding Solution */}
                        {selectedGradingAssignment.type === "Coding Assignment" && (
                          <div className="flex-grow flex flex-col border border-slate-200 rounded-2xl overflow-hidden min-h-[300px]">
                            <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center text-white text-xs font-mono">
                              <span>solution{currentSub.language === "python" ? ".py" : currentSub.language === "javascript" ? ".js" : ".cpp"}</span>
                              <span className="uppercase text-slate-400 text-[10px]">{currentSub.language || "code"}</span>
                            </div>
                            <pre className="flex-grow bg-slate-900 p-4 text-green-400 font-mono text-xs overflow-auto text-left leading-relaxed">
                              {currentSub.code_content || "// No code content submitted"}
                            </pre>
                          </div>
                        )}

                        {/* Quiz Answers */}
                        {selectedGradingAssignment.type === "Quiz" && (
                          <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 text-sm">Quiz Results Summary (Auto Graded)</h4>
                            <div className="space-y-3">
                              {(selectedGradingAssignment.questions || []).map((q: any, qi: number) => {
                                const selectedAns = currentSub.quiz_answers?.[qi];
                                const isCorrect = selectedAns === q.answer;
                                return (
                                  <div key={qi} className={`p-4 rounded-xl border ${isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                                    <div className="text-xs font-bold text-slate-700 mb-2">Q{qi + 1}. {q.q}</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {q.options.map((opt: string, oi: number) => (
                                        <div
                                          key={oi}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                                            oi === q.answer
                                              ? "bg-green-200 border-green-300 text-green-900 font-semibold"
                                              : oi === selectedAns
                                              ? "bg-red-200 border-red-300 text-red-900"
                                              : "bg-white border-slate-100 text-slate-500"
                                          }`}
                                        >
                                          {opt}
                                          {oi === q.answer && " (Correct)"}
                                          {oi === selectedAns && oi !== q.answer && " (Selected)"}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Standard File & Text Submission */}
                        {selectedGradingAssignment.type === "Assignment" && (
                          <div className="space-y-4 flex-grow flex flex-col justify-start">
                            {/* Student Written Solution / Remarks */}
                            {(currentSub.code_content || (currentSub.status === "pending" && currentSub.feedback)) && (
                              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2 text-left">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                  <FileText size={16} className="text-[#6C63FF]" />
                                  <span>Student Written Answer / Remarks:</span>
                                </div>
                                <div className="bg-white border border-slate-200/80 rounded-xl p-4 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                                  {currentSub.code_content || currentSub.feedback}
                                </div>
                              </div>
                            )}

                            {/* Submitted Document Attachment */}
                            {currentSub.file_url && (
                              <div className="border border-slate-200 p-6 rounded-2xl text-center bg-slate-50">
                                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-bounce" />
                                <h4 className="font-bold text-slate-800">Submitted Document</h4>
                                <p className="text-xs text-slate-400 mt-1 truncate max-w-sm mx-auto">{currentSub.file_url}</p>
                                <a
                                  href={currentSub.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 font-bold rounded-xl text-xs"
                                >
                                  View / Download Attachment
                                </a>
                              </div>
                            )}

                            {/* Empty Fallback if neither exists */}
                            {!currentSub.file_url && !currentSub.code_content && (!currentSub.feedback || currentSub.status === "graded") && (
                              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed text-slate-400 text-xs">
                                No text description or file attachment was provided by the student.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Plagiarism & AI Integrity Checker */}
                        {selectedGradingAssignment.type !== "Quiz" && currentSub && aiResult && (
                          <div className="border border-slate-200/80 rounded-2xl p-5 space-y-5 bg-white/60 backdrop-blur-md shadow-xs text-left hover:shadow-sm transition-all duration-300">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                                  🛡️ Submission Integrity Scan
                                </h4>
                                <p className="text-[10px] text-slate-400">Evaluate peer copying and AI-generated probabilities</p>
                              </div>
                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                                currentSub.plagiarism_rate != null
                                  ? ((currentSub.plagiarism_rate >= 50 || currentSub.ai_probability >= 60)
                                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                                    : "bg-emerald-50 text-emerald-600 border border-emerald-100")
                                  : "bg-slate-100 text-slate-500"
                              }`}>
                                {currentSub.plagiarism_rate == null ? "NOT SCANNED" : (currentSub.plagiarism_rate >= 50 || currentSub.ai_probability >= 60) ? "FLAGGED" : "CLEAN"}
                              </span>
                            </div>

                            {currentSub.plagiarism_rate != null ? (
                              <div className="space-y-4">
                                {/* Stats Row */}
                                <div className="grid grid-cols-2 gap-3">
                                  {/* Plagiarism Overlap Card */}
                                  <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-1.5">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Peer Copying</div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-xl font-bold font-['Space_Grotesk'] text-slate-800">{currentSub.plagiarism_rate}%</span>
                                      <span className={`text-[9px] font-extrabold ${currentSub.plagiarism_rate >= 50 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {currentSub.plagiarism_rate >= 60 ? 'HIGH' : currentSub.plagiarism_rate >= 30 ? 'MOD' : 'LOW'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* AI Detection Card */}
                                  <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-1.5">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AI Content</div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-xl font-bold font-['Space_Grotesk'] text-slate-800">{currentSub.ai_probability ?? 0}%</span>
                                      <span className={`text-[9px] font-extrabold ${
                                        (currentSub.ai_probability ?? 0) >= 75 ? 'text-rose-500' : (currentSub.ai_probability ?? 0) >= 55 ? 'text-amber-500' : 'text-emerald-500'
                                      }`}>
                                        {aiResult.risk}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Overlap matched student notice */}
                                {currentSub.plagiarism_rate > 0 ? (
                                  <div className="text-[10px] text-slate-500 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 leading-normal">
                                    🚨 Peer overlap score of {currentSub.plagiarism_rate}% matched solution structure with classmates.
                                    {currentSub.matched_student ? ` Likely peer: ${currentSub.matched_student}.` : ""}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-500 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 leading-normal">
                                    ℹ️ No strong peer textual overlap was detected in the current batch. File uploads may need manual review.
                                  </div>
                                )}

                                {/* Stylometric Accordion */}
                                <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/30">
                                  <details className="group">
                                    <summary className="flex justify-between items-center p-3 text-[11px] font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition select-none list-none [&::-webkit-details-marker]:hidden">
                                      <span className="flex items-center gap-1.5">📊 Linguistic Stylometric Signature</span>
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" />
                                    </summary>
                                    <div className="p-3.5 border-t border-slate-100 space-y-3 bg-white/40">
                                      {/* Lexical Diversity */}
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[10px]">
                                          <span className="text-slate-500 font-medium">Lexical Diversity (Vocabulary richness)</span>
                                          <span className="font-bold text-slate-700">{aiResult.lexicalScore}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100/80 rounded-full h-1.5">
                                          <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${aiResult.lexicalScore}%` }} />
                                        </div>
                                      </div>

                                      {/* Sentence Length Variation */}
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[10px]">
                                          <span className="text-slate-500 font-medium">Burstiness (Sentence variation)</span>
                                          <span className="font-bold text-slate-700">{aiResult.burstinessScore}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100/80 rounded-full h-1.5">
                                          <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${aiResult.burstinessScore}%` }} />
                                        </div>
                                      </div>

                                      {/* Repetition */}
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[10px]">
                                          <span className="text-slate-500 font-medium">Linguistic Repetition (Clarity Index)</span>
                                          <span className="font-bold text-slate-700">{aiResult.repetitionScore}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100/80 rounded-full h-1.5">
                                          <div className="h-1.5 rounded-full bg-teal-500" style={{ width: `${aiResult.repetitionScore}%` }} />
                                        </div>
                                      </div>

                                      {/* Stylometry */}
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[10px]">
                                          <span className="text-slate-500 font-medium">Stylometry (Average word length match)</span>
                                          <span className="font-bold text-slate-700">{aiResult.stylometryScore}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100/80 rounded-full h-1.5">
                                          <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${aiResult.stylometryScore}%` }} />
                                        </div>
                                      </div>

                                      {/* Punctuation */}
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[10px]">
                                          <span className="text-slate-500 font-medium">Punctuation Signature (Writing footprint)</span>
                                          <span className="font-bold text-slate-700">{aiResult.punctuationScore}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100/80 rounded-full h-1.5">
                                          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${aiResult.punctuationScore}%` }} />
                                        </div>
                                      </div>

                                      <p className="text-[9px] text-slate-400 pt-1 leading-normal italic">
                                        * Scores closer to 100% indicate highly natural human-like variations. AI models generate text with extremely low burstiness, highly repetitive structure, and low punctuation variance.
                                      </p>
                                    </div>
                                  </details>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-5 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                                Click below to run plagiarism matches & stylometric AI analysis
                              </div>
                            )}

                            <button
                              onClick={async () => {
                                setIsScanningPlagiarism(true)
                                try {
                                  const res = await runPlagiarismScanAction(currentSub.id)
                                  if (res.success) {
                                    triggerToast("Integrity scan complete!", "success")
                                    setLocalSubmissions(prev =>
                                      prev.map(s =>
                                        s.id === currentSub.id
                                          ? {
                                              ...s,
                                              plagiarism_rate: res.plagiarismRate ?? 0,
                                              ai_probability: res.aiProbability ?? 0,
                                              matched_student: res.matchedStudent ?? "None",
                                              verification_status: ((res.plagiarismRate ?? 0) >= 50 || (res.aiProbability ?? 0) >= 60) ? "FLAGGED" : "CLEAN",
                                              integrity_note: res.note ?? null,
                                            }
                                          : s
                                      )
                                    )
                                  } else {
                                    alert("Plagiarism scan failed: " + res.error)
                                  }
                                } catch (err) {
                                  console.error("Scan error:", err)
                                } finally {
                                  setIsScanningPlagiarism(false)
                                }
                              }}
                              disabled={isScanningPlagiarism}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5"
                            >
                              {isScanningPlagiarism ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running Integrity Scan...
                                  </>
                                ) : (
                                  "Run Integrity Scan"
                                )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Grading Input Form */}
                      <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-end gap-4 flex-shrink-0">
                        <div className="w-28">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Grade / Score</label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={selectedGradingAssignment.max_score}
                              value={scoreInput}
                              onChange={e => setScoreInput(e.target.value)}
                              placeholder="Score"
                              className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-3 py-2 text-sm font-extrabold text-slate-800"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-400">/{selectedGradingAssignment.max_score}</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Faculty Feedback Remarks (To Student)</label>
                          <input
                            type="text"
                            value={feedbackInput}
                            onChange={e => setFeedbackInput(e.target.value)}
                            placeholder="Add evaluation remarks for the student..."
                            className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-700"
                          />
                        </div>
                        <button
                          onClick={handleSaveGrade}
                          disabled={isSavingGrade || !scoreInput}
                          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                        >
                          {isSavingGrade ? "Saving..." : "Save Grade"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                      <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 mb-3">
                        <CheckCircle size={24} />
                      </div>
                      <h4 className="font-bold text-slate-800">All Checked!</h4>
                      <p className="text-xs text-slate-400 mt-1">There are no pending submissions for this filter.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Grades */}
        {activeTab === "grades" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Gradebook</h3>
                  <p className="text-xs text-slate-500 mt-1">All students in the selected section are fixed rows. Add columns to track grade components, exams, or skill checks.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Section</label>
                    <select
                      value={selectedGradeSection}
                      onChange={(e) => setSelectedGradeSection(e.target.value)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
                    >
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Weight unit</label>
                    <select
                      value={gradeWeightMode}
                      onChange={(e) => setGradeWeightMode(e.target.value as "percentage" | "marks")}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="percentage">% (percentage)</option>
                      <option value="marks">Marks</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGradePrintModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                  >
                    <Printer size={14} className="text-[#6C63FF]" /> Print Marksheet
                  </button>
                  <button
                    onClick={handleAddGradeColumn}
                    className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all"
                  >
                    Add Column
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto bg-white border border-slate-200 rounded-3xl shadow-sm">
              <table className="min-w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200">Student</th>
                    <th className="px-4 py-3 border-b border-slate-200">Email</th>
                    {assignmentGradeColumns.map((col) => (
                      <th key={col.id} className="px-4 py-3 border-b border-slate-200 align-top min-w-[180px]">
                        <div className="space-y-2">
                          <div className="rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-900">
                            {col.label}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-[0.12em]">Max {col.max_score}</span>
                            <input
                              type="number"
                              min={0}
                              max={gradeWeightMode === "percentage" ? 100 : undefined}
                              value={col.weight}
                              onChange={(e) => handleAssignmentColumnWeightChange(col.id, Number(e.target.value))}
                              className="w-20 bg-white border border-slate-200 rounded-2xl px-2 py-1 text-[10px] font-semibold text-slate-900 focus:border-indigo-400 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400">{gradeWeightMode === "marks" ? "marks" : "%"}</span>
                          </div>
                        </div>
                      </th>
                    ))}
                    {customGradeColumns.map((col) => (
                      <th key={col.id} className="px-4 py-3 border-b border-slate-200 align-top min-w-[180px]">
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={col.label}
                            onChange={(e) => handleGradeColumnLabelChange(col.id, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-[11px] font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                          />
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-slate-500 font-semibold">Weight</label>
                              <input
                                type="number"
                                min={0}
                                max={gradeWeightMode === "percentage" ? 100 : undefined}
                                value={col.weight}
                                onChange={(e) => handleGradeColumnWeightChange(col.id, Number(e.target.value))}
                                className="w-20 bg-white border border-slate-200 rounded-2xl px-2 py-1 text-[10px] font-semibold text-slate-900 focus:border-indigo-400 focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-400">{gradeWeightMode === "marks" ? "marks" : "%"}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGradeColumn(col.id)}
                              className="self-start rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                              aria-label={`Remove ${col.label} column`}
                            >
                              Remove column
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 border-b border-slate-200">
                      <div className="space-y-2">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Total {gradeWeightMode === "marks" ? "marks" : "%"}</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-sm">
                  {gradebookStudents.length > 0 ? (
                    gradebookStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 text-sm">{student.name}</div>
                          <div className="text-[10px] text-slate-400 mt-1">Section {sectionMap.get(student.section_id) || "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-slate-500 font-mono">{student.email}</td>
                        {assignmentGradeColumns.map((col) => (
                          <td key={col.id} className="px-4 py-3">
                            <div className="text-[11px] text-slate-800 font-semibold">
                              {getAssignmentGradeForStudent(student.id, col.id) ?? "-"}
                            </div>
                          </td>
                        ))}
                        {customGradeColumns.map((col) => (
                          <td key={col.id} className="px-4 py-3">
                            <input
                              type="text"
                              value={gradeValues[student.id]?.[col.id] || ""}
                              onChange={(e) => handleGradeValueChange(student.id, col.id, e.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] text-slate-700 focus:border-indigo-400 focus:outline-none"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {computeStudentTotal(student.id)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3 + assignmentGradeColumns.length + customGradeColumns.length} className="px-4 py-10 text-center text-slate-400 text-xs">
                        No students enrolled in this section.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Announcements Feed */}
        {activeTab === "announcements" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <span className="font-bold text-sm">FA</span>
                </div>
                <div className="flex-1">
                  <textarea
                    className="w-full text-slate-700 placeholder-slate-400 border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-2xl p-4 text-sm"
                    rows={3}
                    placeholder="Share an update, homework details, or syllabus overview with your students..."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handlePostAnnouncement}
                      disabled={isPostingAnnouncement || !announcementText.trim()}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Send size={12} /> Post Announcement
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {announcementsList.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl text-slate-400">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">No announcements posted</h4>
                <p className="text-xs text-slate-400 mt-1">Updates you post will show up here and in the students' Stream.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcementsList.map((ann) => (
                  <div key={ann.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-4 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0 font-bold text-xs uppercase">
                      {facultyName.substring(0, 2)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-center">
                        <h4 className="font-extrabold text-slate-800 text-sm">{facultyName}</h4>
                        <div className="text-[10px] text-slate-400 font-semibold">
                          {new Date(ann.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 font-normal leading-relaxed mt-2 whitespace-pre-wrap">{ann.description}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAssignment(ann.id)}
                      className="text-slate-300 hover:text-red-500 p-1"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Student Directory */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 border-b bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-800">Assigned Student Roster</h3>
                  <p className="text-xs text-slate-500 mt-1">View enrolled students or manage section project group allocation from one place.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStudentPanelTab("students")}
                    className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
                      studentPanelTab === "students"
                        ? "bg-[#6C63FF] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Roster
                  </button>
                  <button
                    onClick={() => setStudentPanelTab("project_groups")}
                    className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
                      studentPanelTab === "project_groups"
                        ? "bg-[#6C63FF] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Project Groups
                  </button>
                </div>
              </div>

              {studentPanelTab === "students" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                        <th className="px-6 py-3">Student Name</th>
                        <th className="px-6 py-3">University Email</th>
                        <th className="px-6 py-3">Section</th>
                        <th className="px-6 py-3">Submission Record</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((student) => {
                        const studentSubs = submissions.filter(s => s.student_id === student.id)
                        const gradedCount = studentSubs.filter(s => s.status === "graded").length
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">
                                  {student.name.split(" ").map((n: string) => n[0]).join("")}
                                </div>
                                <span className="font-bold text-slate-800 text-xs">{student.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-500 font-mono">{student.email}</td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                                Section {sectionMap.get(student.section_id) || "N/A"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-slate-600">
                                {studentSubs.length} submitted ({gradedCount} graded)
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                      {students.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-slate-400 text-xs">
                            No students are enrolled in the sections assigned to this course.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-6 p-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Project Group Allocation</h4>
                        <p className="text-xs text-slate-500 mt-1">Create and inspect group allocations for students in a specific section.</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-1">
                        <button
                          onClick={() => setAllocateTab("projects")}
                          className={`rounded-xl px-3 py-1 text-[10px] font-bold transition ${
                            allocateTab === "projects"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Projects
                        </button>
                        <button
                          onClick={() => setAllocateTab("allocate")}
                          className={`rounded-xl px-3 py-1 text-[10px] font-bold transition ${
                            allocateTab === "allocate"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          New Allocate
                        </button>
                        <button
                          onClick={() => setAllocateTab("auto")}
                          className={`rounded-xl px-3 py-1 text-[10px] font-bold transition ${
                            allocateTab === "auto"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Auto Generate
                        </button>
                      </div>
                    </div>

                    {allocateTab === "auto" ? (
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
                          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <Layers size={16} className="text-indigo-600" />
                            Generate Teams Automatically
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 mb-5">
                            Select a section and group size. Every student in that section will be placed into a team.
                          </p>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Section
                              </label>
                              <select
                                value={selectedSectionId}
                                onChange={(e) => handleSectionChange(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:border-indigo-500 focus:outline-none"
                              >
                                <option value="">Choose section...</option>
                                {sections.map((sec) => (
                                  <option key={sec.id} value={sec.id}>
                                    Section {sec.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Students per group
                              </label>
                              <input
                                type="number"
                                min={2}
                                max={roster.length || 100}
                                value={autoGroupSize}
                                onChange={(e) => setAutoGroupSize(Math.max(2, parseInt(e.target.value) || 2))}
                                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:border-indigo-500 focus:outline-none"
                              />
                            </div>

                            <button
                              onClick={handleAutoGenerateTeams}
                              disabled={!selectedSectionId}
                              className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                            >
                              <Layers size={16} />
                              Generate Teams
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">Generated Teams</h4>
                              <p className="text-xs text-slate-500 mt-1">Review the allocation before publishing.</p>
                            </div>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                              {generatedTeams.length} teams
                            </span>
                          </div>
                          {generatedTeams.length === 0 ? (
                            <p className="py-10 text-center text-sm text-slate-400">No teams generated yet.</p>
                          ) : (
                            <div className="space-y-2 max-h-[360px] overflow-y-auto">
                              {generatedTeams.map((team: any, index: number) => (
                                <div key={`${team.name}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-bold text-slate-800">{team.name}</span>
                                    <span className="text-xs font-semibold text-slate-500">{team.memberIds.length} students</span>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {team.memberIds.map((id: string) => roster.find((student: any) => student.id === id)?.name).filter(Boolean).join(", ")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={handlePublish}
                            disabled={saving || generatedTeams.length === 0 || !projectTitle.trim()}
                            className="mt-5 w-full rounded-2xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 text-sm font-bold transition-all shadow-sm"
                          >
                            Publish Generated Teams
                          </button>
                        </div>
                      </div>
                    ) : allocateTab === "allocate" ? (
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-5">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                              <Users size={16} className="text-indigo-600" />
                              Create New Team
                            </h4>

                            <div className="space-y-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  Select Target Section
                                </label>
                                <select
                                  value={selectedSectionId}
                                  onChange={(e) => handleSectionChange(e.target.value)}
                                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                                >
                                  <option value="">Choose section...</option>
                                  {sections.map((sec) => (
                                    <option key={sec.id} value={sec.id}>
                                      Section {sec.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  Team Name *
                                </label>
                                <input
                                  type="text"
                                  value={teamName}
                                  onChange={(e) => setTeamName(e.target.value)}
                                  placeholder="e.g. Team Alpha, Project Heroes..."
                                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  Maximum Team Size *
                                </label>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="number"
                                    min={2}
                                    max={roster.length || 12}
                                    value={maxTeamSize}
                                    onChange={(e) => setMaxTeamSize(Math.max(2, parseInt(e.target.value) || 2))}
                                    className="flex-1 rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                                  />
                                  <span className="text-xs font-bold text-slate-500 px-3 py-2 bg-white rounded-xl border border-slate-200">
                                    {selectedStudentIds.length}/{maxTeamSize}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Selected students cannot exceed this size
                                </p>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  Project Title
                                </label>
                                <input
                                  type="text"
                                  value={projectTitle}
                                  onChange={(e) => setProjectTitle(e.target.value)}
                                  placeholder="Enter project name..."
                                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  Project Description / Instructions
                                </label>
                                <textarea
                                  rows={3}
                                  value={projectDesc}
                                  onChange={(e) => setProjectDesc(e.target.value)}
                                  placeholder="Describe the project goals, deliverables, and expectations..."
                                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-5">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Users size={16} className="text-indigo-600" />
                                Select Students
                              </h4>
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                                {selectedStudentIds.length} / {maxTeamSize}
                              </span>
                            </div>

                            {loadingRoster ? (
                              <div className="py-8 text-center text-sm text-slate-400">
                                Loading students...
                              </div>
                            ) : roster.length === 0 ? (
                              <div className="py-8 text-center text-sm text-slate-400">
                                Select a section on the left to see student list
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[450px] overflow-y-auto">
                                {roster.map((student) => {
                                  const isSelected = selectedStudentIds.includes(student.id)
                                  const canSelect = !isSelected || selectedStudentIds.length < maxTeamSize

                                  return (
                                    <label
                                      key={student.id}
                                      className={`flex items-center gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                                        isSelected
                                          ? "border-indigo-200 bg-indigo-50"
                                          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
                                      } ${!canSelect && !isSelected ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          if (isSelected) {
                                            setSelectedStudentIds(prev => prev.filter(id => id !== student.id))
                                          } else if (selectedStudentIds.length < maxTeamSize) {
                                            setSelectedStudentIds(prev => [...prev, student.id])
                                          }
                                        }}
                                        disabled={!canSelect && !isSelected}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{student.name}</p>
                                        <p className="text-xs text-slate-400 truncate">{student.email}</p>
                                      </div>
                                      {isSelected && (
                                        <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded-lg flex-shrink-0">
                                          ✓
                                        </span>
                                      )}
                                    </label>
                                  )
                                })}
                              </div>
                            )}

                            {selectedStudentIds.length >= maxTeamSize && (
                              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold">
                                ⚠ Team is full. Max size ({maxTeamSize}) reached.
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              onClick={async () => {
                                if (!teamName.trim() || selectedStudentIds.length === 0 || !projectTitle.trim()) {
                                  triggerToast("Please fill in team name, select students, and enter project title", "warning")
                                  return
                                }
                                if (!selectedSectionId) {
                                  triggerToast("Please select a section", "warning")
                                  return
                                }

                                setSaving(true)
                                const newTeam = {
                                  name: teamName.trim(),
                                  description: projectDesc.trim() || "Group project work",
                                  motto: `Team: ${teamName}`,
                                  memberIds: selectedStudentIds,
                                  synergyScore: 85
                                }

                                setGeneratedTeams(prev => [...prev, newTeam])
                                triggerToast(`Team "${teamName}" created with ${selectedStudentIds.length} member(s)!`, "success")

                                setTeamName("")
                                setSelectedStudentIds([])
                                setMaxTeamSize(4)
                                setSaving(false)
                              }}
                              disabled={saving || !selectedSectionId || selectedStudentIds.length === 0 || !teamName.trim()}
                              className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                            >
                              <Plus size={16} />
                              Add This Team
                            </button>

                            {generatedTeams.length > 0 && (
                              <>
                                <button
                                  onClick={() => {
                                    if (!projectTitle.trim()) {
                                      triggerToast("Please enter a project title", "warning")
                                      return
                                    }
                                    handlePublish()
                                  }}
                                  disabled={saving || generatedTeams.length === 0 || !projectTitle.trim()}
                                  className="w-full rounded-2xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                  <Sparkles size={16} />
                                  Publish All Teams ({generatedTeams.length})
                                </button>

                                <button
                                  onClick={() => {
                                    setGeneratedTeams([])
                                    setSelectedStudentIds([])
                                    setTeamName("")
                                    triggerToast("All teams cleared. Start fresh.", "info")
                                  }}
                                  className="w-full rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 text-xs font-bold transition-all"
                                >
                                  Clear All Teams
                                </button>
                              </>
                            )}

                            {generatedTeams.length > 0 && (
                              <div className="mt-6 pt-6 border-t border-slate-200">
                                <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                                  <FolderKanban size={16} className="text-indigo-600" />
                                  Teams to Publish ({generatedTeams.length})
                                </h4>

                                <div className="grid gap-4 sm:grid-cols-2">
                                  {generatedTeams.map((team: any, idx: number) => {
                                    return (
                                      <div key={idx} className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                          <div>
                                            <h5 className="font-bold text-slate-800 text-sm">{team.name}</h5>
                                            <p className="text-xs text-slate-500 mt-0.5">{team.memberIds.length} members</p>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setGeneratedTeams(prev => prev.filter((_, i) => i !== idx))
                                              triggerToast("Team removed", "info")
                                            }}
                                            className="text-slate-300 hover:text-red-500 p-1 transition"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>

                                        <div className="space-y-2">
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Members</p>
                                            <div className="mt-1 space-y-1">
                                              {team.memberIds.slice(0, 3).map((memberId: string, mIdx: number) => {
                                                const member = roster.find((s: any) => s.id === memberId)
                                                return (
                                                  <p key={mIdx} className="text-xs text-slate-600 truncate">
                                                    • {member?.name}
                                                  </p>
                                                )
                                              })}
                                              {team.memberIds.length > 3 && (
                                                <p className="text-xs text-slate-400 italic">
                                                  +{team.memberIds.length - 3} more
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">Created Teams</h4>
                            <p className="mt-1 text-xs text-slate-500">Choose a section to view its teams.</p>
                          </div>
                          <select
                            value={projectSectionFilter}
                            onChange={(e) => setProjectSectionFilter(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                          >
                            <option value="all">All sections</option>
                            {sections.map((section) => (
                              <option key={section.id} value={section.id}>Section {section.name}</option>
                            ))}
                          </select>
                        </div>

                        {localProjects.length === 0 ? (
                          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                            <FolderKanban className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
                            <h3 className="mt-4 text-base font-semibold text-slate-900">No project groups created yet</h3>
                            <p className="mt-2 text-sm text-slate-500">Switch to the "New Allocate" tab to split project teams for a section.</p>
                          </div>
                        ) : (
                          localProjects.map((proj) => {
                            const visibleGroups = (proj.project_groups || []).filter((group: any) =>
                              projectSectionFilter === "all" || getGroupSectionId(group) === projectSectionFilter
                            )

                            if (visibleGroups.length === 0) return null

                            return (
                              <div key={proj.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-4">
                                  <h3 className="text-lg font-bold text-slate-900">{proj.title}</h3>
                                  <p className="mt-1 text-sm text-slate-500">{proj.description}</p>
                                </div>
                                <div className="divide-y divide-slate-100 border-t border-slate-100">
                                  {visibleGroups.map((group: any, groupIndex: number) => (
                                    <div key={group.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex min-w-0 items-start gap-3">
                                        <span className="w-6 shrink-0 pt-0.5 text-xs font-bold text-slate-400">{groupIndex + 1}.</span>
                                        <div className="min-w-0">
                                          <p className="font-bold text-slate-800">{group.group_name}</p>
                                          <p className="mt-1 truncate text-xs font-medium text-slate-400">
                                            {(group.group_members || []).map((member: any) => member.users?.name || "Student").join(", ") || "No members"}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-2 pl-9 sm:pl-0">
                                        <button
                                          onClick={() => openGroupEditor(group)}
                                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                                        >
                                          <Pencil size={13} /> Edit team
                                        </button>
                                        <button
                                          onClick={() => setUpdateGroup(group)}
                                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
                                        >
                                          <Send size={13} /> Send update
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "meetings" && (
          <div className="space-y-6 text-left">
            {/* Top meeting launch bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.01)] backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#6C63FF] flex items-center justify-center flex-shrink-0">
                      <Video size={16} />
                    </div>
                    <span>Start Live Interactive Lecture</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-2.5 leading-relaxed font-sans font-medium">
                    Instantly launch a virtual class meeting room with drawing whiteboard, screen recorder, participant breakout groups, and live chat. Students enrolled in this subject will get a prominent join notification banner instantly.
                  </p>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Enter lecture title (e.g. DFS/BFS Algorithms)"
                    id="instant-meet-title"
                    className="flex-grow bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition-all"
                  />
                  <select
                    id="instant-meet-section"
                    className="bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer transition-all"
                  >
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const title = (document.getElementById("instant-meet-title") as HTMLInputElement)?.value || ""
                      const sectionId = (document.getElementById("instant-meet-section") as HTMLSelectElement)?.value || ""
                      handleStartInstantMeeting(title, sectionId)
                    }}
                    disabled={isStartingMeeting}
                    className="px-6 py-2.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary-600)] hover:to-[var(--primary-700)] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:shadow-indigo-100 transition-all duration-200 active:scale-95 cursor-pointer flex-shrink-0"
                  >
                    {isStartingMeeting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
                    Start Class
                  </button>
                </div>
              </div>

              {/* Schedule meeting box */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.01)] flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                      <Calendar size={14} />
                    </div>
                    <span>Schedule Class Call</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-normal font-sans font-medium">
                    Schedule a future video lecture slot. Upcoming slots will be rendered on student calendars.
                  </p>
                </div>

                <button
                  onClick={() => setIsCreateMeetingModalOpen(true)}
                  className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Schedule New Lecture
                </button>
              </div>
            </div>

            {/* List of active and upcoming lectures */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Classroom Lecture Logs</h3>
                <span className="text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1 rounded-full">
                  {localMeetings.length} Scheduled/Completed
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {localMeetings.map((m) => {
                  const sectName = sectionMap.get(m.section_id) || "N/A"
                  const startStr = m.scheduled_start ? new Date(m.scheduled_start).toLocaleString() : new Date(m.started_at).toLocaleString()
                  return (
                    <div key={m.id} className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${m.is_active ? "bg-red-500 animate-pulse" : "bg-slate-300"}`} />
                          <h4 className="font-extrabold text-sm text-slate-800">{m.title}</h4>
                          <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-lg">
                            Section {sectName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-semibold font-sans">
                          Lecture Type: <span className="capitalize">{m.meeting_type}</span> • Starts: {startStr}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {m.is_active ? (
                          <>
                            <a
                              href={`/meetings/${m.meeting_code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-all"
                            >
                              Join Live Class
                            </a>
                            <button
                              onClick={() => handleEndMeeting(m.id)}
                              className="px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-bold rounded-xl transition-all"
                            >
                              End Class
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">Class Concluded</span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {localMeetings.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <Video className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No video lectures have been conducted or scheduled yet for this subject.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Attendance */}
        {activeTab === "attendance" && (
          <div className="space-y-6 text-left">
            {/* Future Date Alert */}
            {isFutureAttendanceDate && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>Attendance cannot be logged for future dates. Please select today or an earlier date.</span>
              </div>
            )}

            {/* Conflict Warning Banner */}
            {attendanceConflict?.isConflict && !isFutureAttendanceDate && (
              <div className="rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-200/70 border border-amber-300 px-2 py-0.5 rounded-full">
                        Slot Conflict Detected
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Recorded by <strong className="text-indigo-700">{attendanceConflict.loggedByFacultyName}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Attendance for this slot was originally logged for{" "}
                      <strong className="text-slate-800">{attendanceConflict.loggedSubjectName || attendanceConflict.loggedSubjectCode || "Subject"}</strong>.
                      Saving will prompt you to confirm overwriting.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAttendanceOverwriteModalOpen(true)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition shrink-0"
                >
                  Review Overwrite
                </button>
              </div>
            )}

            {sessionNotice && !isFutureAttendanceDate && !attendanceConflict?.isConflict && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs font-semibold text-indigo-700 flex items-center gap-2">
                <AlertCircle size={16} />
                {sessionNotice}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              {/* Header with Title, stats and inline filter dropdowns */}
              <div className="p-6 border-b bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <ClipboardList className="text-indigo-600" size={18} /> Mark Course Attendance
                  </h3>
                  {filteredStudents.length > 0 && (
                    <p className="text-[11px] font-semibold text-slate-500 mt-1 font-sans">
                      {markedCount} of {totalStudents} marked ({completionPercent}%) • {presentCount} Present • {absentCount} Absent • {lateCount} Late
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Section Select */}
                  <div>
                    <select
                      value={selectedSection}
                      onChange={(e) => {
                        setSelectedSection(e.target.value)
                        setAttendance({})
                      }}
                      className="border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 bg-white outline-none cursor-pointer shadow-2xs"
                    >
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Input with MAX today */}
                  <div>
                    <input
                      type="date"
                      value={selectedDate}
                      max={todayIso}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 bg-white outline-none shadow-2xs"
                    />
                  </div>

                  {/* Period Select */}
                  <div>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 bg-white outline-none cursor-pointer shadow-2xs"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                        <option key={p} value={String(p)}>
                          Period {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Actions Row */}
              {filteredStudents.length > 0 && (
                <div className="px-6 py-3 bg-slate-50/30 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleMarkAllPresent}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 text-[10px] font-extrabold rounded-lg transition-all"
                    >
                      Mark All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendance({})}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 text-[10px] font-extrabold rounded-lg transition-all"
                    >
                      Reset Marking
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-extrabold rounded-lg flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <Printer size={12} className="text-[#6C63FF]" /> Print Roll Sheet
                    </button>
                  </div>
                </div>
              )}

              {/* Table of Students Roster */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">University Email</th>
                      <th className="px-6 py-3">Registration Number</th>
                      <th className="px-6 py-3 text-right">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => {
                      const currentStatus = attendance[student.id]
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">
                                {student.name.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-800 text-xs">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-500 font-mono">{student.email}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{student.registration_number || "—"}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {[
                                { value: "Present", color: "bg-emerald-500", activeStyle: "bg-emerald-500 text-white border-emerald-500 ring-2 ring-emerald-200" },
                                { value: "Absent", color: "bg-rose-500", activeStyle: "bg-rose-500 text-white border-rose-500 ring-2 ring-rose-200" },
                                { value: "Late", color: "bg-amber-500", activeStyle: "bg-amber-500 text-white border-amber-500 ring-2 ring-amber-200" },
                                { value: "Approved Absence", color: "bg-[#6C63FF]", activeStyle: "bg-[#6C63FF] text-white border-[#6C63FF] ring-2 ring-indigo-200", label: "Approved" },
                              ].map((s) => (
                                <button
                                  key={s.value}
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, s.value)}
                                  className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all border ${
                                    currentStatus === s.value
                                      ? s.activeStyle
                                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  {s.label || s.value}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    })}

                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center text-slate-400 text-xs font-bold">
                          No students enrolled in Section {sections.find(s => s.id === selectedSection)?.name || ""}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Save Bar */}
              {filteredStudents.length > 0 && (
                <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Printer size={13} className="text-[#6C63FF]" />
                    Print Roll Sheet
                  </button>

                  <button
                    onClick={handleSaveAttendance}
                    disabled={isSaving || isFutureAttendanceDate}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={14} />}
                    {isFutureAttendanceDate ? "Future Date Disabled" : "Save Attendance"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Printable Sheet Modal for Course Attendance */}
        <AttendancePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          programName="Course Program"
          semesterName="Current Semester"
          sectionName={sections.find((s) => s.id === selectedSection)?.name || "Current Section"}
          subjectName={subject.name}
          periodName={selectedPeriod ? `Period ${selectedPeriod}` : "Period 1"}
          date={selectedDate}
          students={filteredStudents}
          attendance={attendance}
          notes={{}}
          sessionNotes=""
          trainerName="Faculty Trainer"
        />

        {/* Attendance Conflict / Overwrite Modal */}
        <AttendanceOverwriteModal
          isOpen={isAttendanceOverwriteModalOpen}
          onClose={() => setIsAttendanceOverwriteModalOpen(false)}
          onConfirmOverwrite={executeAttendanceSave}
          isSaving={isSaving}
          sectionName={sections.find((s) => s.id === selectedSection)?.name || "Section"}
          periodName={selectedPeriod ? `Period ${selectedPeriod}` : "Period 1"}
          date={selectedDate}
          loggedByFacultyName={attendanceConflict?.loggedByFacultyName || "Another Faculty"}
          loggedByFacultyEmail={attendanceConflict?.loggedByFacultyEmail}
          loggedSubjectName={attendanceConflict?.loggedSubjectName || subject.name}
          loggedSubjectCode={attendanceConflict?.loggedSubjectCode || subject.code}
          loggedSessionNotes={attendanceConflict?.loggedSessionNotes}
          currentFacultyName={facultyName}
        />

        {/* Printable Marksheet Modal for Faculty Gradebook */}
        <GradebookPrintModal
          isOpen={isGradePrintModalOpen}
          onClose={() => setIsGradePrintModalOpen(false)}
          subjectName={subject.name}
          subjectCode={subject.code}
          sectionName={sections.find((s) => s.id === selectedGradeSection)?.name || "Default"}
          facultyName={facultyName}
          academicTerm="Academic Session 2026"
          gradeWeightMode={gradeWeightMode}
          assignmentColumns={assignmentGradeColumns}
          customColumns={customGradeColumns}
          students={gradebookStudents}
          assignmentGrades={assignmentGradesByStudent}
          customGrades={gradeValues}
        />
      </div>

      {/* Schedule Meeting Modal */}
      {isCreateMeetingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-slate-100 shadow-2xl relative">
            <button
              onClick={() => setIsCreateMeetingModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
            <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" /> Schedule Video Class Call
            </h3>
            
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lecture Title</label>
                <input
                  type="text"
                  value={meetTitle}
                  onChange={(e) => setMeetTitle(e.target.value)}
                  placeholder="e.g. Operating Systems - Threading"
                  className="w-full border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Section</label>
                <select
                  value={meetSectionId}
                  onChange={(e) => setMeetSectionId(e.target.value)}
                  className="w-full border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 bg-white cursor-pointer"
                >
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Time</label>
                  <input
                    type="datetime-local"
                    value={meetStart}
                    onChange={(e) => setMeetStart(e.target.value)}
                    className="w-full border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">End Time</label>
                  <input
                    type="datetime-local"
                    value={meetEnd}
                    onChange={(e) => setMeetEnd(e.target.value)}
                    className="w-full border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => setIsCreateMeetingModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleMeeting}
                disabled={isStartingMeeting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
              >
                {isStartingMeeting && <Loader2 size={12} className="animate-spin" />}
                Schedule Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit team</h3>
                <p className="mt-1 text-xs text-slate-500">Update the team name or its members.</p>
              </div>
              <button onClick={() => setEditingGroup(null)} className="text-slate-400 hover:text-slate-700" title="Close edit team">
                <X size={18} />
              </button>
            </div>
            <input
              value={editingGroupName}
              onChange={(e) => setEditingGroupName(e.target.value)}
              className="mt-5 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-indigo-500"
              placeholder="Team name"
            />
            <div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-100 p-3">
              {students.map((student: any) => (
                <label key={student.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editingMemberIds.includes(student.id)}
                    onChange={() => setEditingMemberIds((prev) => prev.includes(student.id)
                      ? prev.filter((id) => id !== student.id)
                      : [...prev, student.id])}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-700">{student.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditingGroup(null)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
              <button
                onClick={handleUpdateGroup}
                disabled={updatingGroup}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {updatingGroup ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {updateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Send team update</h3>
                <p className="mt-1 text-xs text-slate-500">Send a notification to {updateGroup.group_name}.</p>
              </div>
              <button onClick={() => setUpdateGroup(null)} className="text-slate-400 hover:text-slate-700" title="Close team update">
                <X size={18} />
              </button>
            </div>
            <input
              value={groupUpdateTitle}
              onChange={(e) => setGroupUpdateTitle(e.target.value)}
              className="mt-5 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-indigo-500"
              placeholder="Update title"
            />
            <textarea
              rows={5}
              value={groupUpdateMessage}
              onChange={(e) => setGroupUpdateMessage(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500"
              placeholder="Write your update..."
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setUpdateGroup(null)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
              <button
                onClick={handleSendGroupUpdate}
                disabled={sendingGroupUpdate}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {sendingGroupUpdate ? "Sending..." : "Send update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Toast Alert overlay */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md ${
            toast.type === "success"
              ? "bg-emerald-50/95 border-emerald-200 text-emerald-900"
              : toast.type === "warning"
              ? "bg-amber-50/95 border-amber-200 text-amber-900"
              : "bg-indigo-50/95 border-indigo-200 text-indigo-900"
          }`}>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
              toast.type === "success"
                ? "bg-emerald-100 text-emerald-700"
                : toast.type === "warning"
                ? "bg-amber-100 text-amber-700"
                : "bg-indigo-100 text-indigo-700"
            }`}>
              <CheckCircle2 size={16} />
            </div>
            <span className="text-xs font-bold leading-snug">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition-colors ml-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Worksheet Creation Modal */}
      {isModalOpen && (
        <CreateWorksheetModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          subjectId={subject.id}
          facultyId={facultyId}
          initialType={modalType}
          sections={sections}
          editingAssignment={editingAssignment}
        />
      )}
    </div>
  )
}

/* Helper Component: Section Group list */
function SectionGroup({
  label,
  items,
  type,
  cfg,
  statsFn,
  onEdit,
  onDelete,
  formatDate,
  onGrade,
}: {
  label: string
  items: Array<any>
  type: string
  cfg: any
  statsFn: (id: string) => { total: number, graded: number, pending: number }
  onEdit: (a: any) => void
  onDelete: (id: string) => void
  formatDate: (d: string | null) => string
  onGrade: (a: any) => void
}) {
  const Icon = cfg.icon
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg ${cfg.bg} ${cfg.color} flex items-center justify-center flex-shrink-0`}>
          <Icon size={16} />
        </div>
        <h3 className={`text-xs font-extrabold uppercase tracking-wider ${cfg.color}`}>{label}</h3>
        <span className="text-xs text-slate-400 font-bold">({items.length})</span>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const stats = statsFn(item.id)
          return (
            <div key={item.id} className="group bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-slate-800 text-sm truncate">{item.title}</h4>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] font-semibold text-slate-400">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    {(type !== "Material" && type !== "Syllabus" && item.due_date) && (
                      <span className="flex items-center gap-1 font-medium"><Calendar size={12} /> Due {formatDate(item.due_date)}</span>
                    )}
                    {((type === "Material" || type === "Syllabus") && item.created_at) && (
                      <span className="flex items-center gap-1 font-medium"><Calendar size={12} /> Posted {formatDate(item.created_at)}</span>
                    )}
                    <span className="font-medium">Assigned to: {item.section_ids?.map((sid: string) => sid.substring(0, 4)).join(", ") || "All"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 ml-4">
                {(type !== "Material" && type !== "Syllabus") && (
                  <div className="flex items-center gap-2">
                    {stats.pending > 0 && (
                      <span className="text-[10px] font-extrabold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                        {stats.pending} pending
                      </span>
                    )}
                    {stats.graded > 0 && (
                      <span className="text-[10px] font-extrabold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                        {stats.graded} graded
                      </span>
                    )}
                    {stats.total === 0 && (
                      <span className="text-[10px] font-extrabold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                        0 submissions
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {(type !== "Material" && type !== "Syllabus") && stats.total > 0 && (
                    <button
                      onClick={() => onGrade(item)}
                      className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 text-xs font-bold rounded-xl transition-all"
                    >
                      Evaluate
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(item)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Worksheet Modal implementation */
interface CreateWorksheetModalProps {
  isOpen: boolean
  onClose: () => void
  subjectId: string
  facultyId: string
  initialType: "Assignment" | "Quiz" | "Coding Assignment" | "Material" | "Syllabus"
  sections: Array<{ id: string; name: string }>
  editingAssignment?: any | null
}

function CreateWorksheetModal({
  isOpen,
  onClose,
  subjectId,
  facultyId,
  initialType,
  sections,
  editingAssignment,
}: CreateWorksheetModalProps) {
  const [type, setType] = useState<"Assignment" | "Quiz" | "Coding Assignment" | "Material" | "Syllabus">(initialType)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [dueTime, setDueTime] = useState("23:59")
  const [maxScore, setMaxScore] = useState(100)
  const [targetSectionIds, setTargetSectionIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Upload states for Faculty attachments
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [fileName, setFileName] = useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const uploadFileToSupabase = async (file: File) => {
    setIsUploadingFile(true)
    setFileName(file.name)
    try {
      const bucketName = "assignments"
      const filePath = `faculty-${facultyId}/${Date.now()}_${file.name}`
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file)

      if (error) {
        throw error
      }

      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath)
      setUploadedFiles(prev => [...prev, publicData.publicUrl])
    } catch (err: any) {
      console.warn("Storage upload failed, falling back to mock storage URL:", err.message)
      setUploadedFiles(prev => [...prev, `https://mock-lms-storage.local/faculty-${facultyId}/${Date.now()}_${file.name}`])
    } finally {
      setIsUploadingFile(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFileToSupabase(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFileToSupabase(e.target.files[0])
    }
  }


  // Quiz Builder states
  const [quizQuestions, setQuizQuestions] = useState<Array<{ q: string; options: string[]; answer: number }>>([
    { q: "", options: ["", "", "", ""], answer: 0 },
  ])

  // Coding states
  const [language, setLanguage] = useState("python")
  const [testCases, setTestCases] = useState<Array<{ input: string; output: string }>>([
    { input: "", output: "" },
  ])

  useEffect(() => {
    if (editingAssignment) {
      setType(editingAssignment.type)
      setTitle(editingAssignment.title)
      setDescription(editingAssignment.description || "")
      setTargetSectionIds(editingAssignment.section_ids || [])
      setMaxScore(editingAssignment.max_score || 100)
      setUploadedFiles(editingAssignment.files || [])
      
      if (editingAssignment.due_date) {
        const d = new Date(editingAssignment.due_date)
        setDueDate(d.toISOString().split("T")[0])
        setDueTime(d.toTimeString().substring(0, 5))
      }

      if (editingAssignment.questions) {
        setQuizQuestions(editingAssignment.questions)
      }
      if (editingAssignment.language) {
        setLanguage(editingAssignment.language)
      }
      if (editingAssignment.test_cases) {
        setTestCases(editingAssignment.test_cases)
      }
    } else {
      setType(initialType)
      setTitle("")
      setDescription("")
      setDueDate("")
      setDueTime("23:59")
      setMaxScore(100)
      setTargetSectionIds(sections.map(s => s.id)) // default assign to all sections
      setQuizQuestions([{ q: "", options: ["", "", "", ""], answer: 0 }])
      setLanguage("python")
      setTestCases([{ input: "", output: "" }])
      setUploadedFiles([])
    }
  }, [editingAssignment, initialType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || targetSectionIds.length === 0) {
      alert("Please provide a title and select at least one target section.")
      return
    }

    setIsSubmitting(true)
    const fullDueDateStr = (type === "Material" || type === "Syllabus") ? null : (dueDate ? `${dueDate}T${dueTime}:00` : null)

    const data = {
      subject_id: subjectId,
      faculty_id: facultyId,
      title: title.trim(),
      description: description.trim(),
      due_date: fullDueDateStr,
      type,
      max_score: type === "Material" || type === "Syllabus" ? 0 : maxScore,
      questions: type === "Quiz" ? quizQuestions : null,
      language: type === "Coding Assignment" ? language : null,
      test_cases: type === "Coding Assignment" ? testCases : null,
      section_ids: targetSectionIds,
      files: uploadedFiles,
    }

    let res
    if (editingAssignment) {
      res = await updateAssignmentAction(editingAssignment.id, subjectId, data)
    } else {
      res = await createAssignmentAction(data)
    }

    setIsSubmitting(false)
    if (res.success) {
      onClose()
    } else {
      alert("Error saving assignment: " + res.error)
    }
  }

  const handleToggleSection = (sectionId: string) => {
    if (targetSectionIds.includes(sectionId)) {
      setTargetSectionIds(targetSectionIds.filter(id => id !== sectionId))
    } else {
      setTargetSectionIds([...targetSectionIds, sectionId])
    }
  }

  const activeConfig = typeConfig[type] || typeConfig["Assignment"]
  const TypeIcon = activeConfig.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto font-sans text-left">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${activeConfig.bg} flex items-center justify-center`}>
              <TypeIcon className={`w-4 h-4 ${activeConfig.color}`} />
            </div>
            <h2 className="font-extrabold text-slate-800 text-base">
              {editingAssignment ? "Edit" : "Create"} {type}
            </h2>
          </div>
          <button onClick={onClose} type="button" className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
          
          {/* Form fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Worksheet 1: Stack implementation"
                className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-800"
              />
            </div>

            {(type !== "Material" && type !== "Syllabus") && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Due Time</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={e => setDueTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Score</label>
                  <input
                    type="number"
                    min={1}
                    value={maxScore}
                    onChange={e => setMaxScore(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-800"
                  />
                </div>
              </>
            )}

            {/* Target Sections */}
            <div className={(type === "Material" || type === "Syllabus") ? "col-span-2" : ""}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Sections <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2 py-1">
                {sections.map((sec) => {
                  const isSelected = targetSectionIds.includes(sec.id)
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleToggleSection(sec.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      Section {sec.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Type-specific Fields */}
          {type === "Assignment" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Instructions</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Paste homework guidelines, PDF links, or general instructions..."
                  className="w-full border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl p-4 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Guidelines / Worksheet Files</label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    dragOver
                      ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
                      : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30"
                  }`}
                >
                  <Paperclip className={`w-6 h-6 mx-auto mb-2 transition-colors ${dragOver ? "text-indigo-500" : "text-slate-300"}`} />
                  <p className="text-xs text-slate-500 font-bold">
                    {dragOver ? "Drop file to attach" : "Drag & drop files here"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">or click to browse from files</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {isUploadingFile && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600 font-semibold">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Uploading {fileName}...</span>
                  </div>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span className="text-xs text-indigo-800 font-semibold flex-1 truncate">
                          {url.startsWith("https://mock-lms-storage.local/") 
                            ? url.substring(url.lastIndexOf("/") + 1)
                            : url}
                        </span>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setUploadedFiles(prev => prev.filter((_, i) => i !== idx)); }}
                          className="text-indigo-300 hover:text-red-500 transition-colors p-0.5 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex gap-2.5 text-emerald-800 text-xs">
                <AlertCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <p>Students can write text answers or upload attachments (e.g. PDF/DOCX) when submitting standard assignments.</p>
              </div>
            </div>
          )}

          {(type === "Material" || type === "Syllabus") && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {type === "Syllabus" ? "Syllabus Overview" : "Resource Details"}
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={type === "Syllabus"
                    ? "Paste syllabus summary, curriculum outline, or key course modules..."
                    : "Paste resource descriptions, links to external drives, slides or notes..."
                  }
                  className="w-full border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl p-4 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {type === "Syllabus" ? "Syllabus Attachments" : "Resource File Attachments (Slides, Notes)"}
                </label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    dragOver
                      ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
                      : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30"
                  }`}
                >
                  <Paperclip className={`w-6 h-6 mx-auto mb-2 transition-colors ${dragOver ? "text-indigo-500" : "text-slate-300"}`} />
                  <p className="text-xs text-slate-500 font-bold">
                    {dragOver ? "Drop file to attach" : "Drag & drop files here"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">or click to browse from files</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {isUploadingFile && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600 font-semibold">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Uploading {fileName}...</span>
                  </div>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span className="text-xs text-indigo-800 font-semibold flex-1 truncate">
                          {url.startsWith("https://mock-lms-storage.local/") 
                            ? url.substring(url.lastIndexOf("/") + 1)
                            : url}
                        </span>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setUploadedFiles(prev => prev.filter((_, i) => i !== idx)); }}
                          className="text-indigo-300 hover:text-red-500 transition-colors p-0.5 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quiz Builder */}
          {type === "Quiz" && (
            <div className="space-y-5">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border">
                <span className="text-xs font-extrabold text-slate-700">Quiz Question Builder</span>
                <button
                  type="button"
                  onClick={() => setQuizQuestions([...quizQuestions, { q: "", options: ["", "", "", ""], answer: 0 }])}
                  className="px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all"
                >
                  <Plus size={12} /> Add Question
                </button>
              </div>
              <div className="space-y-4">
                {quizQuestions.map((q, qi) => (
                  <div key={qi} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm space-y-3 relative">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-xs">{qi + 1}</span>
                      <input
                        type="text"
                        placeholder="Enter quiz question..."
                        required
                        value={q.q}
                        onChange={e => {
                          const updated = [...quizQuestions]
                          updated[qi].q = e.target.value
                          setQuizQuestions(updated)
                        }}
                        className="flex-grow bg-transparent border-b border-slate-200 focus:border-violet-500 focus:outline-none text-sm text-slate-800 py-1"
                      />
                      {quizQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setQuizQuestions(quizQuestions.filter((_, idx) => idx !== qi))}
                          className="text-slate-300 hover:text-red-500 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 transition-all ${q.answer === oi ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...quizQuestions]
                              updated[qi].answer = oi
                              setQuizQuestions(updated)
                            }}
                            className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${q.answer === oi ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}
                          >
                            {q.answer === oi && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </button>
                          <input
                            type="text"
                            placeholder={`Option ${oi + 1}`}
                            required
                            value={opt}
                            onChange={e => {
                              const updated = [...quizQuestions]
                              updated[qi].options[oi] = e.target.value
                              setQuizQuestions(updated)
                            }}
                            className="bg-transparent border-0 text-xs text-slate-700 focus:outline-none flex-grow"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coding Worksheets */}
          {type === "Coding Assignment" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Problem Statement / Constraints</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Define standard input/outputs, example solutions, constraint ranges..."
                  className="w-full border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl p-4 text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Primary Language Template</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-800"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                  </select>
                </div>
              </div>

              {/* Test Cases */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border">
                  <span className="text-xs font-extrabold text-slate-700">Test Cases (Auto-evaluated)</span>
                  <button
                    type="button"
                    onClick={() => setTestCases([...testCases, { input: "", output: "" }])}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Plus size={12} /> Add Case
                  </button>
                </div>
                <div className="space-y-3">
                  {testCases.map((tc, idx) => (
                    <div key={idx} className="bg-slate-900 border rounded-2xl p-4 grid grid-cols-2 gap-3 relative text-white">
                      <div>
                        <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Input params</label>
                        <input
                          type="text"
                          required
                          value={tc.input}
                          onChange={e => {
                            const updated = [...testCases]
                            updated[idx].input = e.target.value
                            setTestCases(updated)
                          }}
                          placeholder="e.g. 5, 10"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="pr-8">
                        <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Expected Output</label>
                        <input
                          type="text"
                          required
                          value={tc.output}
                          onChange={e => {
                            const updated = [...testCases]
                            updated[idx].output = e.target.value
                            setTestCases(updated)
                          }}
                          placeholder="e.g. 15"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      {testCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setTestCases(testCases.filter((_, idx2) => idx2 !== idx))}
                          className="absolute right-3 top-7 p-1 text-slate-500 hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              {isSubmitting ? "Saving..." : editingAssignment ? "Update coursework" : "Create coursework"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const typeConfig = {
  'Assignment': { icon: FileText, color: 'text-[#6C63FF]', bg: 'bg-[#6C63FF]/5', border: 'border-[#6C63FF]/15', activeBg: 'bg-[#6C63FF]', label: 'Assignment' },
  'Quiz': { icon: Brain, color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/5', border: 'border-[#8B5CF6]/15', activeBg: 'bg-[#8B5CF6]', label: 'Quiz' },
  'Coding Assignment': { icon: FileCode, color: 'text-[#38bdf8]', bg: 'bg-[#38bdf8]/5', border: 'border-[#38bdf8]/15', activeBg: 'bg-[#38bdf8]', label: 'Coding' },
  'Material': { icon: BookOpen, color: 'text-[#00C2A8]', bg: 'bg-[#00C2A8]/5', border: 'border-[#00C2A8]/15', activeBg: 'bg-[#00C2A8]', label: 'Material' },
  'Syllabus': { icon: Book, color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/5', border: 'border-[#f59e0b]/15', activeBg: 'bg-[#f59e0b]', label: 'Syllabus' },
} as any
