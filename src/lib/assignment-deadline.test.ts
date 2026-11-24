import { strict as assert } from "node:assert"
import { test } from "node:test"
import { assignmentDeadline } from "./assignment-deadline"

const now = Date.parse("2026-11-24T10:00:00Z")

test("assignment deadlines preserve the explicit instant for both columns", () => {
  assert.deepEqual(assignmentDeadline("2026-11-24T16:00:00+05:30", "Assignment", now),
    { value: "2026-11-24T10:30:00.000Z" })
  assert.match(assignmentDeadline("2026-11-24T16:00:00", "Quiz", now).error ?? "", /explicit timezone/)
  assert.match(assignmentDeadline("2026-11-24T09:00:00Z", "Quiz", now).error ?? "", /past/)
})

test("omitted deadlines retain the stored value and clearing removes it", () => {
  assert.deepEqual(assignmentDeadline(undefined, "Assignment", now), {})
  assert.deepEqual(assignmentDeadline(null, "Assignment", now), { value: null })
  assert.deepEqual(assignmentDeadline(undefined, "Material", now), { value: null })
})
