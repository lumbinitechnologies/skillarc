import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import type { SupabaseClient } from "@supabase/supabase-js"

import { readAuthorizedDashboard, searchPermittedDocuments } from "./read-service"
import { createAssistantTools } from "./tools"
import type { AssistantPrincipal } from "./types"

type Result = { data: unknown; error: Error | null }

function mockSupabase(results: Record<string, unknown> = {}) {
  const calls: string[] = []
  const valueFor = (key: string): unknown => results[key] ?? []
  const builder = (key: string) => {
    const query = {
      select: (value: string) => { calls.push(`${key}.select:${value}`); return query },
      eq: (field: string, value: unknown) => { calls.push(`${key}.eq:${field}=${String(value)}`); return query },
      neq: (field: string, value: unknown) => { calls.push(`${key}.neq:${field}=${String(value)}`); return query },
      gte: (field: string, value: unknown) => { calls.push(`${key}.gte:${field}=${String(value)}`); return query },
      in: (field: string, value: unknown[]) => { calls.push(`${key}.in:${field}=${value.join(",")}`); return query },
      contains: (field: string) => { calls.push(`${key}.contains:${field}`); return query },
      overlaps: (field: string, value: unknown[]) => { calls.push(`${key}.overlaps:${field}=${value.join(",")}`); return query },
      or: (value: string) => { calls.push(`${key}.or:${value}`); return query },
      order: (field: string) => { calls.push(`${key}.order:${field}`); return query },
      limit: (value: number) => { calls.push(`${key}.limit:${value}`); return query },
      maybeSingle: () => query,
      then: (resolve: (result: Result) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve({ data: valueFor(key), error: null }).then(resolve, reject),
    }
    return query
  }
  return {
    calls,
    from: (table: string) => builder(table),
    rpc: (name: string, args?: unknown) => {
      calls.push(`rpc:${name}${args ? `:${JSON.stringify(args)}` : ""}`)
      return builder(`rpc:${name}`)
    },
  } as unknown as SupabaseClient & { calls: string[] }
}

const student: AssistantPrincipal = {
  userId: "student-1",
  actorUserId: "student-1",
  name: "Student One",
  organizationId: "org-1",
  institutionId: "institution-1",
  departmentId: null,
  role: "STUDENT",
  isImpersonating: false,
}

const faculty: AssistantPrincipal = {
  ...student,
  userId: "faculty-1",
  actorUserId: "faculty-1",
  name: "Faculty One",
  role: "FACULTY",
}

const parent: AssistantPrincipal = {
  ...student,
  userId: "parent-1",
  actorUserId: "parent-1",
  name: "Parent One",
  role: "PARENT",
}

test("profile scope performs no Supabase reads", async () => {
  const supabase = mockSupabase()
  const result = await readAuthorizedDashboard(supabase, student, "profile")

  assert.equal(supabase.calls.length, 0)
  assert.match(result.context ?? "", /Student One/)
  assert.match(result.context ?? "", /STUDENT/)
  assert.deepEqual(result.sources.map((source) => source.id), ["current-profile"])
})

test("student timetable scope does not load unrelated academic or domain data", async () => {
  const supabase = mockSupabase({
    students: { section_id: "section-1", semester: 2, program_id: "program-1", section: { name: "A" }, program: { name: "Computer Science", department_id: null } },
    timetable_slots: [{ day: "Monday", period: 1, subjects: { name: "Algorithms" }, faculty: { name: "Faculty One" } }],
  })
  const result = await readAuthorizedDashboard(supabase, student, "timetable")

  assert.match(result.context ?? "", /Algorithms/)
  assert.ok(supabase.calls.some((call) => call.startsWith("students.")))
  assert.ok(supabase.calls.some((call) => call.startsWith("timetable_slots.")))
  for (const forbidden of ["submissions", "assignments", "admissions_applications", "applications", "group_members", "projects", "job_posts", "subject_announcements"]) {
    assert.equal(supabase.calls.some((call) => call.startsWith(`${forbidden}.`)), false, `unexpected ${forbidden} query`)
  }
})

test("impersonated dashboard reads use the effective student attendance path", async () => {
  const supabase = mockSupabase({
    attendance_records: [
      { status: "PRESENT", attendance_sessions: { subject: { name: "Algorithms", code: "ALG", institution_id: "institution-1" } } },
      { status: "ABSENT", attendance_sessions: { subject: { name: "Algorithms", code: "ALG", institution_id: "institution-1" } } },
    ],
  })
  const result = await readAuthorizedDashboard(supabase, {
    ...student,
    userId: "effective-student-1",
    actorUserId: "super-admin-1",
    isImpersonating: true,
  }, "attendance")

  assert.match(result.context ?? "", /Algorithms/)
  assert.equal(supabase.calls.some((call) => call.startsWith("rpc:get_student_attendance_summary")), false)
  assert.ok(supabase.calls.some((call) => call.startsWith("attendance_records.eq:student_id=effective-student-1")))
})

test("student domain scopes query only their selected domain", async () => {
  const supabase = mockSupabase({
    admissions_applications: [{ id: "application-1", status: "APPLIED" }],
  })
  const result = await readAuthorizedDashboard(supabase, student, "admissions")

  assert.match(result.context ?? "", /APPLIED/)
  assert.ok(supabase.calls.some((call) => call.startsWith("admissions_applications.")))
  assert.equal(supabase.calls.some((call) => call.startsWith("students.")), false)
  assert.equal(supabase.calls.some((call) => call.startsWith("subject_announcements.")), false)
})

test("faculty submission counts use one batched submission read", async () => {
  const supabase = mockSupabase({
    assignments: [{ id: "assignment-1", title: "Quiz", subjects: { name: "Algorithms" } }, { id: "assignment-2", title: "Lab", subjects: { name: "Systems" } }],
    submissions: [{ assignment_id: "assignment-1" }, { assignment_id: "assignment-1" }, { assignment_id: "assignment-2" }],
  })
  const result = await readAuthorizedDashboard(supabase, faculty, "faculty_submission_counts")

  assert.match(result.context ?? "", /Quiz \(Algorithms\): 2 submissions/)
  assert.match(result.context ?? "", /Lab \(Systems\): 1 submission/)
  assert.equal(supabase.calls.filter((call) => call.startsWith("submissions.")).length > 0, true)
  assert.equal(supabase.calls.filter((call) => call.startsWith("submissions.select:")).length, 1)
  assert.equal(supabase.calls.some((call) => call.startsWith("timetable_slots.")), false)
})

test("parent specialized reads use the scoped RPC instead of the all-domain RPC", async () => {
  const supabase = mockSupabase({
    "rpc:get_parent_academic_context_scoped": [{
      child_name: "Child One",
      program_name: "Computer Science",
      section_name: "A",
      semester: 2,
      timetable: [{ day: "Monday", period: 1, subject_name: "Algorithms" }],
    }],
  })
  const result = await readAuthorizedDashboard(supabase, parent, "timetable")

  assert.match(result.context ?? "", /Algorithms/)
  assert.ok(supabase.calls.some((call) => call.startsWith("rpc:get_parent_academic_context_scoped:")))
  assert.equal(supabase.calls.some((call) => call.startsWith("rpc:get_parent_academic_context:")), false)
  assert.match(supabase.calls.find((call) => call.startsWith("rpc:get_parent_academic_context_scoped:")) ?? "", /"p_scope":"timetable"/)
})

test("full scope retains academic and role-domain reads", async () => {
  const supabase = mockSupabase({
    students: { section_id: "section-1", semester: 2, program_id: "program-1", section: { name: "A" }, program: { name: "Computer Science", department_id: null } },
    "rpc:get_student_attendance_summary": [{ subject_name: "Algorithms", present_count: 8, total_count: 10 }],
    subject_announcements: [{ title: "Notice", description: "Notice body", created_at: new Date().toISOString(), subjects: { name: "Algorithms" } }],
    admissions_applications: [{ id: "application-1", status: "APPLIED" }],
    applications: [{ status: "SHORTLISTED", job_post: { title: "Engineer", institution_id: "institution-1", company: { name: "Company" } } }],
    group_members: [{ group_id: "group-1", project_groups: { group_name: "Group One", project: { title: "Project One" } } }],
  })
  const result = await readAuthorizedDashboard(supabase, student, "all")

  assert.match(result.context ?? "", /Algorithms/)
  assert.ok(supabase.calls.some((call) => call.startsWith("rpc:get_student_attendance_summary")))
  assert.ok(supabase.calls.some((call) => call.startsWith("admissions_applications.")))
  assert.ok(supabase.calls.some((call) => call.startsWith("applications.")))
  assert.ok(supabase.calls.some((call) => call.startsWith("group_members.")))
  assert.ok(supabase.calls.some((call) => call.startsWith("subject_announcements.")))
})

test("parent migration contract protects and bounds the scoped reader", () => {
  const sql = readFileSync("migrations/026_scoped_parent_academic_context.sql", "utf8")
  assert.match(sql, /p_scope NOT IN/)
  assert.match(sql, /auth\.uid\(\) IS DISTINCT FROM p_parent_id/)
  assert.match(sql, /child_record\.institution_id/)
  assert.match(sql, /LIMIT 12/)
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_parent_academic_context_scoped/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_parent_academic_context_scoped.*authenticated/)
})

