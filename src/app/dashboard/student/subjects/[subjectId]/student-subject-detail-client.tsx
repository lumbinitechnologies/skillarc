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
  Star
} from "lucide-react"
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
}: StudentSubjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"stream" | "classwork" | "people" | "meetings" | "attendance" | "groups">("classwork")

  // Real-time meetings state for active classroom classes
  const [localMeetings, setLocalMeetings] = useState<any[]>(meetings)

  useEffect(() => {
    setLocalMeetings(meetings)
  }, [meetings])

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
  const announcementsList = assignments.filter(a => a.type === "Material" && !a.due_date)
  const materialsList = assignments.filter(a => a.type === "Material" && a.due_date)

  const streamItems = [
    ...announcementsList.map(a => ({ kind: "announcement" as const, id: a.id, date: a.created_at, data: a })),
    ...materialsList.map(m => ({ kind: "material" as const, id: m.id, date: m.created_at, data: m })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Helper to map assignment ID to student submission status
  const getAssignmentStatusMeta = (item: any) => {
    if (item.type === "Material" || item.type === "material") {
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
  } as any

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
          { id: "classwork", label: "Classwork", icon: ListTodo },
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

        {/* Tab 1: Classwork */}
        {activeTab === "classwork" && (
          <div className="space-y-6">
            {assignments.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl">
                <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-900 font-bold text-sm">No coursework found</p>
                <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">There are no assignments, quizzes, or resources posted for your section yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {assignments.map((item) => {
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
                    return (
                      <div key={item.id} className="bg-white border border-slate-100 rounded-3xl p-6 flex items-start gap-4 hover:shadow-[0_12px_24px_rgba(108,99,255,0.03)] transition-all duration-350">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#6C63FF] flex items-center justify-center flex-shrink-0">
                          <Megaphone size={18} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-800 text-sm">{annFacultyName}</h4>
                            <div className="text-[10px] text-slate-400 font-bold font-['Space_Grotesk']">
                              {new Date(ann.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2.5 whitespace-pre-wrap">{ann.description}</p>
                        </div>
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
                          className="px-4 py-2 bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] hover:from-[#5C53EF] hover:to-[#7B4CE6] text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-all duration-200 active:scale-95"
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
    </div>
  )
}
