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
  Star
} from "lucide-react"

import {
  createAssignmentAction,
  updateAssignmentAction,
  deleteAssignmentAction,
  gradeSubmissionAction,
  runPlagiarismScanAction
} from "@/app/actions/assignments"
import {
  createMeetingAction,
  endMeetingAction
} from "@/app/actions/meetings"
import { detectAIContent } from "@/lib/ai-detector"
import { supabase } from "@/lib/supabase"
import {
  getExistingAttendanceAction,
  saveAttendanceAction
} from "@/app/dashboard/faculty/attendance/actions"
import {
  createProjectWithGroupsAction,
  getSubjectStudentsAction,
  suggestTeamsAIAction
} from "@/app/actions/project-groups"

type FacultyTab = "assignments" | "modules" | "syllabus" | "grades" | "students" | "meetings" | "attendance" | "groups" | "announcements"

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
  submissions: Array<any>
  students: Array<any>
  meetings: Array<any>
  projects: Array<any>
}

export function FacultySubjectDetailClient({
  facultyId,
  facultyName,
  institutionId,
  subject,
  sections,
  assignments,
  submissions,
  students,
  meetings,
  projects,
}: FacultySubjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<FacultyTab>("assignments")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<FacultyWorksheetType>("Assignment")
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null)

  // Project groups states
  const [localProjects, setLocalProjects] = useState(projects)
  const [selectedSectionId, setSelectedSectionId] = useState("")
  const [projectTitle, setProjectTitle] = useState("")
  const [projectDesc, setProjectDesc] = useState("")
  
  // Roster details
  const [roster, setRoster] = useState<any[]>([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  
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
  const [allocateTab, setAllocateTab] = useState<"projects" | "allocate">("projects")

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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)

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
        setSessionNotice("Existing attendance found for this session. You can edit and save it again.")
      } else {
        setAttendance({})
        setSessionNotice(null)
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

  const handleSaveAttendance = async () => {
    if (!selectedSection || !selectedDate || !selectedPeriod) {
      triggerToast("Please set section, date, and period.", "warning")
      return
    }
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
    if (result.success) {
      triggerToast("Attendance saved successfully!", "success")
      setSessionNotice("Existing attendance found for this session. You can edit and save it again.")
    } else {
      triggerToast(result.error || "Failed to save attendance.", "warning")
    }
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
  const announcementsList = assignments.filter(a => a.type === "Material" && !a.due_date)
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
    
    // An announcement is stored as a Material with no due date and assigned to all sections
    const sectionIds = sections.map(s => s.id)
    const res = await createAssignmentAction({
      subject_id: subject.id,
      faculty_id: facultyId,
      title: `${subject.name} Announcement`,
      description: announcementText.trim(),
      due_date: null,
      type: "Material",
      max_score: 0,
      questions: null,
      language: null,
      test_cases: null,
      section_ids: sectionIds,
      files: null
    })

    setIsPostingAnnouncement(false)
    if (res.success) {
      setAnnouncementText("")
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
      setScoreInput(currentSub.grade != null ? String(currentSub.grade) : "")
      setFeedbackInput(currentSub.feedback || "")
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 bg-white/80 border border-slate-100 rounded-2xl p-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] backdrop-blur-md flex flex-wrap gap-1">
          {[
            { id: "assignments", label: "Assignments", icon: ListTodo },
            { id: "modules", label: "Modules", icon: BookOpen },
            { id: "syllabus", label: "Syllabus", icon: Book },
            { id: "grades", label: "Evaluation", icon: Award },
            { id: "meetings", label: "Video Classroom", icon: Video },
            { id: "announcements", label: "Stream", icon: MessageSquare },
            { id: "students", label: "Roster", icon: Users },
            { id: "attendance", label: "Attendance", icon: ClipboardList },
            { id: "groups", label: "Project Groups", icon: FolderKanban },
          ].map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  setSelectedGradingAssignment(null)
                }}
                className={`flex-1 min-w-[100px] flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs transition-all duration-200 active:scale-95 ${
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

        {(activeTab === "assignments" || activeTab === "syllabus") && (
          <div className="relative group self-start md:self-center">
            <button className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] hover:from-[#5C53EF] hover:to-[#7B4CE6] text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-sm hover:shadow-md hover:shadow-indigo-100 transition-all duration-200 active:scale-95">
              <Plus size={14} /> Create Coursework
            </button>
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 py-1.5 overflow-hidden">
              {(["Assignment", "Quiz", "Coding Assignment", "Material", "Syllabus"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setModalType(type)
                    setEditingAssignment(null)
                    setIsModalOpen(true)
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 hover:text-[#6C63FF] transition-colors"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="w-full">
        
        {/* Tab 1: Assignments */}
        {activeTab === "assignments" && (
          <div className="space-y-8">
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
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
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
                    onGrade={(a) => { setSelectedGradingAssignment(a); setActiveTab("grades") }}
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
                    onGrade={(a) => { setSelectedGradingAssignment(a); setActiveTab("grades") }}
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
                    onGrade={(a) => { setSelectedGradingAssignment(a); setActiveTab("grades") }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Modules */}
        {activeTab === "modules" && (
          <div className="space-y-6">
            {materials.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-700 font-bold text-lg">No Modules Available</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">Upload syllabus modules, lecture slides, and resource materials for this course.</p>
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
            {syllabusItems.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
                <Book className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-700 font-bold text-lg">No Syllabus Overview Yet</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">Post a syllabus overview or curriculum guide using the Stream tab to populate this section.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {syllabusItems.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Book size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{item.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 truncate">{item.description || "Syllabus overview resource"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{item.due_date ? `Due ${formatDueDate(item.due_date)}` : "No due date"}</span>
                      <span className="font-semibold text-indigo-600">Syllabus</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Grades & Evaluation */}
        {activeTab === "grades" && (
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

                        {/* Standard File Submission */}
                        {selectedGradingAssignment.type === "Assignment" && (
                          <div className="space-y-4 flex-grow flex flex-col justify-center">
                            {currentSub.file_url ? (
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
                            ) : (
                              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed text-slate-400">
                                Text entry solution:
                                <p className="mt-3 p-4 bg-white border border-slate-200 rounded-xl text-left font-sans text-xs text-slate-700 font-normal">
                                  {currentSub.feedback || "No text description provided by student."}
                                </p>
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
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Feedback Notes</label>
                          <input
                            type="text"
                            value={feedbackInput}
                            onChange={e => setFeedbackInput(e.target.value)}
                            placeholder="Add evaluation remarks..."
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
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Assigned Student Roster</h3>
              <span className="text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1 rounded-full">
                {students.length} Students
              </span>
            </div>
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
          </div>
        )}

        {/* Tab 5: Video Classroom */}
        {activeTab === "meetings" && (
          <div className="space-y-6 text-left">
            {/* Top meeting launch bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-gradient-to-br from-indigo-900 to-indigo-950 border border-indigo-800 rounded-3xl p-6 shadow-sm text-white flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-extrabold flex items-center gap-2">
                    <Video size={20} className="text-indigo-400" /> Start Live Interactive Lecture
                  </h3>
                  <p className="text-xs text-indigo-200 mt-2 leading-relaxed font-sans font-normal">
                    Instantly launch a virtual class meeting room with drawing whiteboard, screen recorder, participant breakout groups, and live chat. Students enrolled in this subject will get a prominent join notification banner instantly.
                  </p>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Enter lecture title (e.g. DFS/BFS Algorithms)"
                    id="instant-meet-title"
                    className="flex-grow bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 rounded-xl px-4 py-2 text-xs font-bold text-white placeholder-indigo-300 outline-none"
                  />
                  <select
                    id="instant-meet-section"
                    className="bg-indigo-950 border border-white/20 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none cursor-pointer"
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
                    className="px-6 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    {isStartingMeeting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
                    Start Class
                  </button>
                </div>
              </div>

              {/* Schedule meeting box */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <Calendar size={16} className="text-slate-500" /> Schedule Class Call
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-normal font-sans font-normal">
                    Schedule a future video lecture slot. Upcoming slots will be rendered on student calendars.
                  </p>
                </div>

                <button
                  onClick={() => setIsCreateMeetingModalOpen(true)}
                  className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all"
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
            {sessionNotice && (
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
                      className="border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 bg-white outline-none cursor-pointer"
                    >
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Input */}
                  <div>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-850 outline-none"
                    />
                  </div>

                  {/* Period Select */}
                  <div>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 bg-white outline-none cursor-pointer"
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
                <div className="px-6 py-3 bg-slate-50/30 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMarkAllPresent}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 text-[10px] font-extrabold rounded-lg transition-all"
                    >
                      Mark All Present
                    </button>
                    <button
                      onClick={() => setAttendance({})}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 text-[10px] font-extrabold rounded-lg transition-all"
                    >
                      Reset Marking
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
                            <div className="flex items-center justify-end gap-2">
                              {[
                                { value: "Present", color: "bg-emerald-500", activeStyle: "bg-emerald-500 text-white border-emerald-500 ring-2 ring-emerald-200 ring-offset-1" },
                                { value: "Absent", color: "bg-rose-500", activeStyle: "bg-rose-500 text-white border-rose-500 ring-2 ring-rose-200 ring-offset-1" },
                                { value: "Late", color: "bg-amber-500", activeStyle: "bg-amber-500 text-white border-amber-500 ring-2 ring-amber-200 ring-offset-1" },
                              ].map((s) => (
                                <button
                                  key={s.value}
                                  onClick={() => handleStatusChange(student.id, s.value)}
                                  className={`rounded-xl px-4 py-1.5 text-xs font-extrabold transition-all border ${
                                    currentStatus === s.value
                                      ? s.activeStyle
                                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  {s.value}
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
                <div className="border-t border-slate-200 px-6 py-4 flex justify-end bg-slate-50/50">
                  <button
                    onClick={handleSaveAttendance}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={14} />}
                    Save Attendance
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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

      {/* Tab 7: Project Groups Allocation Workspace */}
      {activeTab === "groups" && (
        <div className="grid gap-8 lg:grid-cols-12 text-left">
          {/* Settings panel */}
          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm font-black text-slate-800">Allocation Workspace</span>
                <div className="flex gap-1.5 bg-slate-100 p-0.5 rounded-xl">
                  <button
                    onClick={() => setAllocateTab("projects")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                      allocateTab === "projects"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Projects
                  </button>
                  <button
                    onClick={() => setAllocateTab("allocate")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                      allocateTab === "allocate"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    New Allocate
                  </button>
                </div>
              </div>

              {allocateTab === "allocate" ? (
                <div className="space-y-5">
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
                      Project Description
                    </label>
                    <textarea
                      rows={3}
                      value={projectDesc}
                      onChange={(e) => setProjectDesc(e.target.value)}
                      placeholder="Brief description..."
                      className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Target Squad Count
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={teamCount}
                      onChange={(e) => setTeamCount(parseInt(e.target.value) || 2)}
                      className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Designation Theme
                    </label>
                    <select
                      value={themeId}
                      onChange={(e) => setThemeId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      {SQUAD_THEMES.map(theme => (
                        <option key={theme.id} value={theme.id}>
                          {theme.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Balance Focus
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFocus("skill_balance")}
                        className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold transition border ${
                          focus === "skill_balance"
                            ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        Skill Balanced
                      </button>
                      <button
                        onClick={() => setFocus("role_distribution")}
                        className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold transition border ${
                          focus === "role_distribution"
                            ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        Role Distributed
                      </button>
                      <button
                        onClick={() => setFocus("random")}
                        className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold transition border ${
                          focus === "random"
                            ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        Random
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      onClick={handleAISplit}
                      disabled={roster.length === 0 || allocating}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      <Sparkles size={16} />
                      {allocating ? "Allocating..." : "Allocate via Gemini AI"}
                    </button>

                    <button
                      onClick={handleOfflineSplit}
                      disabled={roster.length === 0}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Manual Offline Split
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 leading-normal">
                    Click "View groups" on any active project on the right side to inspect team segregation metrics, synergy values, and mottos.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Results Pane */}
          <div className="space-y-6 lg:col-span-8">
            {allocateTab === "allocate" ? (
              <>
                {/* Roster profiles table */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-800 text-sm">Roster Profiles</h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                      {roster.length} students enrolled
                    </span>
                  </div>

                  {loadingRoster ? (
                    <div className="py-12 text-center text-sm text-slate-400">Loading student roster...</div>
                  ) : roster.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      Select a section on the left to configure roles & skill ratings.
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-2xl">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {roster.map((student) => (
                            <tr key={student.id}>
                              <td className="px-4 py-2 font-semibold text-slate-800">{student.name}</td>
                              <td className="px-4 py-2">
                                <select
                                  value={student.role}
                                  onChange={(e) => handleRosterUpdate(student.id, "role", e.target.value)}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none"
                                >
                                  {POPULAR_ROLES.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  value={student.skill}
                                  onChange={(e) => handleRosterUpdate(student.id, "skill", parseInt(e.target.value) || 3)}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none"
                                >
                                  <option value="1">1 Star</option>
                                  <option value="2">2 Stars</option>
                                  <option value="3">3 Stars</option>
                                  <option value="4">4 Stars</option>
                                  <option value="5">5 Stars</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Allocation Preview results */}
                {generatedTeams.length > 0 && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">Allocation Preview</h3>
                        <p className="mt-1 text-xs text-slate-500">{overallFeedback}</p>
                      </div>
                      <button
                        onClick={handlePublish}
                        disabled={saving}
                        className="rounded-2xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                      >
                        {saving ? "Publishing..." : "Publish Allocation"}
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {generatedTeams.map((team, idx) => (
                        <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-black text-slate-850">{team.name}</span>
                            {team.synergyScore && (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                                <Star size={10} className="fill-emerald-600" />
                                {team.synergyScore}% Synergy
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 italic mb-3">"{team.motto}"</p>
                          
                          <div className="space-y-1.5 mt-4">
                            {team.memberIds.map((memId: string) => {
                              const student = roster.find(r => r.id === memId)
                              if (!student) return null
                              return (
                                <div key={memId} className="flex items-center justify-between rounded-xl bg-white p-2 border border-slate-100 text-xs">
                                  <span className="font-semibold text-slate-700">{student.name}</span>
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                    {student.role}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Projects Tab Right Panel List */
              <div className="space-y-4">
                {localProjects.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                    <FolderKanban className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
                    <h3 className="mt-4 text-base font-semibold text-slate-900">No project groups created yet</h3>
                    <p className="mt-2 text-sm text-slate-500">Switch to the "New Allocate" tab on the left to split groups.</p>
                  </div>
                ) : (
                  localProjects.map((proj) => (
                    <div key={proj.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{proj.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">{proj.description}</p>
                          <p className="mt-2 text-xs text-slate-400">Created: {new Date(proj.created_at).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => setExpandedProjId(expandedProjId === proj.id ? null : proj.id)}
                          className="rounded-xl border border-slate-100 px-4 py-2 text-xs font-semibold hover:bg-slate-50"
                        >
                          {expandedProjId === proj.id ? "Hide details" : "View groups"}
                        </button>
                      </div>

                      {expandedProjId === proj.id && (
                        <div className="mt-6 border-t border-slate-100 pt-6">
                          <div className="grid gap-6 sm:grid-cols-2">
                            {proj.project_groups?.map((group: any) => (
                              <div key={group.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3">
                                  {group.group_name}
                                </h4>
                                <div className="space-y-2">
                                  {group.group_members?.map((member: any, mIdx: number) => (
                                    <div key={mIdx} className="flex flex-col rounded-xl bg-white p-2 text-xs border border-slate-100">
                                      <span className="font-semibold text-slate-700">{member.users?.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Local Toast Alert overlay */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slide-in max-w-sm text-white">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="text-xs font-bold">{toast.message}</span>
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
                    <span className="flex items-center gap-1 font-medium"><Calendar size={12} /> Due {formatDate(item.due_date)}</span>
                    <span className="font-medium">Assigned to: {item.section_ids?.map((sid: string) => sid.substring(0, 4)).join(", ") || "All"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 ml-4">
                {type !== "Material" && (
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
                  {type !== "Material" && stats.total > 0 && (
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
    const fullDueDateStr = dueDate ? `${dueDate}T${dueTime}:00` : null

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

            {type !== "Material" && (
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
            )}

            {/* Target Sections */}
            <div className={type === "Material" ? "col-span-2" : ""}>
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
