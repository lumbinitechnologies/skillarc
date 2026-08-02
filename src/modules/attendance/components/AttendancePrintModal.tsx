"use client"

import { Printer, X, Download, CheckCircle2, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AttendancePrintModalProps {
  isOpen: boolean
  onClose: () => void
  programName?: string
  semesterName?: string
  sectionName?: string
  subjectName?: string
  periodName?: string
  date: string
  students: any[]
  attendance: Record<string, string>
}

export default function AttendancePrintModal({
  isOpen,
  onClose,
  programName = "All Programs",
  semesterName = "All Semesters",
  sectionName = "All Sections",
  subjectName = "General Subject",
  periodName = "Period 1",
  date,
  students,
  attendance,
}: AttendancePrintModalProps) {
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const presentCount = students.filter((s) => attendance[s.id] === "Present").length
  const absentCount = students.filter((s) => attendance[s.id] === "Absent").length
  const lateCount = students.filter((s) => attendance[s.id] === "Late").length
  const unmarkedCount = students.length - (presentCount + absentCount + lateCount)
  const attendanceRate = students.length ? Math.round(((presentCount + lateCount) / students.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Container - Normal screen view vs Print view */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden my-8 max-h-[90vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:rounded-none print:my-0 print:p-0">
        
        {/* Modal Top Bar (Hidden on print) */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C63FF]">Attendance Management</span>
            <h2 className="text-lg font-extrabold text-slate-900">Printable Attendance Sheet</h2>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrint}
              className="rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white text-xs font-bold px-4 py-2 shadow-sm hover:opacity-95 transition"
            >
              <Printer size={15} className="mr-2" /> Print / Save PDF
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible font-sans space-y-6" id="printable-attendance-area">
          
          {/* Institution Printable Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-lg bg-[#6C63FF] text-white flex items-center justify-center font-extrabold text-xs">S</span>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">SkillArc Academy</span>
              </div>
              <h1 className="text-xl font-bold text-slate-800">OFFICIAL CLASS ATTENDANCE REGISTER</h1>
              <p className="text-xs text-slate-500 mt-0.5">Academic Record & Session Audit Sheet</p>
            </div>
            <div className="text-right text-xs space-y-1">
              <div className="font-semibold text-slate-800">Date: <span className="font-mono text-slate-900 font-bold">{date}</span></div>
              <div className="text-slate-500">Period / Slot: <span className="font-medium text-slate-700">{periodName}</span></div>
            </div>
          </div>

          {/* Session Metadata Grid */}
          <div className="grid grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs print:bg-white print:border-slate-300">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Program</div>
              <div className="font-bold text-slate-800 mt-0.5">{programName}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Semester & Section</div>
              <div className="font-bold text-slate-800 mt-0.5">Sem {semesterName} - Section {sectionName}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Subject</div>
              <div className="font-bold text-slate-800 mt-0.5">{subjectName}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Attendance Rate</div>
              <div className="font-black text-[#6C63FF] text-sm mt-0.5">{attendanceRate}%</div>
            </div>
          </div>

          {/* Attendance Roster Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-slate-300">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 print:bg-slate-200">
                  <th className="p-3 w-12 text-center border-r border-slate-200">#</th>
                  <th className="p-3 border-r border-slate-200">Reg. No / ID</th>
                  <th className="p-3 border-r border-slate-200">Student Name</th>
                  <th className="p-3 w-28 text-center border-r border-slate-200">Status</th>
                  <th className="p-3 w-32 text-center">Physical Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((student, idx) => {
                  const status = attendance[student.id] || "Unmarked"
                  return (
                    <tr key={student.id} className="print:break-inside-avoid">
                      <td className="p-3 text-center font-mono font-medium text-slate-500 border-r border-slate-200">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-700 border-r border-slate-200">
                        {student.registration_number || student.email?.split("@")[0] || `STU-${student.id.slice(0, 6)}`}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 border-r border-slate-200">{student.name}</td>
                      <td className="p-3 text-center border-r border-slate-200">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          status === "Present"
                            ? "bg-emerald-100 text-emerald-800 print:border print:border-emerald-500"
                            : status === "Absent"
                            ? "bg-rose-100 text-rose-800 print:border print:border-rose-500"
                            : status === "Late"
                            ? "bg-amber-100 text-amber-800 print:border print:border-amber-500"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-3 border-slate-200 text-center text-slate-300">
                        ___________________
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Class Statistics Summary */}
          <div className="grid grid-cols-5 gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold print:bg-white print:border-slate-300">
            <div className="text-slate-600">Total Enrolled: <span className="font-bold text-slate-900">{students.length}</span></div>
            <div className="text-emerald-700">Present: <span className="font-bold">{presentCount}</span></div>
            <div className="text-rose-700">Absent: <span className="font-bold">{absentCount}</span></div>
            <div className="text-amber-700">Late: <span className="font-bold">{lateCount}</span></div>
            <div className="text-slate-500">Unmarked: <span className="font-bold">{unmarkedCount}</span></div>
          </div>

          {/* Signatures & Approvals Section */}
          <div className="pt-8 grid grid-cols-2 gap-12 text-xs border-t border-slate-200 mt-6 print:break-inside-avoid">
            <div className="space-y-8">
              <div className="h-10 border-b border-dashed border-slate-400 w-48"></div>
              <div>
                <p className="font-bold text-slate-800">Faculty / Class Teacher Signature</p>
                <p className="text-[10px] text-slate-500">Recorded Date & Time: {new Date().toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-8 text-right flex flex-col items-end">
              <div className="h-10 border-b border-dashed border-slate-400 w-48"></div>
              <div>
                <p className="font-bold text-slate-800">HOD / Registrar Seal & Verification</p>
                <p className="text-[10px] text-slate-500">SkillArc Academic Operations Desk</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Embedded CSS for Print Styling */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-attendance-area, #printable-attendance-area * {
            visibility: visible;
          }
          #printable-attendance-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  )
}
