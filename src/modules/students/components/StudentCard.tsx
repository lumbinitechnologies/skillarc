import type { StudentWithSection } from "../types/student.types"
import { Button } from "@/components/ui/button"

interface Props {
  student: StudentWithSection
  onEdit: (student: StudentWithSection) => void
  onDelete: (id: string) => void
}

export default function StudentCard({
  student,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

      <div className="flex items-center gap-4">

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-xl font-bold text-white">
          {student.name?.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold">
            {student.name}
          </h3>

          <p className="text-sm text-gray-500">
            {student.email}
          </p>
        </div>

      </div>

      <div className="mt-6 space-y-3 text-sm">

        <div className="flex justify-between">
          <span className="text-gray-500">
            Registration
          </span>

          <span className="font-medium">
            {student.registration_number || "-"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">
            Semester
          </span>

          <span className="font-medium">
            {student.semester || "-"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">
            Section
          </span>

          <span className="font-medium">
            {student.section?.name || "-"}
          </span>
        </div>

      </div>

      <div className="mt-6 flex gap-2">

        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onEdit(student)}
        >
          Edit
        </Button>

        <Button
          variant="destructive"
          className="flex-1"
          onClick={() => onDelete(student.id)}
        >
          Delete
        </Button>

      </div>

    </div>
  )
}