/** Institution policy only. User preferences must never be passed as a fallback. */
export function isAcademicTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) return false
  // Reject locale offsets and ambiguous abbreviations accepted by some runtimes.
  if (value !== "UTC" && !/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(value))
    return false
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0)
    return true
  } catch {
    return false
  }
}

export function academicTimeContext(value: unknown, now: Date) {
  if (!isAcademicTimeZone(value)) {
    return {
      time_zone: null,
      today: null,
      status:
        value === null || value === undefined
          ? ("unconfigured" as const)
          : ("invalid" as const),
    }
  }
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: value,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const part = (type: string) => parts.find((item) => item.type === type)!.value
  return {
    time_zone: value,
    today: `${part("year")}-${part("month")}-${part("day")}`,
    status: "ready" as const,
  }
}
