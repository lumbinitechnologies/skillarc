import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import type { SupabaseClient } from "@supabase/supabase-js"

import {
  ACADEMIC_CONTEXT_LIMITS,
  boundAcademicContext,
  fetchAcademicContext,
} from "./academic-context"

type Result = { data: unknown; error: Error | null }

function mockSupabase(results: Record<string, unknown> = {}) {
  const calls: string[] = []
  let queryCount = 0
  const valueFor = (key: string): unknown => results[key] ?? []
  const builder = (key: string) => {
    const query = {
      select: (value: string) => { calls.push(`${key}.select:${value}`); return query },
      eq: (field: string, value: unknown) => { calls.push(`${key}.eq:${field}=${String(value)}`); return query },
      neq: (field: string, value: unknown) => { calls.push(`${key}.neq:${field}=${String(value)}`); return query },
      gte: (field: string, value: unknown) => { calls.push(`${key}.gte:${field}=${String(value)}`); return query },
      contains: (field: string) => { calls.push(`${key}.contains:${field}`); return query },
      order: (field: string) => { calls.push(`${key}.order:${field}`); return query },
      limit: (value: number) => { calls.push(`${key}.limit:${value}`); return query },
      maybeSingle: () => query,
      rpc: undefined,
      then: (resolve: (result: Result) => unknown) => {
        queryCount += 1
        return Promise.resolve({ data: valueFor(key), error: null }).then(resolve)
      },
    }
    return query
  }
  return {
    calls,
    get queryCount() { return queryCount },
    from: (table: string) => builder(table),
    rpc: (name: string) => { calls.push(`rpc:${name}`); return builder(`rpc:${name}`) },
  } as unknown as SupabaseClient & { calls: string[]; queryCount: number }
}

const profile = {
  id: "student-1",
  role: "STUDENT",
  institution_id: "institution-1",
  department_id: null,
  name: "Student One",
}

test("Task 04 contract exposes the configured hard bounds", () => {
  assert.deepEqual(ACADEMIC_CONTEXT_LIMITS, {
    maxQueries: 12,
    maxRows: 50,
    maxContextChars: 2500,
    academicWindowDays: 180,
    queryTimeoutMs: 140,
    maxSubjects: 12,
    maxTimetableSlots: 12,
    maxAssignments: 12,
    maxGrades: 12,
    maxAnnouncements: 5,
    maxChildren: 3,
  })
})

test("context truncation is bounded and removes control characters", () => {
  const context = boundAcademicContext(["safe\u0000 heading", "x".repeat(4000)])
  assert.ok(context)
  assert.ok(context.length <= ACADEMIC_CONTEXT_LIMITS.maxContextChars)
  assert.equal(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(context), false)
})

test("student context uses the SQL attendance summary RPC", async () => {
  const supabase = mockSupabase({
    students: { section_id: "section-1", semester: 2, program_id: "program-1", section: { name: "A" }, program: { name: "Computer Science", department_id: null } },
    "rpc:get_student_attendance_summary": [{ subject_name: "Algorithms", subject_code: "ALG", present_count: 8, total_count: 10 }],
  })
  const context = await fetchAcademicContext(supabase, profile)
  assert.match(context ?? "", /Algorithms/)
  assert.match(context ?? "", /80\.0%/)
  assert.ok(supabase.calls.includes("rpc:get_student_attendance_summary"))
  assert.equal(supabase.calls.some((call: string) => call.startsWith("attendance_records")), false)
})

test("parent context is obtained only through the linked-child RPC", async () => {
  const supabase = mockSupabase({
    "rpc:get_parent_academic_context": [{
      child_name: "Child One",
      relationship: "Guardian",
      program_name: "Computer Science",
      section_name: "A",
      semester: 2,
      attendance: [{ subject_name: "Algorithms", present_count: 8, total_count: 10 }],
      grades: [{ title: "Quiz", grade: 9, max_score: 10, feedback: "Good" }],
      pending_assignments: [],
      timetable: [],
    }],
  })
  const context = await fetchAcademicContext(supabase, { ...profile, id: "parent-1", role: "PARENT", name: "Parent One" })
  assert.match(context ?? "", /Child One/)
  assert.match(context ?? "", /Quiz/)
  assert.deepEqual(supabase.calls.filter((call: string) => call.startsWith("rpc:")), ["rpc:get_parent_academic_context"])
  assert.ok(supabase.calls.some((call: string) => call.startsWith("subject_announcements")))
})

test("migration defines bounded, caller-authorized SQL aggregates", () => {
  const sql = readFileSync("migrations/007_task04_academic_context.sql", "utf8")
  assert.match(sql, /get_student_attendance_summary/)
  assert.match(sql, /get_faculty_attendance_summary/)
  assert.match(sql, /get_parent_academic_context/)
  assert.match(sql, /auth\.uid\(\)/)
  assert.match(sql, /attendance_date >= p_since/)
  assert.match(sql, /LIMIT 12/)
})

test("large fixtures stay within query and serialized-context budgets", async () => {
  const supabase = mockSupabase({
    students: { section_id: "section-1", semester: 2, program_id: "program-1", section: { name: "A" }, program: { name: "Computer Science", department_id: null } },
    subjects: Array.from({ length: 100 }, (_, index) => ({ name: `Subject ${index}`, code: `S${index}`, credits: 3 })),
    "rpc:get_student_attendance_summary": Array.from({ length: 100 }, (_, index) => ({ subject_name: `Subject ${index}`, subject_code: `S${index}`, present_count: 8, total_count: 10 })),
    subject_announcements: Array.from({ length: 100 }, (_, index) => ({ title: `Notice ${index}`, content: "x".repeat(500), created_at: new Date().toISOString(), subjects: null })),
  })
  const started = performance.now()
  const context = await fetchAcademicContext(supabase, profile)
  const elapsed = performance.now() - started
  assert.ok((context?.length ?? 0) <= ACADEMIC_CONTEXT_LIMITS.maxContextChars)
  assert.ok(supabase.queryCount <= ACADEMIC_CONTEXT_LIMITS.maxQueries)
  assert.ok(elapsed < 1000)
})
