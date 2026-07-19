export default function ListLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-muted" />
          <div className="h-4 w-64 rounded bg-muted/60" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-muted" />
      </div>
      <div className="h-12 w-full rounded bg-muted/40" />
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="h-10 border-b border-border bg-muted/30" />
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted/60" />
                </div>
              </div>
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
