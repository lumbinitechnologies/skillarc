export default function AppLoading() {
  return (
    <div className="min-h-screen bg-[#EFEAD8] text-[#0B132B] p-6 md:p-8 font-['Space_Grotesk',sans-serif]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[#0B132B]/10" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-3xl border-2 border-[#0B132B]/10 bg-white/40 shadow-sm"
            />
          ))}
        </div>
      </div>
    </div>
  )
}