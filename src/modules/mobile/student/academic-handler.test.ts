import assert from "node:assert/strict"
import { test } from "node:test"
import { createClient } from "@supabase/supabase-js"
import { authorizeMobileProfile, type MobilePrincipal } from "@/lib/mobile-auth"
import { GET as getCourses } from "@/app/api/mobile/v1/student/courses/route"
import { GET as getTasks } from "@/app/api/mobile/v1/student/tasks/route"
import { GET as getTimetable } from "@/app/api/mobile/v1/student/timetable/route"
import { academicHandler } from "./academic-handler"

const id = (n: number) => `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`
const [student, institution, organization, otherInstitution, program, section, otherSection,
  trainer, foreignTrainer, course, course2, foreignCourse, enrollment, week] = Array.from({ length: 14 }, (_, i) => id(i + 1))
const campus = { institution_id: institution, organization_id: organization }
const principal: MobilePrincipal = { id: student, ...campus, department_id: null, role: "STUDENT",
  name: "Student", email: "student@example.invalid", profile_image_url: null, features: [] }

type Row = Record<string, unknown>
function syntheticDatabase() {
  const tables: Record<string, Row[]> = {
    institutions: [{ id: institution, organization_id: organization, academic_time_zone: "Asia/Kolkata" }],
    students: [{ id: student, institution_id: institution, section_id: section, program_id: program }],
    programs: [{ id: program, ...campus, name: "Computing" }],
    sections: [
      { id: section, institution_id: institution, program_id: program, semester: 1, name: "A" },
      { id: otherSection, institution_id: institution, program_id: program, semester: 1, name: "B" },
    ],
    enrolments: [{ id: enrollment, student_id: student, institution_id: institution, program_id: program,
      section_id: section, status: "ENROLLED", started_at: "2026-01-01", ended_at: "2026-12-31" }],
    enrolment_units: [
      { id: id(21), enrolment_id: enrollment, subject_id: course, trainer_id: trainer },
      { id: id(22), enrolment_id: enrollment, subject_id: course2, trainer_id: foreignTrainer },
      { id: id(23), enrolment_id: enrollment, subject_id: foreignCourse, trainer_id: foreignTrainer },
    ].map(unit => ({ ...unit, status: "ACTIVE", planned_start: "2026-01-01", planned_end: "2026-12-31" })),
    subjects: [
      { id: course, institution_id: institution, name: "Algorithms", code: "CS101", subject_type: "THEORY" },
      { id: course2, institution_id: institution, name: "Databases", code: "CS102", subject_type: "LAB" },
      { id: foreignCourse, institution_id: otherInstitution, name: "Outside scope", code: "DENIED" },
    ],
    faculty_subjects: [{ id: id(24), institution_id: institution, section_id: section, faculty_id: trainer, subject_id: course }],
    users: [
      { id: trainer, ...campus, role: "FACULTY", is_active: true, name: "Teacher" },
      { id: foreignTrainer, ...campus, institution_id: otherInstitution, role: "FACULTY", is_active: true, name: "Outside scope" },
    ],
    timetable_weeks: [
      { id: week, institution_id: institution, section_id: section, semester: 1, week_number: 3, title: "Week 3",
        start_date: "2026-10-12", end_date: "2026-10-18" },
      { id: id(25), institution_id: institution, section_id: otherSection, semester: 1, week_number: 3,
        start_date: "2026-10-12", end_date: "2026-10-18" },
      { id: id(26), institution_id: institution, section_id: section, semester: 1, week_number: 12,
        start_date: "2027-10-12", end_date: "2027-10-18" },
    ],
    timetable_slots: [null, week, id(25)].map((week_id, index) => ({
      id: id(30 + index), ...campus, section_id: index === 2 ? otherSection : section, semester: 1,
      week_id, day: "Friday", period: index + 1, subject_id: course, faculty_id: trainer,
      room: "Room 101", delivery_mode: "ON_CAMPUS", meeting_link: "private link",
    })),
    institution_timetable_settings: [{ institution_id: institution, period_timings: [
      { id: "P1", time: "09:00–10:00" }, { id: "P2", time: "10:15–11:15" },
    ] }],
    academic_calendar_events: [],
    assignments: [
      { id: id(40), type: "Assignment", section_ids: [], due_at: "2026-10-15T15:00:00+00:00" },
      { id: id(41), type: "Quiz", section_ids: [section], due_date: "2026-10-15T15:00:00" },
      { id: id(42), type: "Coding Assignment", section_ids: null },
      { id: id(43), type: "Assignment", section_ids: [otherSection] },
      { id: id(44), type: "Assignment", section_ids: [], submitted: true },
      { id: id(45), type: "Material", section_ids: [] },
      { id: id(46), type: "Assignment", section_ids: [], subject_id: foreignCourse },
    ].map(row => ({ subject_id: course, title: "Practice", due_date: null, due_at: null,
      questions: "private answers", files: ["private.pdf"], ...row })),
    submissions: [
      { id: id(50), student_id: student, assignment_id: id(44), grade: 10, code_content: "private code" },
      { id: id(51), student_id: id(70), assignment_id: id(40) },
    ],
  }
  const calls: URL[] = []
  let broken: string | null = null
  const db = createClient("https://database.example.invalid", "dummy", {
    global: { fetch: async (input, init) => {
      const url = new URL(String(input))
      calls.push(url)
      const table = url.pathname.split("/").at(-1)!
      if (table === broken) return Response.json({ message: "private SQL diagnostic" }, { status: 500 })
      assert.ok(table in tables, table)
      let rows = tables[table]
      for (const [key, predicate] of url.searchParams) {
        const [operation, ...rest] = predicate.split(".")
        const literal = rest.join(".")
        if (key === "or") {
          if (predicate.startsWith("(ended_at.")) {
            const date = predicate.match(/ended_at\.gte\.([\d-]+)/)?.[1] ?? ""
            rows = rows.filter(row => row.ended_at === null || String(row.ended_at) >= date)
          } else {
            const overlap = predicate.match(/section_ids\.ov\.\{([^}]*)\}/)?.[1]?.split(",") ?? []
            rows = rows.filter(row => !Array.isArray(row.section_ids) || !row.section_ids.length ||
              row.section_ids.some(sectionId => overlap.includes(sectionId)))
          }
        } else if (operation === "eq") rows = rows.filter(row => String(row[key]) === literal)
        else if (operation === "gt") rows = rows.filter(row => String(row[key]) > literal)
        else if (operation === "gte") rows = rows.filter(row => String(row[key]) >= literal)
        else if (operation === "lte") rows = rows.filter(row => String(row[key]) <= literal)
        else if (operation === "is") rows = rows.filter(row => row[key] === null)
        else if (operation === "not") rows = rows.filter(row => row[key] !== null)
        else if (operation === "in") rows = rows.filter(row => literal.slice(1, -1).split(",")
          .map(value => value.replaceAll('"', "")).includes(String(row[key])))
        else assert.ok(["select", "order", "limit"].includes(key), key)
      }
      if (url.searchParams.get("order") === "id.asc") rows = rows.toSorted((a, b) => String(a.id).localeCompare(String(b.id)))
      const fields = url.searchParams.get("select")!.split(",")
      const selected = rows.slice(0, Math.min(2, Number(url.searchParams.get("limit") ?? 2)))
        .map(row => Object.fromEntries(fields.map(field => [field, row[field]])))
      const single = new Headers(init?.headers).get("accept") === "application/vnd.pgrst.object+json"
      return Response.json(single ? selected[0] ?? null : selected)
    } },
  })
  return { db, tables, calls, fail(table: string) { broken = table } }
}

