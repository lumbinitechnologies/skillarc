import type { SupabaseClient } from "@supabase/supabase-js"
import { ROLES } from "@/constants/roles"
import { allPages, batches, PAGE_SIZE, result, scopeDenied, type AcademicScope, type Named } from "./academic-scope"
import { isCalendarDate, periodTimings, taskDeadline, uniqueLocalInstant } from "./academic-time"

export class InvalidAcademicSelector extends Error {}

export function readTimetableSelectors(url: URL) {
  const selector = (name: string) => {
    const values = url.searchParams.getAll(name)
    if (values.length > 1 || values[0] === "") throw new InvalidAcademicSelector(`Invalid ${name}`)
    return values[0] ?? null
  }
  const date = selector("date")
  const weekId = selector("week_id")
  if (date !== null && !isCalendarDate(date)) throw new InvalidAcademicSelector("Invalid date")
  if (weekId !== null && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(weekId)) {
    throw new InvalidAcademicSelector("Invalid week_id")
  }
  return { date, weekId: weekId?.toLowerCase() ?? null }
}

type Subject = Named & { code: string | null; subject_type: "THEORY" | "LAB" | "ELECTIVE" | null }

function unique(ids: (string | null)[]) {
  return [...new Set(ids.filter((id): id is string => id !== null))].sort()
}

async function authorizedSubjects(db: SupabaseClient, scope: AcademicScope) {
  const ids = unique(scope.relationships.map(relation => relation.subject_id))
  const subjects: Subject[] = []
  for (const group of batches(ids)) {
    subjects.push(...await allPages<Subject>(after => {
      const query = db.from("subjects").select("id,name,code,subject_type")
        .eq("institution_id", scope.institution).in("id", group).order("id").limit(PAGE_SIZE)
      return after ? query.gt("id", after) : query
    }))
  }
  return new Map(subjects.map(subject => [subject.id, subject]))
}

async function facultyNames(db: SupabaseClient, scope: AcademicScope, ids: string[]) {
  const faculty = new Map<string, Named>()
  for (const group of batches(ids)) {
    const rows = await allPages<Named>(after => {
      const query = db.from("users").select("id,name").eq("institution_id", scope.institution)
        .eq("organization_id", scope.organization).eq("role", ROLES.FACULTY).eq("is_active", true)
        .in("id", group).order("id").limit(PAGE_SIZE)
      return after ? query.gt("id", after) : query
    })
    for (const row of rows) faculty.set(row.id, row)
  }
  return faculty
}

export async function readCourses(db: SupabaseClient, scope: AcademicScope) {
  const subjects = await authorizedSubjects(db, scope)
  const relations = scope.relationships.filter(relation => subjects.has(relation.subject_id))
  const links: { subject_id: string; faculty_id: string | null }[] = relations.map(relation => ({
    subject_id: relation.subject_id, faculty_id: relation.trainer_id,
  }))
  for (const section of scope.sections.values()) {
    const ids = unique(relations.filter(relation => relation.section_id === section.id).map(relation => relation.subject_id))
    for (const group of batches(ids)) {
      links.push(...await allPages<{ id: string; subject_id: string; faculty_id: string }>(after => {
        const query = db.from("faculty_subjects").select("id,subject_id,faculty_id")
          .eq("institution_id", scope.institution).eq("section_id", section.id)
          .in("subject_id", group).order("id").limit(PAGE_SIZE)
        return after ? query.gt("id", after) : query
      }))
    }
  }
  const faculty = await facultyNames(db, scope, unique(links.map(link => link.faculty_id)))
  return {
    context: scope.context,
    courses: [...subjects.values()].map(subject => ({
      id: subject.id, name: subject.name, code: subject.code, type: subject.subject_type,
      faculty: unique(links.filter(link => link.subject_id === subject.id).map(link => link.faculty_id))
        .flatMap(id => faculty.get(id) ?? []),
      programs: unique(relations.filter(relation => relation.subject_id === subject.id).map(relation => relation.program_id))
        .flatMap(id => scope.programs.get(id) ?? []),
      sections: unique(relations.filter(relation => relation.subject_id === subject.id).map(relation => relation.section_id))
        .flatMap(id => {
          const section = scope.sections.get(id)
          return section ? [{ id: section.id, name: section.name }] : []
        }),
    })).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "en") || a.id.localeCompare(b.id)),
  }
}

const taskTypes = {
  Assignment: "assignment", assignment: "assignment",
  Quiz: "quiz", quiz: "quiz",
  Coding: "coding", coding: "coding", "Coding Assignment": "coding",
} as const

type Assignment = {
  id: string; subject_id: string; title: string; type: keyof typeof taskTypes;
  due_date: string | null; due_at: string | null
}

