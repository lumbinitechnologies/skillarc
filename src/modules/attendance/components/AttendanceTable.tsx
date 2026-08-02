import { UserRound, Printer } from "lucide-react"

interface Props {
  students: any[]
  attendance: Record<string, string>
  onStatusChange: (studentId: string, status: string) => void
  onPrint?: () => void
}

const STATUS = [
  {
    value: "Present",
    color: "bg-emerald-500",
    label: "Present",
  },
  {
    value: "Absent",
    color: "bg-rose-500",
    label: "Absent",
  },
  {
    value: "Late",
    color: "bg-amber-500",
    label: "Late",
  },
]

export default function AttendanceTable({
  students,
  attendance,
  onStatusChange,
  onPrint,
}: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Students</h2>
            <p className="mt-1 text-sm text-slate-500">
              {students.length} student{students.length === 1 ? "" : "s"} in the current view
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-xs"
              >
                <Printer size={14} className="text-[#6C63FF]" /> Print Sheet
              </button>
            )}
            <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Quick mark
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {students.map((student) => {
          const currentStatus = attendance[student.id]

          return (
            <div
              key={student.id}
              className="flex flex-col gap-4 px-6 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <UserRound size={18} />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">{student.name}</h3>
                  <p className="text-sm text-slate-500">
                    {student.registration_number || student.email || student.usn || "No ID provided"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => onStatusChange(student.id, s.value)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      currentStatus === s.value
                        ? `${s.color} text-white shadow-sm ring-2 ring-offset-2 ring-offset-white ${
                            s.value === "Present" ? "ring-emerald-200" : s.value === "Absent" ? "ring-rose-200" : "ring-amber-200"
                          }`
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {students.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              👩‍🏫
            </div>
            <h3 className="font-semibold text-gray-700">No students found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Choose a program, semester, or section to load the relevant class list.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}