test("assistant tools memoize repeated reads for the same scope", async () => {
  const supabase = mockSupabase({
    students: { section_id: "section-1", semester: 2, program_id: "program-1", section: { name: "A" }, program: { name: "Computer Science", department_id: null } },
    timetable_slots: [{ day: "Monday", period: 1, subjects: { name: "Algorithms" }, faculty: { name: "Faculty One" } }],
  })
  const tools = createAssistantTools(student, undefined, undefined, async () => supabase)
  const timetableTool = tools.get_my_timetable as unknown as { execute: (input: Record<string, never>) => Promise<string> }

  await timetableTool.execute({})
  await timetableTool.execute({})

  assert.equal(supabase.calls.filter((call) => call.startsWith("students.select:")).length, 1)
  assert.equal(supabase.calls.filter((call) => call.startsWith("timetable_slots.select:")).length, 1)
})

test("document search is disabled until migration readiness is explicitly enabled", async () => {
  const previous = process.env.KNOWLEDGE_SEARCH_ENABLED
  delete process.env.KNOWLEDGE_SEARCH_ENABLED
  const supabase = mockSupabase()
  const result = await searchPermittedDocuments(supabase, student, "syllabus", supabase, async () => Array.from({ length: 384 }, () => 0.01))
  assert.deepEqual(result, { context: null, sources: [] })
  if (previous === undefined) delete process.env.KNOWLEDGE_SEARCH_ENABLED
  else process.env.KNOWLEDGE_SEARCH_ENABLED = previous
})

