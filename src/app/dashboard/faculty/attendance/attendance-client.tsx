"use client"

import { useEffect, useMemo, useState } from "react"
import { Save, Printer, FileText, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react"
import AttendanceFilters from "@/modules/attendance/components/AttendanceFilters"
import AttendanceTable from "@/modules/attendance/components/AttendanceTable"
import AttendancePrintModal from "@/modules/attendance/components/AttendancePrintModal"
import AttendanceWarningModal from "@/modules/attendance/components/AttendanceWarningModal"
import AttendanceOverwriteModal from "@/modules/attendance/components/AttendanceOverwriteModal"
import {
  getExistingAttendanceAction,
  saveAttendanceAction,
  getStudentCumulativeAttendanceAction,
  saveWarningLetterAction,
} from "./actions"

interface Props {
  facultyId: string
  institutionId: string
  programs: any[]
  sections: any[]
  subjects: any[]
  students: any[]
}

export default function AttendanceClient({
  facultyId,
  institutionId,
  programs,
  sections,
  subjects,
  students,
}: Props) {
  const [selectedProgram, setSelectedProgram] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [sessionNotes, setSessionNotes] = useState("")
  const [studentCumulativeRates, setStudentCumulativeRates] = useState<
    Record<string, { rate: number; total: number; missed: number }>
  >({})
  const [warningModalStudent, setWarningModalStudent] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  const [conflictInfo, setConflictInfo] = useState<{
    isConflict: boolean
    loggedByFacultyName: string
    loggedByFacultyEmail?: string
    loggedSubjectName?: string
    loggedSubjectCode?: string
    loggedSessionNotes?: string
  } | null>(null)
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false)
  const [isSetupCollapsed, setIsSetupCollapsed] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  const filteredStudents = useMemo(
    () =>
      students.filter((student: any) => {
        const matchesProgram = !selectedProgram || student.program_id === selectedProgram
        const matchesSemester = !selectedSemester || String(student.semester) === selectedSemester
        const matchesSection = !selectedSection || student.section_id === selectedSection

        return matchesProgram && matchesSemester && matchesSection
      }),
    [selectedProgram, selectedSection, selectedSemester, students]
  )

  const markedCount = Object.keys(attendance).length
  const totalStudents = filteredStudents.length
  const completionPercent = totalStudents ? Math.round((markedCount / totalStudents) * 100) : 0
  const presentCount = Object.values(attendance).filter((value) => value === "Present").length
  const absentCount = Object.values(attendance).filter((value) => value === "Absent").length
  const lateCount = Object.values(attendance).filter((value) => value === "Late").length
  const approvedAbsenceCount = Object.values(attendance).filter((value) => value === "Approved Absence").length

  useEffect(() => {
    if (typeof window === "undefined") return

    const savedSession = window.localStorage.getItem("faculty-attendance-session")
    if (!savedSession) {
      const hour = new Date().getHours()
      const inferredPeriod = hour < 10 ? "1" : hour < 12 ? "2" : hour < 14 ? "3" : hour < 16 ? "4" : "5"
      setSelectedPeriod((prev) => prev || inferredPeriod)
      return
    }

    try {
      const parsed = JSON.parse(savedSession)
      if (parsed.selectedSemester) setSelectedSemester(parsed.selectedSemester)
      if (parsed.selectedProgram) setSelectedProgram(parsed.selectedProgram)
      if (parsed.selectedSection) setSelectedSection(parsed.selectedSection)
      if (parsed.selectedSubject) setSelectedSubject(parsed.selectedSubject)
      if (parsed.selectedPeriod) setSelectedPeriod(parsed.selectedPeriod)
      if (parsed.selectedDate) setSelectedDate(parsed.selectedDate)
    } catch {
      window.localStorage.removeItem("faculty-attendance-session")
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const payload = {
      selectedProgram,
      selectedSemester,
      selectedSection,
      selectedSubject,
      selectedPeriod,
      selectedDate,
    }

    window.localStorage.setItem("faculty-attendance-session", JSON.stringify(payload))
  }, [selectedDate, selectedPeriod, selectedProgram, selectedSection, selectedSemester, selectedSubject])

  useEffect(() => {
    if (!selectedSemester && sections.length) {
      setSelectedSemester(String(sections[0].semester))
    }
  }, [sections, selectedSemester])

  useEffect(() => {
    let isActive = true

    async function loadExistingSession() {
      if (!selectedSection || !selectedSubject || !selectedDate || !selectedPeriod) {
        if (isActive) {
          setAttendance({})
          setNotes({})
          setSessionNotes("")
          setSessionNotice(null)
          setConflictInfo(null)
        }
        return
      }

      const periodValue = Number.parseInt(selectedPeriod, 10)
      if (Number.isNaN(periodValue)) {
        if (isActive) {
          setAttendance({})
          setNotes({})
          setSessionNotes("")
          setSessionNotice(null)
          setConflictInfo(null)
        }
        return
      }

      const result = await getExistingAttendanceAction({
        subjectId: selectedSubject,
        sectionId: selectedSection,
        attendanceDate: selectedDate,
        period: periodValue,
      })

      if (!isActive) return

      if (result.success && result.exists) {
        setAttendance(result.records ?? {})
        setNotes(result.notes ?? {})
        setSessionNotes(result.sessionNotes ?? "")

        if (result.isLoggedByOther) {
          setConflictInfo({
            isConflict: true,
            loggedByFacultyName: result.loggedByFacultyName || "Another Faculty",
            loggedByFacultyEmail: result.loggedByFacultyEmail || "",
            loggedSubjectName: result.loggedSubjectName || "",
            loggedSubjectCode: result.loggedSubjectCode || "",
            loggedSessionNotes: result.sessionNotes || "",
          })
          setSessionNotice(
            `Attendance for this slot was originally recorded by ${result.loggedByFacultyName || "another faculty member"}${result.loggedSubjectCode ? ` (${result.loggedSubjectCode})` : ""}. Any changes you save will overwrite the existing session.`
          )
        } else {
          setConflictInfo(null)
          setSessionNotice("Existing attendance session loaded. You can edit and save changes.")
        }
      } else {
        setAttendance({})
        setNotes({})
        setSessionNotes("")
        setSessionNotice(null)
        setConflictInfo(null)
      }
    }

    loadExistingSession()

    return () => {
      isActive = false
    }
  }, [selectedDate, selectedPeriod, selectedSection, selectedSubject])

  // Load cumulative student rates for section
  useEffect(() => {
    async function loadCumulative() {
      if (!selectedSection && !institutionId) return
      try {
        const res = await getStudentCumulativeAttendanceAction({
          sectionId: selectedSection || undefined,
          institutionId,
        })
        if (res.success) {
          setStudentCumulativeRates(res.rates || {})
        }
      } catch (err) {
        console.error("Error loading cumulative student attendance:", err)
      }
    }

    loadCumulative()
  }, [selectedSection, institutionId])

  useEffect(() => {
    const semesterSubjects = subjects.filter(
      (subject: any) => !selectedSemester || String(subject.semester) === selectedSemester
    )

    if (!selectedSubject && semesterSubjects.length) {
      setSelectedSubject(semesterSubjects[0].id)
    }
  }, [selectedSemester, selectedSubject, subjects])

  useEffect(() => {
    const availableSections = sections.filter((section: any) => {
      const matchesSemester = !selectedSemester || String(section.semester) === selectedSemester
      const matchesProgram = !selectedProgram || section.program_id === selectedProgram
      return matchesSemester && matchesProgram
    })

    if (!selectedSection && availableSections.length) {
      setSelectedSection(availableSections[0].id)
    }
  }, [sections, selectedProgram, selectedSection, selectedSemester])

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }))
  }

  const handleNoteChange = (studentId: string, note: string) => {
    setNotes((prev) => ({
      ...prev,
      [studentId]: note,
    }))
  }

  const todayIso = new Date().toISOString().slice(0, 10)
  const isFutureDate = selectedDate > todayIso

  async function performSave() {
    setIsSaving(true)
    setFeedback(null)

    const periodValue = Number.parseInt(selectedPeriod, 10)

    const result = await saveAttendanceAction({
      subjectId: selectedSubject,
      sectionId: selectedSection,
      attendanceDate: selectedDate,
      period: Number.isNaN(periodValue) ? 0 : periodValue,
      records: attendance,
      notes,
      sessionNotes,
    })

    setIsSaving(false)
    setIsOverwriteModalOpen(false)

    if (result.success) {
      setConflictInfo(null)
      setFeedback("Attendance records and session notes saved successfully.")
      setSessionNotice("Attendance records saved successfully.")
    } else {
      setFeedback(result.error ?? "Unable to save attendance right now.")
    }
  }

  async function handleSave() {
    if (!selectedSection || !selectedSubject || !selectedDate || !selectedPeriod) {
      setFeedback("Please select a valid class, subject, period, and date before saving.")
      return
    }

    if (selectedDate > todayIso) {
      setFeedback("Attendance cannot be recorded for future dates. Please select today or an earlier date.")
      return
    }

    if (!Object.keys(attendance).length) {
      setFeedback("Select at least one student status before saving.")
      return
    }

    if (conflictInfo?.isConflict) {
      setIsOverwriteModalOpen(true)
      return
    }

    await performSave()
  }

  return (
    <div className="space-y-6 font-sans">
      {/* ── HEADER BANNER ── */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#6C63FF]">
              Faculty Attendance Desk
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
            Attendance Center
          </h1>
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-500">
            Mark session-level attendance, record medical/leave exceptions, detect at-risk students, and print official roll sheets.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Session Status</p>
            <p className="text-sm font-black text-emerald-900 font-['Plus_Jakarta_Sans',sans-serif]">
              {selectedSection ? "Ready to Mark" : "Select Class"}
            </p>
          </div>
        </div>
      </div>

      {/* ── TOP CLASS & SESSION SELECTOR BAR ── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
              Class & Session Setup
            </h2>
            {selectedProgram && selectedSemester && selectedSection && (
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {sections.find((s) => s.id === selectedSection)?.name || "Section"} · {subjects.find((sub) => sub.id === selectedSubject)?.code || "Subject"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSetupCollapsed((prev) => !prev)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            {isSetupCollapsed ? "Edit Setup ▼" : "Collapse ▲"}
          </button>
        </div>

        {!isSetupCollapsed && (
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
        )}
      </div>

      {/* ── CONFLICT WARNING BANNER (When marked by another faculty) ── */}
      {conflictInfo?.isConflict && !isFutureDate && (
        <div className="rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
              <ShieldAlert size={24} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-200/70 border border-amber-300 px-2.5 py-0.5 rounded-full">
                  Slot Conflict Detected
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Recorded by <strong className="text-indigo-700">{conflictInfo.loggedByFacultyName}</strong>
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Attendance for this period was originally logged for{" "}
                <strong className="text-slate-800">{conflictInfo.loggedSubjectName || conflictInfo.loggedSubjectCode || "Subject"}</strong>.
                You can review or adjust records, and clicking Save will prompt you to confirm overwriting.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOverwriteModalOpen(true)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition shrink-0"
          >
            Review Overwrite Options
          </button>
        </div>
      )}

      {/* ── MAIN WORKSPACE: 8-COL ROSTER + 4-COL SUMMARY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Students Roster (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <AttendanceTable
            students={filteredStudents}
            attendance={attendance}
            notes={notes}
            studentAttendanceRates={studentCumulativeRates}
            onStatusChange={handleStatusChange}
            onNoteChange={handleNoteChange}
            onIssueWarning={(stu) =>
              setWarningModalStudent({
                ...stu,
                program_name: programs.find((p) => p.id === selectedProgram)?.name || "Course",
                section_name: sections.find((s) => s.id === selectedSection)?.name || "Section",
              })
            }
            onPrint={() => setIsPrintModalOpen(true)}
          />
        </div>

        {/* Right: Session Summary & Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                Session Summary
              </h2>
              <div className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-black text-emerald-700">
                {completionPercent}% marked
              </div>
            </div>

            {/* Live Progress Bar & Counter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Students in Roster</span>
                <span className="font-bold text-slate-900 font-['Space_Grotesk'] text-sm">{totalStudents}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            {/* 4 Attendance Metric Chips */}
            <div className="grid grid-cols-2 gap-2.5 text-center pt-1">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3 text-emerald-900">
                <div className="text-2xl font-black font-['Space_Grotesk'] text-emerald-700">{presentCount}</div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 mt-0.5">Present</div>
              </div>
              <div className="rounded-2xl bg-rose-50 border border-rose-200/80 p-3 text-rose-900">
                <div className="text-2xl font-black font-['Space_Grotesk'] text-rose-700">{absentCount}</div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 mt-0.5">Absent</div>
              </div>
              <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3 text-amber-900">
                <div className="text-2xl font-black font-['Space_Grotesk'] text-amber-700">{lateCount}</div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 mt-0.5">Late</div>
              </div>
              <div className="rounded-2xl bg-indigo-50 border border-indigo-200/80 p-3 text-indigo-900">
                <div className="text-2xl font-black font-['Space_Grotesk'] text-indigo-700">{approvedAbsenceCount}</div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-800 mt-0.5">Approved</div>
              </div>
            </div>

            {/* Session Notes Input */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText size={13} className="text-[#6C63FF]" /> Class Session Notes
              </label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Log lesson topic covered, lab remarks, or student instructions..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#6C63FF] focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Future Date Alert */}
            {isFutureDate && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>Attendance cannot be logged for future dates. Please select today or an earlier date.</span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || isFutureDate}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-200 transition-all hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={15} />
              {isSaving ? "Saving Session Attendance..." : isFutureDate ? "Future Date Disabled" : "Save Attendance & Notes"}
            </button>

            {/* Secondary Action: Print Sheet */}
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              <Printer size={15} className="text-[#6C63FF]" />
              Print Roll Sheet / Blank Roll
            </button>

            {/* Notice / Feedback Banners */}
            {sessionNotice && !isFutureDate && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                {sessionNotice}
              </div>
            )}

            {feedback && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                {feedback}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Sheet Modal */}
      <AttendancePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        programName={programs.find((p) => p.id === selectedProgram)?.name || "All Programs"}
        semesterName={selectedSemester || "Current Semester"}
        sectionName={sections.find((s) => s.id === selectedSection)?.name || "Current Section"}
        subjectName={subjects.find((s) => s.id === selectedSubject)?.name || "Current Subject"}
        periodName={selectedPeriod ? `Period ${selectedPeriod}` : "Period 1"}
        date={selectedDate}
        students={filteredStudents}
        attendance={attendance}
        notes={notes}
        sessionNotes={sessionNotes}
        trainerName="Faculty Trainer"
      />

      {/* Attendance Warning Notice Modal */}
      <AttendanceWarningModal
        isOpen={Boolean(warningModalStudent)}
        onClose={() => setWarningModalStudent(null)}
        student={warningModalStudent}
        onIssued={async (payload) => {
          await saveWarningLetterAction({
            ...payload,
            institutionId,
            renderedHtml: "",
          })
          setFeedback("Official compliance warning notice logged for this student.")
        }}
      />

      {/* Attendance Conflict / Overwrite Modal */}
      <AttendanceOverwriteModal
        isOpen={isOverwriteModalOpen}
        onClose={() => setIsOverwriteModalOpen(false)}
        onConfirmOverwrite={performSave}
        isSaving={isSaving}
        sectionName={sections.find((s) => s.id === selectedSection)?.name || "Section"}
        periodName={selectedPeriod ? `Period ${selectedPeriod}` : "Period 1"}
        date={selectedDate}
        loggedByFacultyName={conflictInfo?.loggedByFacultyName || "Another Faculty"}
        loggedByFacultyEmail={conflictInfo?.loggedByFacultyEmail}
        loggedSubjectName={conflictInfo?.loggedSubjectName || "Subject"}
        loggedSubjectCode={conflictInfo?.loggedSubjectCode}
        loggedSessionNotes={conflictInfo?.loggedSessionNotes}
      />
    </div>
  )
}
