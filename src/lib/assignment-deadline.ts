export function parseExplicitInstant(value: string | null | undefined): Date | null {
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

export function assignmentDeadline(
  value: string | null | undefined,
  type: string | null,
  now = Date.now(),
): { value?: string | null; error?: string } {
  if (type === "Material" || type === "Syllabus") return { value: null }
  if (value === undefined) return {}
  if (!value) return { value: null }
  const deadline = parseExplicitInstant(value)
  if (!deadline) {
    return { error: "Enter a deadline with an explicit timezone." }
  }
  if (deadline.getTime() < now - 60_000) {
    return { error: "Due date cannot be in the past. Please select a future date and time." }
  }
  return { value: deadline.toISOString() }
}
