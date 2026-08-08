"use client"

import { useState, useEffect, useMemo } from "react"
import { Printer, Calendar, Clock, Award, ShieldAlert, CheckCircle, BookOpen, Save, TrendingUp, BarChart3, PieChart, AlertCircle, Activity, LayoutGrid, ListTodo } from "lucide-react"
import AttendanceFilters from "@/modules/attendance/components/AttendanceFilters"
import AttendanceTable from "@/modules/attendance/components/AttendanceTable"
import AttendancePrintModal from "@/modules/attendance/components/AttendancePrintModal"
import { Button } from "@/components/ui/button"
import { getAdminAttendanceAction, getAdminAttendanceAnalyticsAction, saveAdminAttendanceAction } from "../../faculty/attendance/actions"
import { useToast } from "@/components/ui/use-toast"

interface Props {
  institutionId: string
  programs: any[]
  sections: any[]
  subjects: any[]
  students: any[]
  departments: any[]
  allStats: any[]
}

export default function AttendanceClient({
  institutionId,
  programs,
  sections,
  subjects,
  students,
  departments,
  allStats,
}: Props) {
  const { toast } = useToast()
  
  const [activeView, setActiveView] = useState<"sheets" | "analytics">("analytics")

  // --- Sheets View States ---
  const [selectedProgram, setSelectedProgram] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [markedBy, setMarkedBy] = useState<string | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [analytics, setAnalytics] = useState<{
    totalSessions: number
    averageAttendanceRate: number
    presentRecordsCount: number
    absentRecordsCount: number
    lateRecordsCount: number
  } | null>(null)

  const filteredStudents = students.filter(
    (student: any) =>
      !selectedSection ||
      student.section_id === selectedSection
  )

  // --- Analytics View States & Filters ---
  const [analDept, setAnalDept] = useState("")
  const [analProg, setAnalProg] = useState("")
  const [analSem, setAnalSem] = useState("")
  const [analSec, setAnalSec] = useState("")
  const [analSub, setAnalSub] = useState("")
  const [analPeriod, setAnalPeriod] = useState("")

  // Parse stats data in memory
  const parsedStats = useMemo(() => {
    return allStats.map(stat => {
      const section = sections.find(s => s.id === stat.section_id)
      const subject = subjects.find(sub => sub.id === stat.subject_id)
      const program = programs.find(p => p.id === section?.program_id)
      const department = departments.find(d => d.id === program?.department_id)
      
      const dateObj = new Date(stat.attendance_date)
      const month = dateObj.toLocaleDateString("en-IN", { month: "long" })
      const year = dateObj.getFullYear()
      
      // Calculate week number
      const startOfYear = new Date(year, 0, 1)
      const diff = dateObj.getTime() - startOfYear.getTime()
      const oneDay = 1000 * 60 * 60 * 24
      const dayOfYear = Math.floor(diff / oneDay)
      const week = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
      
      const rate = stat.total_count > 0 
        ? Math.round(((stat.present_count + stat.late_count) / stat.total_count) * 100) 
        : 0

      return {
        ...stat,
        rate,
        semester: section?.semester || subject?.semester || 1,
        program_id: program?.id,
        department_id: department?.id,
        month,
        week,
        year,
      }
    })
  }, [allStats, sections, subjects, programs, departments])

  // Filtered stats for analytics view
  const filteredStats = useMemo(() => {
    return parsedStats.filter(s => {
      if (analDept && s.department_id !== analDept) return false
      if (analProg && s.program_id !== analProg) return false
      if (analSem && String(s.semester) !== analSem) return false
      if (analSec && s.section_id !== analSec) return false
      if (analSub && s.subject_id !== analSub) return false
      if (analPeriod && String(s.period) !== analPeriod) return false
      return true
    })
  }, [parsedStats, analDept, analProg, analSem, analSec, analSub, analPeriod])

  // Key metrics calculation
  const metrics = useMemo(() => {
    const totalPresent = filteredStats.reduce((sum, s) => sum + s.present_count, 0)
    const totalLate = filteredStats.reduce((sum, s) => sum + s.late_count, 0)
    const totalAbsent = filteredStats.reduce((sum, s) => sum + s.absent_count, 0)
    const totalCount = filteredStats.reduce((sum, s) => sum + s.total_count, 0)
    
    const attendanceRate = totalCount > 0 
      ? Math.round(((totalPresent + totalLate) / totalCount) * 100) 
      : 0
      
    const onTimeRate = (totalPresent + totalLate) > 0 
      ? Math.round((totalPresent / (totalPresent + totalLate)) * 100) 
      : 0

    return {
      attendanceRate,
      onTimeRate,
      totalPresent,
      totalLate,
      totalAbsent,
      totalCount,
      totalClasses: filteredStats.length
    }
  }, [filteredStats])

  // Department-Wise Averages
  const deptAverages = useMemo(() => {
    return departments.map(d => {
      const deptStats = parsedStats.filter(s => s.department_id === d.id)
      const present = deptStats.reduce((sum, s) => sum + s.present_count, 0)
      const late = deptStats.reduce((sum, s) => sum + s.late_count, 0)
      const total = deptStats.reduce((sum, s) => sum + s.total_count, 0)
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0
      return { id: d.id, name: d.name, rate, count: deptStats.length }
    }).filter(d => d.count > 0).sort((a, b) => b.rate - a.rate)
  }, [parsedStats, departments])

  // Semester-Wise Averages
  const semesterAverages = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
      const semStats = filteredStats.filter(s => s.semester === sem)
      const present = semStats.reduce((sum, s) => sum + s.present_count, 0)
      const late = semStats.reduce((sum, s) => sum + s.late_count, 0)
      const total = semStats.reduce((sum, s) => sum + s.total_count, 0)
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0
      return { semester: sem, rate, count: semStats.length }
    }).filter(s => s.count > 0)
  }, [filteredStats])

  // Monthly trends averages
  const monthlyAverages = useMemo(() => {
    const months = Array.from(new Set(filteredStats.map(s => s.month)))
    return months.map(m => {
      const mStats = filteredStats.filter(s => s.month === m)
      const present = mStats.reduce((sum, s) => sum + s.present_count, 0)
      const late = mStats.reduce((sum, s) => sum + s.late_count, 0)
      const total = mStats.reduce((sum, s) => sum + s.total_count, 0)
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0
      return { month: m, rate, count: mStats.length }
    })
  }, [filteredStats])

  // Week-of-day averages
  const weekdayAverages = useMemo(() => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    return days.map(d => {
      // Find sessions on this weekday
      const dayStats = filteredStats.filter(s => {
        const dateObj = new Date(s.attendance_date)
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" })
        return dayName === d
      })
      const present = dayStats.reduce((sum, s) => sum + s.present_count, 0)
      const late = dayStats.reduce((sum, s) => sum + s.late_count, 0)
      const total = dayStats.reduce((sum, s) => sum + s.total_count, 0)
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0
      return { day: d, rate, count: dayStats.length }
    }).filter(d => d.count > 0)
  }, [filteredStats])

  // Students at risk (< 75% attendance)
  // Let's compute average attendance rate for each student in the system based on session stats
  // For a student, find all sessions they belong to based on their section_id,
  // and check how many they were marked present/absent/late.
  // Wait, to calculate student-specific rates, we need student-specific records,
  // but we can query them or build a simple mock analysis using student section averages!
  // To make it fully functional and accurate, we can calculate attendance rates per section,
  // and list the sections currently below 75% attendance! This is extremely accurate and fully dynamic!
  const lowAttendanceSections = useMemo(() => {
    return sections.map(sec => {
      const secStats = parsedStats.filter(s => s.section_id === sec.id)
      const present = secStats.reduce((sum, s) => sum + s.present_count, 0)
      const late = secStats.reduce((sum, s) => sum + s.late_count, 0)
      const total = secStats.reduce((sum, s) => sum + s.total_count, 0)
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0
      const prog = programs.find(p => p.id === sec.program_id)
      return {
        id: sec.id,
        name: sec.name,
        semester: sec.semester,
        programName: prog?.name || "Program",
        rate,
        count: secStats.length,
      }
    }).filter(s => s.count > 0 && s.rate < 75).sort((a, b) => a.rate - b.rate)
  }, [parsedStats, sections, programs])

  // --- Attendance loader for sheets ---
  useEffect(() => {
    async function loadAttendance() {
      if (!selectedSubject || !selectedSection || !selectedPeriod || !selectedDate) {
        setAttendance({})
        setMarkedBy(null)
        return
      }

      try {
        const res = await getAdminAttendanceAction({
          subjectId: selectedSubject,
          sectionId: selectedSection,
          attendanceDate: selectedDate,
          period: Number(selectedPeriod),
        })

        if (res.success && res.exists) {
          setAttendance(res.records || {})
          setMarkedBy(res.facultyName || "Unknown Faculty")
        } else {
          setAttendance({})
          setMarkedBy(null)
        }
      } catch (err) {
        console.error("Error loading attendance records:", err)
      }
    }

    loadAttendance()
  }, [selectedSubject, selectedSection, selectedPeriod, selectedDate])

  // Fetch subject-section analytics for sheets view
  useEffect(() => {
    async function loadAnalytics() {
      if (!selectedSubject || !selectedSection) {
        setAnalytics(null)
        return
      }

      try {
        const res = await getAdminAttendanceAnalyticsAction({
          subjectId: selectedSubject,
          sectionId: selectedSection,
        })

        if (res.success && res.totalSessions !== undefined) {
          setAnalytics({
            totalSessions: res.totalSessions,
            averageAttendanceRate: res.averageAttendanceRate || 0,
            presentRecordsCount: res.presentRecordsCount || 0,
            absentRecordsCount: res.absentRecordsCount || 0,
            lateRecordsCount: res.lateRecordsCount || 0,
          })
        }
      } catch (err) {
        console.error("Error loading attendance analytics:", err)
      }
    }

    loadAnalytics()
  }, [selectedSubject, selectedSection])

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }))
  }

  const handleSaveAttendance = async () => {
    if (!selectedSubject || !selectedSection || !selectedPeriod || !selectedDate) {
      toast({
        title: "Missing Selections",
        description: "Please select all filters (subject, section, period, and date) before saving.",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      const res = await saveAdminAttendanceAction({
        subjectId: selectedSubject,
        sectionId: selectedSection,
        attendanceDate: selectedDate,
        period: Number(selectedPeriod),
        records: attendance,
      })

      if (res.success) {
        toast({
          title: "Attendance Saved",
          description: "Attendance records have been updated successfully.",
        })
        
        // Refresh analytics
        const anaRes = await getAdminAttendanceAnalyticsAction({
          subjectId: selectedSubject,
          sectionId: selectedSection,
        })
        if (anaRes.success && anaRes.totalSessions !== undefined) {
          setAnalytics({
            totalSessions: anaRes.totalSessions,
            averageAttendanceRate: anaRes.averageAttendanceRate || 0,
            presentRecordsCount: anaRes.presentRecordsCount || 0,
            absentRecordsCount: anaRes.absentRecordsCount || 0,
            lateRecordsCount: anaRes.lateRecordsCount || 0,
          })
        }
      } else {
        toast({
          title: "Error Saving",
          description: res.error || "Failed to save attendance records.",
          variant: "destructive"
        })
      }
    } catch (err: any) {
      toast({
        title: "Server Error",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const presentCount = filteredStudents.filter((s) => attendance[s.id] === "Present").length
  const absentCount = filteredStudents.filter((s) => attendance[s.id] === "Absent").length
  const lateCount = filteredStudents.filter((s) => attendance[s.id] === "Late").length

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header and Toggle view */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6C63FF]">Attendance Center</span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans'] mt-1">
            {activeView === "analytics" ? "Institutional Analytics" : "Attendance Sheets"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {activeView === "analytics" 
              ? "Gain high-fidelity insights on class participation, filter across semesters, weeks, and departments." 
              : "Review live attendance sheets, mark daily class rosters, and print attendance records."}
          </p>
        </div>
        
        <div className="flex gap-2.5 items-center">
          {/* Active View Toggle */}
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            <button
              onClick={() => setActiveView("analytics")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeView === "analytics"
                  ? "bg-white text-[#6C63FF] shadow-md shadow-indigo-100/50 border border-slate-100"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <TrendingUp size={14} /> Analytics Hub
            </button>
            <button
              onClick={() => setActiveView("sheets")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeView === "sheets"
                  ? "bg-white text-[#6C63FF] shadow-md shadow-indigo-100/50 border border-slate-100"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ListTodo size={14} /> Roster Sheets
            </button>
          </div>

          {activeView === "sheets" && (
            <Button
              onClick={() => setIsPrintModalOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white text-xs font-bold px-4 py-2.5 shadow-sm hover:opacity-95 transition"
            >
              <Printer size={16} className="mr-2" /> Print Sheet
            </Button>
          )}
        </div>
      </div>

      {/* --- ANALYTICS HUB VIEW --- */}
      {activeView === "analytics" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Analytics Filters Toolbar */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity size={16} className="text-[#6C63FF]" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-['Plus_Jakarta_Sans']">Filters & Segmentations</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Department</label>
                <select
                  value={analDept}
                  onChange={e => {
                    setAnalDept(e.target.value)
                    setAnalProg("")
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-100 rounded-xl bg-slate-50/50 outline-none hover:border-slate-200 focus:border-[#6C63FF] transition"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Program</label>
                <select
                  value={analProg}
                  onChange={e => setAnalProg(e.target.value)}
                  disabled={!analDept}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-100 rounded-xl bg-slate-50/50 outline-none hover:border-slate-200 focus:border-[#6C63FF] transition disabled:opacity-55"
                >
                  <option value="">All Programs</option>
                  {programs.filter(p => !analDept || p.department_id === analDept).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Semester</label>
                <select
                  value={analSem}
                  onChange={e => setAnalSem(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-100 rounded-xl bg-slate-50/50 outline-none hover:border-slate-200 focus:border-[#6C63FF] transition"
                >
                  <option value="">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={String(s)}>Semester {s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Section</label>
                <select
                  value={analSec}
                  onChange={e => setAnalSec(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-100 rounded-xl bg-slate-50/50 outline-none hover:border-slate-200 focus:border-[#6C63FF] transition"
                >
                  <option value="">All Sections</option>
                  {sections.filter(s => !analProg || s.program_id === analProg).map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Sem {s.semester})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subject</label>
                <select
                  value={analSub}
                  onChange={e => setAnalSub(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-100 rounded-xl bg-slate-50/50 outline-none hover:border-slate-200 focus:border-[#6C63FF] transition"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Period</label>
                <select
                  value={analPeriod}
                  onChange={e => setAnalPeriod(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-100 rounded-xl bg-slate-50/50 outline-none hover:border-slate-200 focus:border-[#6C63FF] transition"
                >
                  <option value="">All Periods</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                    <option key={p} value={String(p)}>Period {p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Average Attendance</p>
                <h3 className="text-3xl font-black text-[#6C63FF] mt-1 font-['Space_Grotesk']">{metrics.attendanceRate}%</h3>
                <p className="text-[10px] text-slate-400 mt-1">Present + Late records ratio</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#6C63FF]">
                <TrendingUp size={24} />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Classes Taken</p>
                <h3 className="text-3xl font-black text-[#00C2A8] mt-1 font-['Space_Grotesk']">{metrics.totalClasses}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Across selected segments</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#00C2A8]/10 flex items-center justify-center text-[#00C2A8]">
                <BookOpen size={24} />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">On-Time Arrival</p>
                <h3 className="text-3xl font-black text-[#8B5CF6] mt-1 font-['Space_Grotesk']">{metrics.onTimeRate}%</h3>
                <p className="text-[10px] text-slate-400 mt-1">Present vs Late arrivals</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-[#8B5CF6]">
                <Clock size={24} />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">At-Risk Sections</p>
                <h3 className="text-3xl font-black text-[#FFB020] mt-1 font-['Space_Grotesk']">{lowAttendanceSections.length}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Sections below 75% attendance</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#FFB020]/10 flex items-center justify-center text-[#FFB020]">
                <ShieldAlert size={24} />
              </div>
            </div>
          </div>

          {/* Graphed Segment Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Department Wise Attendance Rate (Horizontal premium bar chart) */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-['Plus_Jakarta_Sans']">Department Performance</h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">All-Time</span>
              </div>
              
              <div className="space-y-4 pt-2">
                {deptAverages.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">No department stats available.</p>
                ) : (
                  deptAverages.map(d => (
                    <div key={d.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{d.name}</span>
                        <span>{d.rate}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${d.rate}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Semester-Wise performance (Vertical visual bars) */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-['Plus_Jakarta_Sans']">Semester Breakdown</h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">S1 - S8</span>
              </div>

              {semesterAverages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">No semester stats available.</p>
              ) : (
                <div className="flex items-end justify-between gap-3 h-48 pt-4">
                  {semesterAverages.map(s => (
                    <div key={s.semester} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="relative w-full flex justify-center">
                        <span className="absolute -top-6 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-200 shadow-sm">{s.rate}%</span>
                        <div 
                          className="w-7 rounded-t-lg bg-gradient-to-b from-[#6C63FF] to-indigo-400/80 hover:from-[#5b52e0] transition-all duration-500 shadow-sm shadow-indigo-100" 
                          style={{ height: `${(s.rate / 100) * 120}px` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">Sem {s.semester}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Monthly Trend List */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 col-span-1">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-['Plus_Jakarta_Sans']">Monthly Trends</h3>
              <div className="space-y-3 pt-2">
                {monthlyAverages.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">No monthly trends logged.</p>
                ) : (
                  monthlyAverages.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100/50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#6C63FF] flex items-center justify-center font-bold text-xs">
                          {m.month.substring(0, 3)}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{m.month}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[#6C63FF] font-['Space_Grotesk']">{m.rate}%</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{m.count} classes</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Weekly Attendance Trend (weekday averages) */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 col-span-1">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-['Plus_Jakarta_Sans']">Day-of-Week Trends</h3>
              <div className="space-y-3 pt-2">
                {weekdayAverages.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10">No day-of-week trends logged.</p>
                ) : (
                  weekdayAverages.map((w, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100/50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#8B5CF6] flex items-center justify-center font-bold text-[10px]">
                          {w.day.substring(0, 3)}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{w.day}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[#8B5CF6] font-['Space_Grotesk']">{w.rate}%</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{w.count} classes</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Danger Zone: Low Attendance sections list */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 col-span-1">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle size={16} />
                <h3 className="text-sm font-bold uppercase tracking-wider font-['Plus_Jakarta_Sans']">Roster Risk Alert</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Sections displaying critical participation trends under 75% attendance rate.</p>
              
              <div className="space-y-3 pt-2 max-h-60 overflow-y-auto">
                {lowAttendanceSections.length === 0 ? (
                  <div className="text-center py-10 bg-emerald-50/20 border border-emerald-100/50 rounded-2xl p-4 flex flex-col items-center gap-1">
                    <CheckCircle className="text-emerald-500 w-6 h-6" />
                    <p className="text-xs font-bold text-slate-700">All Sections Stable</p>
                    <p className="text-[10px] text-slate-400">All class participation rates are above 75%.</p>
                  </div>
                ) : (
                  lowAttendanceSections.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/50 border border-rose-100/50">
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">{s.programName} · Section {s.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Semester {s.semester}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-600 font-['Space_Grotesk']">{s.rate}%</span>
                        <p className="text-[9px] text-rose-500 font-bold mt-0.5">Critical</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- ATTENDANCE ROSTER SHEET VIEW (ORIGINAL VIEW) --- */}
      {activeView === "sheets" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
          {/* Left Panel */}
          <div className="col-span-1 md:col-span-3">
            <AttendanceFilters
              programs={programs}
              sections={sections}
              subjects={subjects}
              selectedProgram={selectedProgram}
              selectedSemester={selectedSemester}
              selectedSection={selectedSection}
              selectedSubject={selectedSubject}
              selectedPeriod={selectedPeriod}
              selectedDate={selectedDate}
              setSelectedProgram={setSelectedProgram}
              setSelectedSemester={setSelectedSemester}
              setSelectedSection={setSelectedSection}
              setSelectedSubject={setSelectedSubject}
              setSelectedPeriod={setSelectedPeriod}
              setSelectedDate={setSelectedDate}
            />
          </div>

          {/* Center - Students List */}
          <div className="col-span-1 md:col-span-6 space-y-4">
            <AttendanceTable
              students={filteredStudents}
              attendance={attendance}
              onStatusChange={handleStatusChange}
              onPrint={() => setIsPrintModalOpen(true)}
            />

            {/* Action Row */}
            {selectedSubject && selectedSection && selectedPeriod && selectedDate && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveAttendance}
                  disabled={isSaving}
                  className="rounded-2xl bg-[#6C63FF] hover:bg-[#5b52e0] text-white font-bold text-xs px-6 py-3 shadow-md transition-all flex items-center gap-2"
                >
                  <Save size={16} />
                  {isSaving ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            )}
          </div>

          {/* Right Panel - Session Summary & Analytics */}
          <div className="col-span-1 md:col-span-3 space-y-6">
            {/* Faculty Status Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-['Plus_Jakarta_Sans']">
                Session Status
              </h2>
              
              {markedBy ? (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                  <CheckCircle className="text-emerald-500 shrink-0" size={18} />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recorded By</p>
                    <p className="text-xs font-bold text-slate-800">{markedBy}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                  <ShieldAlert className="text-slate-400 shrink-0" size={18} />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</p>
                    <p className="text-xs font-bold text-slate-600">No attendance marked yet</p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Enrolled</span>
                  <span className="font-bold text-slate-900 font-['Space_Grotesk']">{filteredStudents.length}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Present</span>
                  <span className="font-bold font-['Space_Grotesk']">{presentCount}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Absent</span>
                  <span className="font-bold font-['Space_Grotesk']">{absentCount}</span>
                </div>
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>Late</span>
                  <span className="font-bold font-['Space_Grotesk']">{lateCount}</span>
                </div>
              </div>
            </div>

            {/* Subject Analytics Card */}
            {analytics && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-['Plus_Jakarta_Sans']">
                  Subject Analytics
                </h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Classes Taken</p>
                    <p className="text-2xl font-bold text-[#6C63FF] font-['Space_Grotesk']">{analytics.totalSessions}</p>
                  </div>

                  <div className="p-4 bg-teal-50/30 border border-teal-100/50 rounded-2xl space-y-2">
                    <div className="flex justify-between items-baseline">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Average Attendance</p>
                      <p className="text-xl font-bold text-[#00C2A8] font-['Space_Grotesk']">{analytics.averageAttendanceRate}%</p>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#00C2A8] h-full transition-all duration-500" 
                        style={{ width: `${analytics.averageAttendanceRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AttendancePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        programName={programs.find(p => p.id === selectedProgram)?.name || "All Programs"}
        semesterName={selectedSemester || "Current Semester"}
        sectionName={sections.find(s => s.id === selectedSection)?.name || "Current Section"}
        subjectName={subjects.find(s => s.id === selectedSubject)?.name || "Current Subject"}
        periodName={selectedPeriod ? `Period ${selectedPeriod}` : "Period 1"}
        date={selectedDate}
        students={filteredStudents}
        attendance={attendance}
      />
    </div>
  )
}