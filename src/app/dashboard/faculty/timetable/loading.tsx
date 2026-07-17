export default function FacultyTimetableLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page Title & Subtitle skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-slate-200 rounded-2xl" />
        <div className="h-4 w-96 bg-slate-100 rounded-xl" />
      </div>

      {/* Grid calendar view selector */}
      <div className="h-14 w-full bg-white border border-slate-100 rounded-2xl shadow-sm" />

      {/* Timetable Grid skeleton */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        {/* Table header */}
        <div className="grid grid-cols-6 gap-4 border-b border-slate-100 pb-4">
          <div className="h-5 bg-slate-200 rounded-lg w-16" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 bg-slate-200 rounded-lg w-24 mx-auto" />
          ))}
        </div>

        {/* Table slots */}
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 gap-4 py-3 border-b border-slate-50 last:border-0 items-center">
            {/* Day name placeholder */}
            <div className="h-5 bg-slate-200 rounded-lg w-16" />
            {/* 5 slot cards */}
            {Array.from({ length: 5 }).map((_, colIndex) => (
              <div key={colIndex} className="h-16 bg-slate-50/50 border border-slate-100/40 rounded-2xl p-3 flex flex-col justify-between">
                <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