function request(operation: string) {
  return new Request(`https://skillarc.example.invalid/api/mobile/v1/student/${operation}`, {
    headers: { "x-user-id": id(999), "x-user-role": "SUPER_ADMIN" },
  })
}

function scenario(account = principal) {
  const data = syntheticDatabase()
  const handler = (operation: "courses" | "timetable" | "tasks") => academicHandler(operation, {
    authenticate: async () => account,
    database: () => data.db,
    now: () => new Date("2026-10-16T03:00:00Z"),
  })
  return { ...data, handler }
}

async function body(response: Response, expectedStatus: number) {
  const value = await response.json()
  assert.equal(response.status, expectedStatus, JSON.stringify(value))
  assert.equal(response.headers.get("Cache-Control"), "private, no-store")
  assert.equal(response.headers.get("X-Request-Id"), value.request_id)
  return value
}

test("working route entry points require the verified Bearer session", async () => {
  for (const [route, operation] of [[getCourses, "courses"], [getTimetable, "timetable"], [getTasks, "tasks"]] as const) {
    const value = await body(await route(request(operation)), 401)
    assert.equal(value.error.code, "UNAUTHORIZED")
  }
})

test("course scope is complete across short DB pages and excludes foreign courses and faculty", async () => {
  const data = scenario()
  const { data: actual } = await body(await data.handler("courses")(request("courses")), 200)
  assert.deepEqual(actual.courses.map((item: Row) => item.id), [course, course2])
  assert.deepEqual(actual.courses[0].faculty, [{ id: trainer, name: "Teacher" }])
  assert.deepEqual(actual.courses[1].faculty, [])
  assert.ok(data.calls.some(url => url.pathname.endsWith("/enrolment_units") && url.searchParams.has("id")))
  assert.ok(data.calls.filter(url => url.pathname.endsWith("/subjects")).every(url =>
    url.searchParams.get("institution_id") === `eq.${institution}`))
})

