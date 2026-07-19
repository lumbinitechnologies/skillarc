export default function DashboardOverviewLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Greeting */}
      <div className="space-y-2">
        <div className="h-7 w-64 rounded bg-muted" />
        <div className="h-4 w-96 rounded bg-muted/60" />
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 border border-border rounded-xl bg-card flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-muted/60" />
              <div className="h-6 w-12 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 border border-border rounded-xl bg-card" />
        <div className="h-80 border border-border rounded-xl bg-card" />
      </div>
    </div>
  );
}