test("enabled document search delegates authorization and ranking to the canonical RPC", async () => {
  const previous = process.env.KNOWLEDGE_SEARCH_ENABLED
  const previousDimensions = process.env.KNOWLEDGE_EMBEDDING_DIMENSIONS
  process.env.KNOWLEDGE_SEARCH_ENABLED = "true"
  process.env.KNOWLEDGE_EMBEDDING_DIMENSIONS = "384"
  const supabase = mockSupabase({
    "rpc:match_knowledge_chunks": [{
      id: "chunk-1",
      document_id: "document-1",
      chunk_index: 2,
      content: "The syllabus covers algorithms.",
      title: "Algorithms syllabus",
      document: { title: "Incorrect nested title" },
      original_filename: "algorithms.txt",
      similarity: 0.91,
    }],
  })
  const result = await searchPermittedDocuments(supabase, { ...student, role: "SUPER_ADMIN" }, "syllabus", supabase, async () => Array.from({ length: 384 }, () => 0.01))
  assert.match(result.context ?? "", /algorithms/)
  assert.equal(result.sources[0]?.score, 0.91)
  assert.equal(result.sources[0]?.title, "Algorithms syllabus")
  const rpcCall = supabase.calls.find((call) => call.startsWith("rpc:match_knowledge_chunks:")) ?? ""
  assert.match(rpcCall, /query_embedding/)
  assert.match(rpcCall, /p_organization_id/)
  assert.match(rpcCall, /p_embedding_profile/)
  if (previous === undefined) delete process.env.KNOWLEDGE_SEARCH_ENABLED
  else process.env.KNOWLEDGE_SEARCH_ENABLED = previous
  if (previousDimensions === undefined) delete process.env.KNOWLEDGE_EMBEDDING_DIMENSIONS
  else process.env.KNOWLEDGE_EMBEDDING_DIMENSIONS = previousDimensions
})