export async function readTasks(db: SupabaseClient, scope: AcademicScope) {
  const subjects = await authorizedSubjects(db, scope)
  const matchingSections = new Map<string, string[]>()
  for (const subjectId of subjects.keys()) {
    matchingSections.set(subjectId, unique(scope.relationships.filter(relation =>
      relation.subject_id === subjectId).map(relation => relation.section_id)))
  }
  // Group only courses that share the same targeting predicate. A section
  // linked to a different enrollment must never authorize this course's tasks.
  const groups = new Map<string, string[]>()
  for (const [subject, sections] of matchingSections) {
    const key = sections.join(",")
    groups.set(key, [...(groups.get(key) ?? []), subject])
  }
  const assignments: Assignment[] = []
  for (const [sectionKey, ids] of groups) {
    const targeting = ["section_ids.is.null", "section_ids.eq.{}"]
    if (sectionKey) targeting.push(`section_ids.ov.{${sectionKey}}`)
    for (const group of batches(ids)) {
      assignments.push(...await allPages<Assignment>(after => {
        const query = db.from("assignments").select("id,subject_id,title,type,due_date,due_at")
          .in("subject_id", group).in("type", Object.keys(taskTypes)).or(targeting.join(","))
          .order("id").limit(PAGE_SIZE)
        return after ? query.gt("id", after) : query
      }))
    }
  }
  const submitted = new Set<string>()
  for (const group of batches(assignments.map(assignment => assignment.id))) {
    const rows = await allPages<{ id: string; assignment_id: string }>(after => {
      const query = db.from("submissions").select("id,assignment_id").eq("student_id", scope.studentId)
        .in("assignment_id", group).order("id").limit(PAGE_SIZE)
      return after ? query.gt("id", after) : query
    })
    for (const row of rows) submitted.add(row.assignment_id)
  }
  const tasks = assignments.flatMap(assignment => {
    const course = subjects.get(assignment.subject_id)
    const type = Object.hasOwn(taskTypes, assignment.type) ? taskTypes[assignment.type] : null
    if (!course || !type || submitted.has(assignment.id)) return []
    return [{
      id: assignment.id, title: assignment.title, type,
      course_id: course.id, course_name: course.name, course_code: course.code,
      ...taskDeadline(assignment.due_at, assignment.due_date, scope.now),
      mobile_action: "unavailable" as const,
      availability_message: type === "assignment"
        ? "Assignment details and submission are not available in this version yet."
        : "Available on the website; completing this task is not supported in mobile v1.",
    }]
  })
  tasks.sort((a, b) => {
    if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at) || a.id.localeCompare(b.id)
    if (a.due_at) return -1
    if (b.due_at) return 1
    return a.id.localeCompare(b.id)
  })
  return { context: scope.context, as_of: scope.now.toISOString(), tasks }
}

type Week = { id: string; week_number: number; title: string | null; start_date: string; end_date: string; section_id: string }
type Slot = {
  id: string; period: number; subject_id: string; faculty_id: string | null; room: string | null;
  delivery_mode: "ON_CAMPUS" | "ONLINE" | "HYBRID" | null;
}
type Closure = { id: string; title: string; start_date: string; end_date: string; affects_classes: boolean | null }

const weekFields = "id,week_number,title,start_date,end_date,section_id"
const inWeek = (week: Week, date: string) => week.start_date <= date && date <= week.end_date

function offsetDate(date: string, days: number) {
  const instant = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
  if (instant.getUTCFullYear() < 1) return "0001-01-01"
  if (instant.getUTCFullYear() > 9999) return "9999-12-31"
  return instant.toISOString().slice(0, 10)
}