test("formal records suppress fallback after revocation, while zero formal records use explicit section links", async () => {
  const revoked = scenario()
  revoked.tables.enrolments[0].status = "WITHDRAWN"
  const response = await body(await revoked.handler("courses")(request("courses")), 200)
  assert.equal(response.data.context.status, "no_enrollment")
  assert.deepEqual(response.data.courses, [])
  assert.ok(!revoked.calls.some(url => url.pathname.endsWith("/faculty_subjects")))
  const legacy = scenario()
  legacy.tables.enrolments = []
  const fallback = await body(await legacy.handler("courses")(request("courses")), 200)
  assert.deepEqual(fallback.data.courses.map((item: Row) => item.id), [course])
  legacy.tables.faculty_subjects = []
  legacy.tables.timetable_slots = []
  const empty = await body(await legacy.handler("courses")(request("courses")), 200)
  assert.equal(empty.data.context.status, "ready")
  assert.deepEqual(empty.data.courses, [])
  legacy.tables.students[0].section_id = null
  const noSection = await body(await legacy.handler("timetable")(request("timetable")), 200)
  assert.equal(noSection.data.empty_reason, "no_section")
})

test("wrong role, inactive account, tenant mismatch and query errors fail closed", async () => {
  const role = scenario({ ...principal, role: "FACULTY" })
  await body(await role.handler("courses")(request("courses")), 403)
  assert.equal(role.calls.length, 0)
  const inactive = academicHandler("tasks", {
    authenticate: async () => {
      authorizeMobileProfile({ ...principal, is_active: false })
      return principal
    },
    database: () => { throw new Error("Unexpected database access") },
    now: () => new Date(0),
  })
  assert.equal((await body(await inactive(request("tasks")), 403)).error.code, "ACCOUNT_INACTIVE")
  const moved = scenario()
  moved.tables.students[0].institution_id = otherInstitution
  await body(await moved.handler("courses")(request("courses")), 403)
  const failed = scenario()
  failed.fail("enrolments")
  const value = await body(await failed.handler("tasks")(request("tasks")), 503)
  assert.ok(!JSON.stringify(value).includes("private SQL"))
})

test("only authorized, unsubmitted summaries are returned and deadlines come from one server clock", async () => {
  const data = scenario()
  const response = await body(await data.handler("tasks")(request("tasks")), 200)
  assert.equal(response.data.as_of, "2026-10-16T03:00:00.000Z")
  assert.deepEqual(response.data.tasks.map((task: Row) => [task.id, task.type, task.deadline_state, task.status]), [
    [id(40), "assignment", "known", "overdue"],
    [id(41), "quiz", "ambiguous", "pending"],
    [id(42), "coding", "absent", "pending"],
  ])
  assert.equal(response.data.tasks[1].deadline_message, "Deadline unavailable")
  const serialized = JSON.stringify(response)
  for (const field of ["questions", "files", "code_content", "grade", "private"]) assert.ok(!serialized.includes(field), field)
  assert.ok(data.calls.filter(url => url.pathname.endsWith("/submissions")).every(url =>
    url.searchParams.get("student_id") === `eq.${student}`))
})

test("timetable validates static and multiweek selectors, closures and missing configuration", async () => {
  const fixed = scenario()
  const read = fixed.handler("timetable")
  const { data: day } = await body(await read(request("timetable")), 200)
  assert.equal(day.date, "2026-10-16")
  assert.deepEqual(day.weeks, [])
  assert.equal(day.sessions[0].time_label, "09:00–10:00")
  assert.equal(day.next_class.session_id, id(30))
  assert.equal("meeting_link" in day.sessions[0], false)
  await body(await read(request(`timetable?week_id=${week}`)), 403)
  await body(await read(request("timetable?date=2026-02-30")), 400)
  await body(await read(request("timetable?week_id=invalid")), 400)
  await body(await read(request("timetable?date=2026-10-16&date=2026-10-17")), 400)
  fixed.tables.institution_timetable_settings = []
  const untimed = await body(await read(request("timetable")), 200)
  assert.equal(untimed.data.next_class.state, "timings_unavailable")
  fixed.tables.academic_calendar_events = [{
    id: id(70), institution_id: institution, title: "Closure", start_date: "2026-10-16",
    end_date: "2026-10-16", affects_classes: true,
  }]
  const closed = await body(await read(request("timetable")), 200)
  assert.deepEqual(closed.data.sessions, [])
  assert.equal(closed.data.empty_reason, "academic_closure")
  assert.equal(closed.data.next_class.session_id, null)
  fixed.tables.institutions[0].academic_time_zone = null
  const unconfigured = await body(await read(request("timetable")), 200)
  assert.equal(unconfigured.data.today, null)
  assert.equal(unconfigured.data.empty_reason, "time_zone_unavailable")
  const weekly = scenario({ ...principal, features: ["multi_week_timetable"] }).handler("timetable")
  const selected = await body(await weekly(request(`timetable?week_id=${week}`)), 200)
  assert.deepEqual(selected.data.weeks.map((item: Row) => item.id), [week])
  assert.equal(selected.data.sessions[0].id, id(31))
  await body(await weekly(request(`timetable?week_id=${week}&date=2026-10-19`)), 400)
  await body(await weekly(request(`timetable?week_id=${id(25)}`)), 403)
})
