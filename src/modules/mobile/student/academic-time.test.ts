import assert from "node:assert/strict"
import { test } from "node:test"
import { academicTimeContext } from "../../../lib/academic-time-zone"
import { enrollmentDateBounds, isCalendarDate, periodTimings, taskDeadline, uniqueLocalInstant } from "./academic-time"

test("validates ISO calendar dates and observes institutional midnight in India", () => {
  assert.equal(isCalendarDate("2028-02-29"), true)
  for (const invalid of ["2027-02-29", "2026-02-30", "2026-01-01T00:00:00Z", "0000-01-01", "2026-1-1"]) {
    assert.equal(isCalendarDate(invalid), false, invalid)
  }
  const now = new Date("2026-10-16T18:30:00Z")
  assert.equal(academicTimeContext("Asia/Kolkata", new Date(now.getTime() - 1)).today, "2026-10-16")
  assert.equal(academicTimeContext("Asia/Kolkata", now).today, "2026-10-17")
  assert.deepEqual(enrollmentDateBounds(null, now), { earliest: "2026-10-16", latest: "2026-10-17" })
  assert.deepEqual(enrollmentDateBounds("2026-10-17", now), { earliest: "2026-10-17", latest: "2026-10-17" })
})

test("does not fabricate instants for Sydney's skipped or repeated DST hour", () => {
  const sydney = "Australia/Sydney"
  assert.equal(uniqueLocalInstant("2026-04-05", 2 * 60 + 30, sydney), null)
  assert.equal(uniqueLocalInstant("2026-10-04", 2 * 60 + 30, sydney), null)
  assert.equal(uniqueLocalInstant("2026-04-05", 3 * 60, sydney), Date.parse("2026-04-04T17:00:00Z"))
  assert.equal(uniqueLocalInstant("2026-10-04", 3 * 60, sydney), Date.parse("2026-10-03T16:00:00Z"))
  assert.equal(uniqueLocalInstant("2026-10-17", 0, "Asia/Kolkata"), Date.parse("2026-10-16T18:30:00Z"))
})

test("parses configured timings and leaves missing, ambiguous or duplicate periods unavailable", () => {
  const timings = periodTimings([
    { id: "P1", time: "08:45 – 09:45" },
    { id: "P2", time: "12:00 – 1:00" },
    { id: "P3", time: "09:00 - 10:00" },
    { id: "P3", time: "10:00 - 11:00" },
  ])
  assert.deepEqual([...timings], [[1, { start: 525, end: 585, label: "08:45–09:45" }]])
  assert.deepEqual([...periodTimings(null)], [])
})

test("only an explicit instant may produce an overdue classification", () => {
  const now = new Date("2026-10-16T04:00:00Z")
  assert.deepEqual(taskDeadline("2026-10-16T09:00:00+05:30", null, now), {
    due_at: "2026-10-16T03:30:00.000Z", deadline_state: "known", deadline_message: null, status: "overdue",
  })
  assert.equal(taskDeadline("2026-10-16T04:00:00Z", null, now).status, "pending")
  assert.equal(taskDeadline(null, null, now).deadline_state, "absent")
  assert.deepEqual(taskDeadline(null, "2026-10-15T01:00:00", now), {
    due_at: null, deadline_state: "ambiguous", deadline_message: "Deadline unavailable", status: "pending",
  })
})
