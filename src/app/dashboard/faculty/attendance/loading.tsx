export default function FacultyAttendanceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title & Description skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-slate-200 rounded-2xl" />
        <div className="h-4 w-96 bg-slate-100 rounded-xl" />
      </div>

      {/* Stats Cards (5 blocks) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-3xl p-5 space-y-3 shadow-sm">
            <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
            <div className="h-8 bg-slate-200 rounded-xl w-1/2" />
          </div>
        ))}
      </div>

      {/* Filter and Action Bar */}
      <div className="h-14 w-full bg-white border border-slate-100 rounded-2xl shadow-sm" />

      {/* Log list table */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="h-5 bg-slate-200 rounded-lg w-32" />
          <div className="h-5 bg-slate-100 rounded-lg w-20" />
        </div>

        {/* Attendance Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-slate-200 rounded-lg w-1/4" />
              <div className="h-3 bg-slate-100 rounded-lg w-1/3" />
            </div>
            <div className="h-6 bg-slate-100 rounded-lg w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
