export default function StudentTodoLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title & Description skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-slate-200 rounded-2xl" />
        <div className="h-4 w-96 bg-slate-100 rounded-xl" />
      </div>

      {/* Filter Options Bar */}
      <div className="h-14 w-full bg-white border border-slate-100 rounded-2xl shadow-sm" />

      {/* List wrapper */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        {/* Todo rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3.5 border-b border-slate-50 last:border-0">
            {/* Checkbox placeholder */}
            <div className="w-5 h-5 bg-slate-250 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-slate-200 rounded-lg w-1/3" />
              <div className="h-3 bg-slate-100 rounded-lg w-1/5" />
            </div>
            {/* Tag label */}
            <div className="h-6 bg-slate-100 rounded-lg w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
