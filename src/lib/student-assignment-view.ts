type QuestionRecord = { q: string; options: string[] }

export type StudentAssignmentSource = {
  questions: unknown
  test_cases: unknown
  [key: string]: unknown
}

export function toStudentAssignmentView<T extends StudentAssignmentSource>(
  assignment: T,
): Omit<T, "questions" | "test_cases"> & { questions: QuestionRecord[] | null; test_cases: null } {
  const questions = Array.isArray(assignment.questions)
    ? assignment.questions.flatMap((question): QuestionRecord[] => {
        if (!question || typeof question !== "object" || Array.isArray(question)) return []
        const record = question as Record<string, unknown>
        if (typeof record.q !== "string" || !Array.isArray(record.options) || !record.options.every((option) => typeof option === "string")) return []
        return [{ q: record.q, options: record.options }]
      })
    : null

  return { ...assignment, questions, test_cases: null }
}
