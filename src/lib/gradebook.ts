export type GradebookColumn = {
  id: string
  subject_id: string
  created_by: string
  title: string
  type: string
  max_score: number
  weight: number
  display_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type GradebookEntry = {
  id?: string
  column_id: string
  student_id: string
  score: number | null
  feedback?: string | null
  graded_by?: string | null
  graded_at?: string | null
  created_at?: string
  updated_at?: string
}

export function buildGradeValueMap(entries: GradebookEntry[]) {
  const map: Record<string, Record<string, string>> = {}

  entries.forEach((entry) => {
    if (!entry || entry.score == null) return

    if (!map[entry.student_id]) {
      map[entry.student_id] = {}
    }

    map[entry.student_id][entry.column_id] = String(entry.score)
  })

  return map
}

export function computeStudentGradeTotal(
  columns: GradebookColumn[],
  entries: GradebookEntry[],
  studentId: string,
  mode: "percentage" | "marks" = "percentage"
) {
  const valueMap = buildGradeValueMap(entries)
  const studentValues = valueMap[studentId] ?? {}

  const total = columns.reduce((sum, column) => {
    const rawValue = studentValues[column.id]
    if (rawValue == null || !Number.isFinite(Number(rawValue))) {
      return sum
    }

    const numericValue = Number(rawValue)
    if (mode === "marks") {
      return sum + Math.min(numericValue, Number(column.max_score || 0))
    }

    if (column.max_score <= 0) {
      return sum
    }

    return sum + (numericValue / Number(column.max_score)) * Number(column.weight || 0)
  }, 0)

  return Number(total.toFixed(1))
}
