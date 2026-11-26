export default function StudentEmptyState() {
  return (
    <div className="rounded-3xl border bg-white py-20 text-center shadow-sm">

      <div className="text-6xl">
        🎓
      </div>

      <h2 className="mt-6 text-2xl font-semibold">
        No Students Found
      </h2>

      <p className="mt-2 text-gray-500">
        Try changing the filters or create a new student.
      </p>

    </div>
  )
}