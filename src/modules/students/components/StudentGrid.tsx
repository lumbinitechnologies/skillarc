import type { StudentWithSection } from "../types/student.types"
import StudentCard from "./StudentCard"
import StudentEmptyState from "./StudentEmptyState"

interface Props {
  students: StudentWithSection[]
  onEdit: (student: StudentWithSection) => void
  onDelete: (id: string) => void
}

export default function StudentGrid({
  students,
  onEdit,
  onDelete,
}: Props) {

  if (students.length === 0) {
    return <StudentEmptyState />
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

      {students.map((student) => (
        <StudentCard
          key={student.id}
          student={student}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

    </div>
  )
}