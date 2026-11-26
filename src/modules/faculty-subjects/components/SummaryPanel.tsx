interface Props {
  facultyName?: string
  totalSubjects: number
  selectedSubjects: number
  hasChanges: boolean
  semester1: number
  semester2: number
  semester3: number
  semester4: number
}

export default function SummaryPanel({
  facultyName,
  totalSubjects,
  selectedSubjects,
  hasChanges,
  semester1,
  semester2,
  semester3,
  semester4,
}: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 sticky top-6">

      {!facultyName ? (
        <div className="py-16 text-center">
          <div className="text-5xl">👨‍🏫</div>
          <p className="mt-4 font-semibold">No Faculty Selected</p>
          <p className="text-sm text-gray-500 mt-2">Select a faculty member</p>
        </div>
      ) : (
        <>
          {/* Profile header */}
          <div className="flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {facultyName
                ?.split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <h2 className="mt-5 text-xl font-bold">
              {facultyName}
            </h2>

            <span className="mt-2 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Active Faculty
            </span>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-4 mt-8">

            <div className="rounded-xl bg-violet-50 p-4">
              <p className="text-xs uppercase text-violet-500">Subjects</p>
              <p className="mt-2 text-3xl font-bold text-violet-700">
                {selectedSubjects}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs uppercase text-emerald-500">Status</p>
              <p className="mt-2 font-semibold text-emerald-700">
                {hasChanges ? "Unsaved" : "Saved"}
              </p>
            </div>

          </div>

          {/* Semester Distribution */}
          <div className="mt-6">
            <p className="text-xs uppercase text-gray-400 mb-3">
              Semester Distribution
            </p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Semester I</span>
                <span className="font-medium">{semester1}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Semester II</span>
                <span className="font-medium">{semester2}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Semester III</span>
                <span className="font-medium">{semester3}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Semester IV</span>
                <span className="font-medium">{semester4}</span>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}