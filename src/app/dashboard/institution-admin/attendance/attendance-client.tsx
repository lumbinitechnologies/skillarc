"use client"

import { useState, useEffect } from "react"
import { Printer, Calendar, Clock, Award, ShieldAlert, CheckCircle, BookOpen, Save } from "lucide-react"
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
}

export default function AttendanceClient({
  institutionId,
  programs,
  sections,
  subjects,
  students,
}: Props) {
  const { toast } = useToast()
  
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

  // Fetch attendance records for selected criteria
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
          // If no session exists, reset to empty
          setAttendance({})
          setMarkedBy(null)
        }
      } catch (err) {
        console.error("Error loading attendance records:", err)
      }
    }

    loadAttendance()
  }, [selectedSubject, selectedSection, selectedPeriod, selectedDate])

  // Fetch subject-section analytics
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
            Attendance Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review live attendance sessions, track institutional analytics, and manage class sheets.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsPrintModalOpen(true)}
            className="rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white text-xs font-bold px-4 py-2.5 shadow-sm hover:opacity-95 transition"
          >
            <Printer size={16} className="mr-2" /> Print Attendance Sheet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
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