export async function readTimetable(db: SupabaseClient, scope: AcademicScope, selectors: ReturnType<typeof readTimetableSelectors>) {
  let requestedWeek: Week | null = null
  if (selectors.weekId) {
    if (!scope.multiweek) scopeDenied()
    for (const section of scope.sections.values()) {
      requestedWeek = result<Week>(await db.from("timetable_weeks").select(weekFields)
        .eq("institution_id", scope.institution).eq("section_id", section.id)
        .eq("semester", section.semester).eq("id", selectors.weekId).maybeSingle())
      if (requestedWeek) break
    }
    if (!requestedWeek) scopeDenied()
    if (selectors.date && !inWeek(requestedWeek, selectors.date)) {
      throw new InvalidAcademicSelector("Date does not belong to the selected week")
    }
  }
  const date = selectors.date ?? (requestedWeek && (!scope.clock.today || !inWeek(requestedWeek, scope.clock.today))
    ? requestedWeek.start_date : scope.clock.today)
  const weeks: Week[] = []
  if (scope.multiweek && date) {
    // Limit the week selector to a rolling window around the selected date.
    // Page every eligible week inside the window, including short DB pages.
    const first = offsetDate(date, -28)
    const last = offsetDate(date, 84)
    for (const section of scope.sections.values()) {
      weeks.push(...await allPages<Week>(after => {
        const query = db.from("timetable_weeks").select(weekFields)
          .eq("institution_id", scope.institution).eq("section_id", section.id)
          .eq("semester", section.semester).lte("start_date", last).gte("end_date", first)
          .order("id").limit(PAGE_SIZE)
        return after ? query.gt("id", after) : query
      }))
    }
  }
  weeks.sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id.localeCompare(b.id))
  const dateWeeks = requestedWeek ? [requestedWeek] : weeks.filter(week => date && inWeek(week, date))
  const selectedWeek = dateWeeks.length === 1 ? dateWeeks[0] : null
  const base = {
    context: scope.context, date, today: scope.clock.today, time_zone: scope.clock.time_zone,
    time_zone_status: scope.clock.status, multiweek_enabled: scope.multiweek, weeks,
    selected_week_id: selectedWeek?.id ?? null,
  }

  const empty = (empty_reason: "time_zone_unavailable" | "no_enrollment" | "no_section") => ({
    ...base, sessions: [], closures: [], empty_reason,
    next_class: { state: empty_reason === "time_zone_unavailable" ? "time_zone_unavailable" : "none", session_id: null },
  })
  if (!scope.sections.size) return empty(scope.context.status === "no_enrollment" ? "no_enrollment" : "no_section")
  if (!date) return empty("time_zone_unavailable")

  const [subjects, rawSettings, closures] = await Promise.all([
    authorizedSubjects(db, scope),
    db.from("institution_timetable_settings").select("period_timings")
      .eq("institution_id", scope.institution).maybeSingle(),
    allPages<Closure>(after => {
      const query = db.from("academic_calendar_events").select("id,title,start_date,end_date,affects_classes")
        .eq("institution_id", scope.institution).lte("start_date", date).gte("end_date", date)
        .order("id").limit(PAGE_SIZE)
      return after ? query.gt("id", after) : query
    }),
  ])
  const timings = periodTimings(result<{ period_timings: unknown }>(rawSettings)?.period_timings)
  const weekday = new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`))
  const closed = closures.some(closure => closure.affects_classes === true)
  const slots: Slot[] = []
  let noWeek = false
  if (!closed) {
    for (const section of scope.sections.values()) {
      if (requestedWeek && requestedWeek.section_id !== section.id) continue
      const active = dateWeeks.filter(week => week.section_id === section.id)
      if (active.length > 1) throw new Error("Overlapping academic weeks")
      if (scope.multiweek && weeks.some(week => week.section_id === section.id) && !active.length) {
        noWeek = true
        continue
      }
      const sectionCourses = unique(scope.relationships.filter(relation =>
        relation.section_id === section.id && subjects.has(relation.subject_id)).map(relation => relation.subject_id))
      for (const group of batches(sectionCourses)) {
        slots.push(...await allPages<Slot>(after => {
          let query = db.from("timetable_slots").select("id,period,subject_id,faculty_id,room,delivery_mode")
            .eq("institution_id", scope.institution).eq("organization_id", scope.organization)
            .eq("section_id", section.id).eq("semester", section.semester).eq("day", weekday)
            .in("subject_id", group).not("period", "is", null).order("id").limit(PAGE_SIZE)
          query = active.length ? query.eq("week_id", active[0].id) : query.is("week_id", null)
          return after ? query.gt("id", after) : query
        }))
      }
    }
  }

  const faculty = await facultyNames(db, scope, unique(slots.map(slot => slot.faculty_id)))
  slots.sort((a, b) => a.period - b.period || a.id.localeCompare(b.id))
  let unreliableTime = false
  let next: { id: string; startsAt: number } | null = null
  const timeZone = scope.clock.time_zone
  const todayOrFuture = scope.clock.today !== null && date >= scope.clock.today
  const sessions = slots.map(slot => {
    const course = subjects.get(slot.subject_id)!
    const timing = timings.get(slot.period)
    const start = timing && timeZone ? uniqueLocalInstant(date, timing.start, timeZone) : null
    const end = timing && timeZone ? uniqueLocalInstant(date, timing.end, timeZone) : null
    const reliable = start !== null && end !== null && end > start
    if (todayOrFuture && !reliable) unreliableTime = true
    if (reliable && start >= scope.now.getTime() && (!next || start < next.startsAt)) {
      next = { id: slot.id, startsAt: start }
    }
    return {
      id: slot.id, period: slot.period, course_id: course.id, course_name: course.name,
      course_code: course.code, faculty_name: faculty.get(slot.faculty_id ?? "")?.name ?? null,
      time_label: timing?.label ?? null, room: slot.room, delivery_mode: slot.delivery_mode,
      state: timing && (!timeZone || reliable) ? "scheduled" : "timings_unavailable",
    }
  })
  const nextSession = next as { id: string; startsAt: number } | null
  const next_class = !timeZone ? { state: "time_zone_unavailable", session_id: null }
    : unreliableTime ? { state: "timings_unavailable", session_id: null }
    : nextSession ? { state: "scheduled", session_id: nextSession.id }
    : { state: "none", session_id: null }

  return {
    ...base, sessions, closures: closures.map(closure => ({ ...closure, affects_classes: closure.affects_classes === true })),
    empty_reason: sessions.length > 0 ? null : closed ? "academic_closure" : noWeek ? "no_week" : "no_classes",
    next_class,
  }
}
