const minuteMs = 60_000
const hourMs = 60 * minuteMs

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) return false
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

/** When the institution is unconfigured, dates are used only to restrict access.
 * Require date-based grants to cover every possible current local date. */
export function enrollmentDateBounds(today: string | null, now: Date) {
  const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10)
  return {
    earliest: today ?? isoDate(now.getTime() - 12 * hourMs),
    latest: today ?? isoDate(now.getTime() + 14 * hourMs),
  }
}

const minuteOfDay = (hour: string, minute: string) => Number(hour) * 60 + Number(minute)

export function periodTimings(value: unknown) {
  const timings = new Map<number, { start: number; end: number; label: string }>()
  if (!Array.isArray(value)) return timings
  const seen = new Set<number>()
  for (const item of value) {
    if (typeof item?.id !== "string" || typeof item?.time !== "string") continue
    const id = /^P([1-9]\d*)$/.exec(item.id)
    if (!id) continue
    const period = Number(id[1])
    if (seen.has(period)) {
      timings.delete(period)
      continue
    }
    seen.add(period)
    const range = /^([01]?\d|2[0-3]):([0-5]\d)\s*[-–]\s*([01]?\d|2[0-3]):([0-5]\d)$/.exec(item.time)
    if (!range) continue
    const [, startHour, startMinute, endHour, endMinute] = range
    const start = minuteOfDay(startHour, startMinute)
    const end = minuteOfDay(endHour, endMinute)
    if (start < end) {
      timings.set(period, {
        start,
        end,
        label: `${startHour.padStart(2, "0")}:${startMinute}–${endHour.padStart(2, "0")}:${endMinute}`,
      })
    }
  }
  return timings
}

/** Map one local period boundary to an instant, rejecting skipped and repeated
 * wall times. Sampling both sides of the local date includes offsets on DST
 * transition days without assuming the size or direction of the change. */
export function uniqueLocalInstant(date: string, minute: number, timeZone: string): number | null {
  const wallTime = Date.parse(`${date}T00:00:00Z`) + minute * minuteMs
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  })
  const asWallTime = (instant: number) => {
    const parts = formatter.formatToParts(instant)
    const read = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)!.value
    return Date.parse(`${read("year").padStart(4, "0")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}:00Z`)
  }
  const offsets = new Set([-36, 0, 36].map(hours => {
    const sample = wallTime + hours * hourMs
    return asWallTime(sample) - sample
  }))
  const matching = [...offsets].map(offset => wallTime - offset).filter(instant => asWallTime(instant) === wallTime)
  return matching.length === 1 ? matching[0] : null
}

export function taskDeadline(absolute: string | null, legacy: string | null, now: Date) {
  if (absolute === null && legacy === null) {
    return { due_at: null, deadline_state: "absent", deadline_message: null, status: "pending" } as const
  }
  const instant = absolute && /(?:Z|[+-]\d{2}:\d{2})$/i.test(absolute) ? Date.parse(absolute) : NaN
  if (!Number.isFinite(instant)) {
    return { due_at: null, deadline_state: "ambiguous", deadline_message: "Deadline unavailable", status: "pending" } as const
  }
  return {
    due_at: new Date(instant).toISOString(),
    deadline_state: "known",
    deadline_message: null,
    status: instant < now.getTime() ? "overdue" : "pending",
  } as const
}
