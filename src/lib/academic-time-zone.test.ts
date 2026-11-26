import assert from "node:assert/strict"
import test from "node:test"
import { academicTimeContext, isAcademicTimeZone } from "./academic-time-zone"

test("institution configuration never defaults from an absent or invalid value", () => {
  for (const value of [
    null,
    undefined,
    "",
    "Australia",
    "IST",
    "EST",
    "+05:30",
    "Asia/Unknown",
    42,
  ]) {
    const context = academicTimeContext(value, new Date("2026-10-16T18:30:00Z"))
    assert.equal(context.time_zone, null)
    assert.equal(context.today, null)
    assert.notEqual(context.status, "ready")
  }
  assert.equal(isAcademicTimeZone("Asia/Kolkata"), true)
  assert.equal(isAcademicTimeZone("Australia/Sydney"), true)
  assert.equal(isAcademicTimeZone("UTC"), true)
})

test("India calendar day changes at institutional midnight", () => {
  assert.equal(
    academicTimeContext("Asia/Kolkata", new Date("2026-10-16T18:29:59Z")).today,
    "2026-10-16",
  )
  assert.equal(
    academicTimeContext("Asia/Kolkata", new Date("2026-10-16T18:30:00Z")).today,
    "2026-10-17",
  )
})

test("synthetic Australian campus follows its own DST boundaries", () => {
  // Sydney is a test-only choice, not a statement about the real campus.
  for (const instant of ["2026-10-03T15:59:59Z", "2026-10-03T16:00:00Z"]) {
    assert.equal(
      academicTimeContext("Australia/Sydney", new Date(instant)).today,
      "2026-10-04",
    )
  }
  assert.equal(
    academicTimeContext("Australia/Sydney", new Date("2026-10-04T12:59:59Z"))
      .today,
    "2026-10-04",
  )
  assert.equal(
    academicTimeContext("Australia/Sydney", new Date("2026-10-04T13:00:00Z"))
      .today,
    "2026-10-05",
  )
  assert.equal(
    academicTimeContext("Australia/Sydney", new Date("2026-04-05T13:59:59Z"))
      .today,
    "2026-04-05",
  )
  assert.equal(
    academicTimeContext("Australia/Sydney", new Date("2026-04-05T14:00:00Z"))
      .today,
    "2026-04-06",
  )
})

test("two institutions produce independent dates for the same instant", () => {
  const now = new Date("2026-10-16T15:00:00Z")
  assert.equal(academicTimeContext("Asia/Kolkata", now).today, "2026-10-16")
  assert.equal(academicTimeContext("Australia/Sydney", now).today, "2026-10-17")
})
