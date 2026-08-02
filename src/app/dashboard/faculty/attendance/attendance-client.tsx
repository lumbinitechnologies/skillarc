"use client"

import { useEffect, useMemo, useState } from "react"
import { Save, Printer } from "lucide-react"
import AttendanceFilters from "@/modules/attendance/components/AttendanceFilters"
import AttendanceTable from "@/modules/attendance/components/AttendanceTable"
import AttendancePrintModal from "@/modules/attendance/components/AttendancePrintModal"
import { getExistingAttendanceAction, saveAttendanceAction } from "./actions"

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
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
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
          setSessionNotice(null)
        }
        return
      }

      const periodValue = Number.parseInt(selectedPeriod, 10)
      if (Number.isNaN(periodValue)) {
        if (isActive) {
          setAttendance({})
          setSessionNotice(null)
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
  }, [selectedDate, selectedPeriod, selectedSection, selectedSubject])

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

  const handleSave = async () => {
    if (!selectedSection || !selectedSubject || !selectedDate || !selectedPeriod) {
      setFeedback("Please choose a section, subject, date and period first.")
      return
    }

    if (!Object.keys(attendance).length) {
      setFeedback("Select at least one student status before saving.")
      return
    }

    setIsSaving(true)
    setFeedback(null)

    const periodValue = Number.parseInt(selectedPeriod, 10)

    const result = await saveAttendanceAction({
      subjectId: selectedSubject,
      sectionId: selectedSection,
      attendanceDate: selectedDate,
      period: Number.isNaN(periodValue) ? 0 : periodValue,
      records: attendance,
    })

    setIsSaving(false)

    if (result.success) {
      setFeedback("Attendance saved successfully.")
    } else {
      setFeedback(result.error ?? "Unable to save attendance right now.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Faculty Attendance</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Attendance Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Mark attendance for your current class, review prior marks, and save the session in one place.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-700">Current session</p>
          <p className="text-lg font-semibold text-emerald-900">{selectedSection ? "Ready to mark" : "Select a class"}</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-3 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setIsSetupCollapsed((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <span>Class setup</span>
              <span className="text-slate-500">{isSetupCollapsed ? "+" : "−"}</span>
            </button>
            {!isSetupCollapsed && (
              <div className="mt-4">
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
            )}
            {isSetupCollapsed && (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                {selectedSection ? `${selectedSubject ? "Ready" : "Subject pending"} · ${selectedSection ? "Section selected" : "Section pending"}` : "Choose a class to start marking"}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-6 space-y-4">
          <AttendanceTable
            students={filteredStudents}
            attendance={attendance}
            onStatusChange={handleStatusChange}
            onPrint={() => setIsPrintModalOpen(true)}
          />
        </div>

        <div className="col-span-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Summary</h2>
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                {completionPercent}% done
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Students in view</span>
                <span className="font-semibold text-slate-900">{totalStudents}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${completionPercent}%` }} />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {markedCount} of {totalStudents} marked
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-medium">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <div className="text-base font-semibold">{presentCount}</div>
                  <div>Present</div>
                </div>
                <div className="rounded-xl bg-rose-50 p-2 text-rose-700">
                  <div className="text-base font-semibold">{absentCount}</div>
                  <div>Absent</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                  <div className="text-base font-semibold">{lateCount}</div>
                  <div>Late</div>
                </div>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {isSaving ? "Saving..." : "Save Attendance"}
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <Printer size={16} className="text-[#6C63FF]" />
              Print Attendance Sheet
            </button>
            {sessionNotice ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                {sessionNotice}
              </div>
            ) : null}
            {feedback ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                {feedback}
              </div>
            ) : null}
          </div>
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
