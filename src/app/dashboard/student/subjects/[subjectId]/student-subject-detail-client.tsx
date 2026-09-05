"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  MessageSquare,
  ListTodo,
  Users,
  FileCode,
  CheckCircle2,
  Clock,
  FileText,
  Megaphone,
  Download,
  Eye,
  Brain,
  Book,
  BookOpen,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Calendar,
  ChevronRight,
  UserRound,
  Video,
  Play,
  ClipboardList,
  FolderKanban,
  Star,
  Printer,
  X
} from "lucide-react"
import StudentGradePrintModal from "@/modules/gradebook/components/StudentGradePrintModal"
import { replyToAnnouncementAction } from "@/app/actions/announcements"
import { supabase } from "@/lib/supabase"

interface StudentSubjectDetailClientProps {
  studentId: string
  studentName: string
  studentSectionId: string
  subject: {
    id: string
    name: string
    code: string
  }
  facultyName: string
  assignments: Array<any>
  submissions: Array<any>
  classmates: Array<any>
  meetings: Array<any>
  attendanceEntries: Array<any>
  attendanceSummary: any
  projectGroups: Array<any>
  subjectAnnouncements: Array<any>
  gradeColumns?: Array<any>
  gradeEntries?: Array<any>
}

export function StudentSubjectDetailClient({
  studentId,
  studentName,
  studentSectionId,
  subject,
  facultyName,
  assignments,
  submissions,
  classmates,
  meetings,
  attendanceEntries,
  attendanceSummary,
  projectGroups,
  subjectAnnouncements,
  gradeColumns = [],
  gradeEntries = [],
}: StudentSubjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"assignments" | "modules" | "syllabus" | "grades" | "meetings" | "stream" | "people" | "attendance" | "groups">("assignments")
  const [isStudentGradePrintModalOpen, setIsStudentGradePrintModalOpen] = useState(false)
  const [localSubjectAnnouncements, setLocalSubjectAnnouncements] = useState<any[]>(subjectAnnouncements)
  const [replyTextByAnnouncement, setReplyTextByAnnouncement] = useState<Record<string, string>>({})
  const [isReplying, setIsReplying] = useState<Record<string, boolean>>({})

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type })
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Real-time meetings state for active classroom classes
  const [localMeetings, setLocalMeetings] = useState<any[]>(meetings)

  useEffect(() => {
    setLocalMeetings(meetings)
  }, [meetings])

  useEffect(() => {
    setLocalSubjectAnnouncements(subjectAnnouncements)
  }, [subjectAnnouncements])

  useEffect(() => {
    const channel = supabase
      .channel("student_live_meetings")
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

  // Merge announcements (materials with no due date) and other materials into Stream
  const legacyAnnouncements = assignments.filter(a => a.type === "Material" && !a.due_date)
  const materialsList = assignments.filter(a => a.type === "Material" && a.due_date)

  const streamItems = [
    ...localSubjectAnnouncements.map(a => ({ kind: "announcement" as const, id: a.id, date: a.created_at, data: a, source: "announcement" as const })),
    ...legacyAnnouncements.map(a => ({ kind: "announcement" as const, id: a.id, date: a.created_at, data: a, source: "legacy" as const })),
    ...materialsList.map(m => ({ kind: "material" as const, id: m.id, date: m.created_at, data: m })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const assignmentItems = assignments.filter(item => item.type !== "Material" && item.type !== "Syllabus")
  const moduleItems = assignments.filter(item => item.type === "Material")
  const syllabusItems = assignments.filter(item => item.type === "Syllabus")

  const gradeValueMap = React.useMemo(() => {
    const map: Record<string, string | null> = {}
    ;(gradeEntries || []).forEach((entry: any) => {
      if (entry?.column_id) {
        map[entry.column_id] = entry.score != null ? String(entry.score) : null
      }
    })
    return map
  }, [gradeEntries])

  const gradeSummary = React.useMemo(() => {
    const validColumns = (gradeColumns || []).filter((column: any) => Number(column.max_score || 0) > 0)
    const graded = validColumns.filter((column: any) => gradeValueMap[column.id] != null && gradeValueMap[column.id] !== "")
    const totalScore = validColumns.reduce((sum, column: any) => {
      const value = Number(gradeValueMap[column.id] ?? 0)
      if (!Number.isFinite(value)) return sum
      return sum + Math.min(value, Number(column.max_score || 0))
    }, 0)
    const totalMax = validColumns.reduce((sum, column: any) => sum + Number(column.max_score || 0), 0)
    const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0

    return {
      totalColumns: validColumns.length,
      gradedCount: graded.length,
      average: pct,
    }
  }, [gradeColumns, gradeValueMap])

  // Helper to map assignment ID to student submission status
  const getAssignmentStatusMeta = (item: any) => {
    if (item.type === "Material" || item.type === "material" || item.type === "Syllabus") {
      return { label: "Available", bg: "bg-emerald-50 border-emerald-100/50 text-[#00C2A8]", icon: <Eye size={12} /> }
    }

    const sub = submissions.find(s => s.assignment_id === item.id)
    if (!sub) {
      if (item.due_date && new Date(item.due_date).getTime() < Date.now()) {
        return { label: "Missing", bg: "bg-red-50 border-red-100/50 text-[#F04438]", icon: <AlertCircle size={12} /> }
      }
      return { label: "Pending", bg: "bg-amber-50 border-amber-100/50 text-[#FFB020]", icon: <Clock size={12} /> }
    }

    if (sub.status === "graded") {
      return { label: `Graded: ${sub.grade}/${item.max_score}`, bg: "bg-indigo-50 border-indigo-100/50 text-[#6C63FF]", icon: <CheckCircle2 size={12} /> }
    }

    return { label: "Submitted", bg: "bg-blue-50 border-blue-100/50 text-blue-600", icon: <CheckCircle size={12} /> }
  }

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return "No due date"
    const d = new Date(dueDate)
    if (isNaN(d.getTime())) return dueDate
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const typeConfig = {
    'Assignment': { icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50/70', label: 'Assignment' },
    'Quiz': { icon: Brain, color: 'text-purple-600', bg: 'bg-purple-50/70', label: 'Quiz' },
    'Coding Assignment': { icon: FileCode, color: 'text-blue-600', bg: 'bg-blue-50/70', label: 'Coding' },
    'Material': { icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50/70', label: 'Material' },
    'Syllabus': { icon: Book, color: 'text-amber-600', bg: 'bg-amber-50/70', label: 'Syllabus' },
  } as any

  const handleReplyToAnnouncement = async (announcementId: string) => {
    const replyText = replyTextByAnnouncement[announcementId]?.trim() || ""
    if (!replyText) return

    setIsReplying(prev => ({ ...prev, [announcementId]: true }))
    const res = await replyToAnnouncementAction({
      announcement_id: announcementId,
      student_id: studentId,
      subject_id: subject.id,
      content: replyText,
    })

    setIsReplying(prev => ({ ...prev, [announcementId]: false }))
    if (!res.success) {
      showToast("Error sending reply: " + res.error, "error")
      return
    }

    setReplyTextByAnnouncement(prev => ({ ...prev, [announcementId]: "" }))
    showToast("Reply posted successfully!", "success")
    setLocalSubjectAnnouncements(prev =>
      prev.map((ann) =>
        ann.id === announcementId
          ? { ...ann, replies: [...(ann.replies || []), res.reply] }
          : ann
      )
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md ${
            toast.type === "success"
              ? "bg-emerald-50/95 border-emerald-200 text-emerald-900"
              : toast.type === "error"
              ? "bg-rose-50/95 border-rose-200 text-rose-900"
              : "bg-indigo-50/95 border-indigo-200 text-indigo-900"
          }`}>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
              toast.type === "success"
                ? "bg-emerald-100 text-emerald-700"
                : toast.type === "error"
                ? "bg-rose-100 text-rose-700"
                : "bg-indigo-100 text-indigo-700"
            }`}>
              <CheckCircle2 size={16} />
            </div>
            <div className="text-xs font-bold leading-snug">
              {toast.message}
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition-colors ml-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      {/* Top Banner (Bright, airy layout) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Soft, glowing vector backdrop */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-radial-gradient from-indigo-50/60 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <Link href="/dashboard/student/subjects" className="text-xs font-bold text-[#6C63FF] hover:text-[#5C53EF] flex items-center gap-1 transition-colors">
              <ArrowLeft size={14} /> Back to subjects
            </Link>
            <h1 className="text-3xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans']">{subject.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-semibold mt-1">
              <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md font-['Space_Grotesk'] text-[11px] font-bold text-slate-600">{subject.code}</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><UserRound size={14} className="text-slate-400" /> {facultyName}</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-150 rounded-2xl px-5 py-3 text-slate-850 flex items-center gap-4 self-start md:self-center">
            <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/5 flex items-center justify-center text-[#6C63FF]">
              <ClipboardList size={20} />
            </div>
            <div>
              <div className="text-lg font-bold font-['Space_Grotesk'] text-slate-900 leading-none">
                {assignments.filter(a => a.type !== "Material").length}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Assignments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu with premium pill buttons */}
      <div className="bg-white/80 border border-slate-100 rounded-2xl p-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.01)] backdrop-blur-md flex flex-wrap gap-1">
        {[
          { id: "assignments", label: "Assignments", icon: ListTodo },
          { id: "modules", label: "Modules", icon: BookOpen },
          { id: "syllabus", label: "Syllabus", icon: Book },
          { id: "grades", label: "Grades", icon: ClipboardList },
          { id: "meetings", label: "Video Classroom", icon: Video },
          { id: "stream", label: "Feed", icon: MessageSquare },
          { id: "people", label: "Class Roster", icon: Users },
          { id: "attendance", label: "Attendance", icon: ClipboardList },
          { id: "groups", label: "Project Groups", icon: FolderKanban },
        ].map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[120px] flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs transition-all duration-200 active:scale-95 ${
                active
                  ? "bg-[#6C63FF] text-white shadow-md shadow-indigo-100"
                  : "text-slate-500 hover:text-slate-850 hover:bg-slate-50"
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 mr-2 ${active ? "text-white" : "text-slate-400"}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        
        {/* Real-time Live Lecture Banner Alert (Premium alert gradient) */}
        {localMeetings.some(m => m.is_active) && (
          <div className="bg-gradient-to-r from-[#F04438] to-[#FFB020] rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6 animate-pulse">
            <div className="flex items-center gap-4">
              <span className="w-3.5 h-3.5 rounded-full bg-white animate-ping flex-shrink-0" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider font-['Plus_Jakarta_Sans']">LIVE CLASSROOM MEETING ACTIVE</h3>
                <p className="text-xs text-white/90 font-sans mt-0.5">
                  Your professor is conducting a live classroom lecture: <span className="font-bold">"{localMeetings.find(m => m.is_active)?.title}"</span>. Click Join below to launch.
                </p>
              </div>
            </div>
            <a
              href={`/meetings/${localMeetings.find(m => m.is_active)?.meeting_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-white text-[#F04438] hover:bg-slate-50 font-bold rounded-xl text-xs shadow-md transition-all duration-200 active:scale-95 whitespace-nowrap flex-shrink-0"
            >
              Join Live Lecture
            </a>
          </div>
        )}

        {/* Tab 1: Assignments */}
        {activeTab === "assignments" && (
          <div className="space-y-6">
            {assignmentItems.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
                <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-900 font-bold text-sm">No assignments or quizzes found</p>
                <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">Your instructor has not posted any assignments or quizzes for this course yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {assignmentItems.map((item) => {
                  const cfg = typeConfig[item.type] || typeConfig["Assignment"]
                  const Icon = cfg.icon
                  const statusMeta = getAssignmentStatusMeta(item)

                  return (
                    <Link
                      key={item.id}
                      href={`/dashboard/student/subjects/${subject.id}/assignments/${item.id}`}
                      className="block group"
                    >
                      <div className="bg-white border border-slate-100 rounded-3xl p-5 flex items-center justify-between hover:border-indigo-100 hover:shadow-[0_12px_24px_rgba(108,99,255,0.04)] transition-all duration-300 hover:-translate-y-0.5">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-[#6C63FF] transition-colors duration-200">{item.title}</h4>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] font-semibold text-slate-400 font-['Space_Grotesk']">
                              <span className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-300" /> Due {formatDueDate(item.due_date)}</span>
                              {item.type !== "Material" && (
                                <>
                                  <span>•</span>
                                  <span>Max Score: {item.max_score}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                          <span className={`text-[10px] font-bold border px-3 py-1 rounded-full flex items-center gap-1.5 ${statusMeta.bg}`}>
                            {statusMeta.icon}
                            {statusMeta.label}
                          </span>
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-[#6C63FF] group-hover:translate-x-1 transition-all duration-200" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Modules */}
        {activeTab === "modules" && (
          <div className="space-y-6">
            {moduleItems.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-900 font-bold text-sm">No modules available</p>
                <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">Your instructor will post course modules and reference materials here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {moduleItems.map((item) => {
                  const cfg = typeConfig[item.type] || typeConfig["Material"]
                  return (
                    <Link
                      key={item.id}
                      href={`/dashboard/student/subjects/${subject.id}/assignments/${item.id}`}
                      className="block group"
                    >
                      <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:border-indigo-100 hover:shadow-[0_12px_24px_rgba(108,99,255,0.04)] transition-all duration-300 hover:-translate-y-0.5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                            <BookOpen size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm truncate">{item.title}</h4>
                            <p className="text-[11px] text-slate-400 mt-1 truncate">{item.description || "Module resource"}</p>
                          </div>
                        </div>
                        <div className="mt-4 text-[10px] font-semibold text-slate-500 flex items-center justify-between">
                          <span>{item.due_date ? `Due ${formatDueDate(item.due_date)}` : (item.created_at ? `Posted ${formatDueDate(item.created_at)}` : "Learning Resource")}</span>
                          <span className="text-[#6C63FF] font-bold">View Module</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Syllabus */}
        {activeTab === "syllabus" && (
          <div className="space-y-6">
            {syllabusItems.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
                <Book className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-900 font-bold text-sm">No syllabus posts yet</p>
                <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">Your syllabus overview and curriculum notes will appear here when posted.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {syllabusItems.map((item) => (
                  <Link key={item.id} href={`/dashboard/student/subjects/${subject.id}/assignments/${item.id}`} className="block group">
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 hover:border-indigo-100 hover:shadow-[0_12px_24px_rgba(108,99,255,0.04)] transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#6C63FF] flex items-center justify-center flex-shrink-0">
                          <Book size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{item.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 truncate">{item.description || "Syllabus overview"}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Grades */}
        {activeTab === "grades" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Grade Book</p>
                <h3 className="mt-2 text-2xl font-black text-slate-900 font-['Space_Grotesk']">{gradeSummary.average}%</h3>
                <p className="text-[11px] text-slate-500 mt-1">Average across custom evaluation columns</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Graded</p>
                <h3 className="mt-2 text-2xl font-black text-slate-900 font-['Space_Grotesk']">{gradeSummary.gradedCount}/{gradeSummary.totalColumns}</h3>
                <p className="text-[11px] text-slate-500 mt-1">Columns with marks recorded</p>
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Course</p>
                <h3 className="mt-2 text-lg font-black text-slate-900">{subject.name}</h3>
                <p className="text-[11px] text-slate-500 mt-1">{subject.code}</p>
              </div>
            </div>

            {gradeColumns.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-900 font-bold text-sm">No grade columns yet</p>
                <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">Your instructor has not created assessment columns for this subject yet.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <ClipboardList size={18} className="text-[#6C63FF]" /> Subject Gradebook
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsStudentGradePrintModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                    >
                      <Printer size={13} className="text-[#6C63FF]" /> Print Statement of Marks
                    </button>
                    <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100/50 text-[#6C63FF] px-2.5 py-1 rounded-full font-['Space_Grotesk']">
                      {gradeColumns.length} Columns
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left">
                    <thead className="bg-slate-50/50">
                      <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                        <th className="px-6 py-3 font-bold">Assessment</th>
                        <th className="px-6 py-3 font-bold">Type</th>
                        <th className="px-6 py-3 font-bold">Max</th>
                        <th className="px-6 py-3 font-bold">Weight</th>
                        <th className="px-6 py-3 font-bold">Score</th>
                        <th className="px-6 py-3 font-bold">Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gradeColumns.map((column: any) => {
                        const rawScore = gradeValueMap[column.id]
                        const numericScore = rawScore != null && rawScore !== "" ? Number(rawScore) : null
                        const maxScore = Number(column.max_score ?? 100)
                        const percent = numericScore != null && maxScore > 0 ? Math.round((numericScore / maxScore) * 100) : null

                        return (
                          <tr key={column.id} className="hover:bg-slate-50/40 transition-colors duration-200">
                            <td className="px-6 py-4 text-xs font-bold text-slate-800">{column.title}</td>
                            <td className="px-6 py-4 text-[11px] text-slate-500 uppercase tracking-wider">{column.type || "Custom"}</td>
                            <td className="px-6 py-4 text-[11px] text-slate-600 font-semibold">{maxScore}</td>
                            <td className="px-6 py-4 text-[11px] text-slate-600 font-semibold">{Number(column.weight ?? 0)}%</td>
                            <td className="px-6 py-4">
                              {numericScore == null ? (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">Not graded</span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-black text-slate-900 font-['Space_Grotesk']">{numericScore}/{maxScore}</span>
                                  {percent != null && (
                                    <span className="text-[10px] font-bold text-[#6C63FF]">{percent}%</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-[11px] text-slate-500 max-w-[240px] whitespace-pre-wrap">
                              {gradeEntries.find((entry: any) => entry.column_id === column.id)?.feedback || "No feedback provided."}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Feed */}
        {activeTab === "stream" && (
          <div className="space-y-6">
            {streamItems.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-900 font-bold text-sm">Nothing posted yet</p>
                <p className="text-xs text-slate-400 mt-1">Announcements and reference materials will show up in this feed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {streamItems.map((item) => {
                  if (item.kind === "announcement") {
                    const ann = item.data
                    const annFacultyName = ann.faculty?.name || facultyName
                    const content = ann.description || ann.content || ""
                    const replies = item.source === "announcement" ? ann.replies || [] : []
                    return (
                      <div key={`${item.source}-${item.id}`} className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col gap-4 hover:shadow-[0_12px_24px_rgba(108,99,255,0.03)] transition-all duration-350">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#6C63FF] flex items-center justify-center flex-shrink-0">
                            <Megaphone size={18} />
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-center gap-4">
                              <h4 className="font-bold text-slate-800 text-sm">{annFacultyName}</h4>
                              <div className="text-[10px] text-slate-400 font-bold font-['Space_Grotesk']">
                                {new Date(ann.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2.5 whitespace-pre-wrap">{content}</p>
                          </div>
                        </div>

                        {item.source === "announcement" && (
                          <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4">
                            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 mb-3">Replies</div>
                            {replies.length === 0 ? (
                              <p className="text-xs text-slate-400">No replies yet. Share your question or comment below.</p>
                            ) : (
                              <div className="space-y-3">
                                {replies.map((reply: any) => (
                                  <div key={reply.id} className="rounded-2xl bg-white p-3 border border-slate-100">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-xs font-semibold text-slate-700">{reply.users?.name || "Student"}</span>
                                      <span className="text-[10px] text-slate-400">{new Date(reply.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap">{reply.message}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-4 space-y-2">
                              <textarea
                                rows={3}
                                value={replyTextByAnnouncement[item.id] || ""}
                                onChange={(e) => setReplyTextByAnnouncement(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="w-full rounded-3xl border border-slate-200 p-3 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                                placeholder="Write a reply to this announcement..."
                              />
                              <button
                                onClick={() => handleReplyToAnnouncement(item.id)}
                                disabled={isReplying[item.id] || !replyTextByAnnouncement[item.id]?.trim()}
                                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {isReplying[item.id] ? "Sending..." : "Reply"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  } else {
                    const mat = item.data
                    const matFacultyName = mat.faculty?.name || facultyName
                    return (
                      <div key={item.id} className="bg-white border border-emerald-100 rounded-3xl p-6 flex items-start gap-4 hover:shadow-[0_12px_24px_rgba(108,99,255,0.03)] transition-all duration-350">
                        <div className="w-10 h-10 rounded-xl bg-[#00C2A8]/5 text-[#00C2A8] flex items-center justify-center flex-shrink-0">
                          <BookOpen size={18} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-800 text-sm">{matFacultyName} posted reference materials</h4>
                            <div className="text-[10px] text-slate-400 font-bold font-['Space_Grotesk']">
                              {new Date(mat.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </div>
                          </div>
                          <div className="border border-emerald-50 rounded-2xl p-4 mt-3 bg-emerald-50/10 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText size={16} className="text-[#00C2A8] flex-shrink-0" />
                              <span className="font-bold text-xs text-slate-700 truncate">{mat.title}</span>
                            </div>
                            <Link href={`/dashboard/student/subjects/${subject.id}/assignments/${mat.id}`}>
                              <span className="text-[10px] font-bold text-[#00C2A8] bg-white hover:bg-emerald-50/50 border border-emerald-100 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200 flex-shrink-0">
                                View Material
                              </span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  }
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Roster */}
        {activeTab === "people" && (
          <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-6">
            {/* Faculty Info */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 h-fit space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-50 pb-2">Faculty Instructor</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#6C63FF] border border-indigo-100/30 flex items-center justify-center font-bold text-sm">
                  {facultyName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{facultyName}</h4>
                  <p className="text-[9px] text-[#6C63FF] font-bold uppercase tracking-wider mt-0.5">Subject Expert</p>
                </div>
              </div>
            </div>

            {/* Classmates list */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-50 pb-2">Section Classmates ({classmates.length})</h3>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2 space-y-1">
                {classmates.map((student) => (
                  <div key={student.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-600 border border-slate-100/50 flex items-center justify-center font-bold text-xs">
                        {student.name.split(" ").map((n: string) => n[0]).join("").substring(0,2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700 text-xs">{student.name}</span>
                    </div>
                    {student.id === studentId ? (
                      <span className="text-[9px] font-bold bg-indigo-50 border border-indigo-100/50 text-[#6C63FF] px-2 py-0.5 rounded-md font-['Space_Grotesk']">You</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px] sm:max-w-none">{student.email}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Video classroom lectures log */}
        {activeTab === "meetings" && (
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Video size={18} className="text-[#6C63FF]" /> Virtual Classroom Lectures
              </h3>
              <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100/50 text-[#6C63FF] px-2.5 py-1 rounded-full font-['Space_Grotesk']">
                {localMeetings.length} Lectures Total
              </span>
            </div>

            <div className="divide-y divide-slate-55">
              {localMeetings.map((m) => {
                const startStr = m.scheduled_start ? new Date(m.scheduled_start).toLocaleString() : new Date(m.started_at).toLocaleString()
                return (
                  <div key={m.id} className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50/30 transition-colors duration-200">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${m.is_active ? "bg-[#F04438] animate-pulse" : "bg-slate-300"}`} />
                        <h4 className="font-bold text-sm text-slate-800">{m.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 font-semibold font-['Space_Grotesk'] uppercase tracking-wider">
                        Session: {m.meeting_type} • Timing: {startStr}
                      </p>
                    </div>

                    <div>
                      {m.is_active ? (
                        <a
                          href={`/meetings/${m.meeting_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary-600)] hover:to-[var(--primary-700)] text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-all duration-200 active:scale-95"
                        >
                          Join Live Lecture
                        </a>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 font-['Space_Grotesk'] uppercase">Completed</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {localMeetings.length === 0 && (
                <div className="text-center py-20 text-slate-400 text-xs">
                  <Video className="w-12 h-12 mx-auto mb-3 text-slate-350" />
                  No virtual lecture schedules are posted for your section yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Attendance rates */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            {/* Grid stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Rate Card */}
              <div className="bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] rounded-3xl p-6 text-white shadow-md shadow-indigo-100/30 flex flex-col justify-between min-h-[140px]">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-100">Attendance Rate</span>
                <div>
                  <h3 className="text-4xl font-bold font-['Space_Grotesk']">{attendanceSummary.rate}%</h3>
                  <p className="text-[10px] mt-1 text-indigo-100/90 font-medium">Target threshold minimum: 75%</p>
                </div>
              </div>

              {/* Conducted Hours */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.01)] flex flex-col justify-between min-h-[140px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Present Periods</span>
                <div>
                  <h3 className="text-3xl font-black text-slate-800 font-['Space_Grotesk']">{attendanceSummary.present}</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Status: present / late entry</p>
                </div>
              </div>

              {/* Absences */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.01)] flex flex-col justify-between min-h-[140px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Absent Periods</span>
                <div>
                  <h3 className="text-3xl font-black text-slate-800 font-['Space_Grotesk']">{attendanceSummary.absent}</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Missed subject syllabus slots</p>
                </div>
              </div>

              {/* Total Conducted */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.01)] flex flex-col justify-between min-h-[140px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sessions Logged</span>
                <div>
                  <h3 className="text-3xl font-black text-slate-800 font-['Space_Grotesk']">{attendanceSummary.total}</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Total conducted classes</p>
                </div>
              </div>
            </div>

            {/* Detailed Table history */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <ClipboardList size={18} className="text-[#6C63FF]" /> Attendance Period Log
                </h3>
                <span className="text-[10px] font-bold bg-[#6C63FF]/5 border border-[#6C63FF]/15 text-[#6C63FF] px-2.5 py-1 rounded-full font-['Space_Grotesk']">
                  {attendanceEntries.length} Records Logged
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {attendanceEntries.map((entry) => {
                  const statusStyles: Record<string, string> = {
                    PRESENT: "bg-[#00C2A8]/5 border border-[#00C2A8]/20 text-[#00C2A8] px-3 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase font-['Space_Grotesk']",
                    ABSENT: "bg-[#F04438]/5 border border-[#F04438]/20 text-[#F04438] px-3 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase font-['Space_Grotesk']",
                    LATE: "bg-[#FFB020]/5 border border-[#FFB020]/20 text-[#FFB020] px-3 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase font-['Space_Grotesk']",
                    NOT_MARKED: "bg-slate-50 border border-slate-200 text-slate-400 px-3 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase font-['Space_Grotesk']",
                  }
                  const statusLabels: Record<string, string> = {
                    PRESENT: "Present",
                    ABSENT: "Absent",
                    LATE: "Late",
                    NOT_MARKED: "Not Marked",
                  }
                  return (
                    <div key={entry.id} className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50/30 transition-colors duration-200">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">Period {entry.period}</span>
                          <span className="text-xs text-slate-300">•</span>
                          <span className="text-xs font-semibold text-slate-500">{new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <p className="text-[11px] text-slate-450 font-semibold">
                          Marked by: {entry.facultyName}
                        </p>
                      </div>

                      <div>
                        <span className={statusStyles[entry.status] || "bg-slate-50 border border-slate-200 text-slate-400 px-3 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase font-['Space_Grotesk']"}>
                          {statusLabels[entry.status] || entry.status}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {attendanceEntries.length === 0 && (
                  <div className="text-center py-20 text-slate-400 text-xs">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-350" />
                    No attendance logs have been recorded for your section yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Tab 6: Project Groups */}
        {activeTab === "groups" && (
          <div className="space-y-6 text-left">
            {projectGroups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <FolderKanban className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
                <h3 className="mt-4 text-base font-semibold text-slate-900">No project groups allocated</h3>
                <p className="mt-2 text-sm text-slate-500">Your faculty has not created project group allocations for this subject yet.</p>
              </div>
            ) : (
              projectGroups.map((gAllocation: any) => {
                const proj = gAllocation.project
                const group = gAllocation.project_group
                return (
                  <div key={gAllocation.id} className="rounded-3xl border border-slate-250 bg-white p-6 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-100 pb-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{proj?.title || "Class Project"}</h3>
                          {group?.synergy_score && (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                              <Star size={10} className="fill-emerald-600" />
                              {group?.synergy_score}% Synergy
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{proj?.description || "Collaborative course group assignment."}</p>
                      </div>
                      <div className="text-right">
                        <span className="bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/20 px-3 py-1 rounded-xl text-xs font-black">
                          {group?.group_name || "Team Squad"}
                        </span>
                        {group?.motto && (
                          <p className="text-xs text-slate-400 italic mt-1">"{group.motto}"</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-700 text-xs mb-3 uppercase tracking-wider">Teammates & Roles</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(group?.group_members || []).map((member: any, idx: number) => {
                          const isSelf = member.student_id === studentId
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between rounded-2xl p-4 border transition-all ${
                                isSelf
                                  ? "bg-indigo-50/70 border-indigo-200 ring-2 ring-indigo-500/10"
                                  : "bg-slate-50/50 border-slate-100 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                  isSelf ? "bg-[#6C63FF] text-white" : "bg-slate-200 text-slate-600"
                                }`}>
                                  {member.users?.name?.substring(0, 2) || "ST"}
                                </div>
                                <div>
                                  <span className={`text-xs font-extrabold block ${isSelf ? "text-indigo-955" : "text-slate-800"}`}>
                                    {member.users?.name || "Student"} {isSelf && " (You)"}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-semibold">{member.users?.email || ""}</span>
                                </div>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 border shadow-2xs">
                                {member.role || "Developer"}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Student Statement of Marks Print Modal */}
      <StudentGradePrintModal
        isOpen={isStudentGradePrintModalOpen}
        onClose={() => setIsStudentGradePrintModalOpen(false)}
        studentName={studentName}
        subjectName={subject.name}
        subjectCode={subject.code}
        instructorName={facultyName}
        academicTerm="Academic Session 2026"
        gradeColumns={gradeColumns}
        gradeValueMap={gradeValueMap}
        gradeEntries={gradeEntries}
        gradeSummary={gradeSummary}
      />
    </div>
  )
}
