import assert from "node:assert/strict"
import test from "node:test"
import { toStudentAssignmentView } from "./student-assignment-view"

test("student assignment view removes quiz answers and coding expectations", () => {
  const view = toStudentAssignmentView({
    id: "synthetic-assignment",
    questions: [{ q: "2 + 2?", options: ["3", "4"], answer: 1 }],
    test_cases: [{ input: "2", output: "4" }],
  })

  assert.deepEqual(view.questions, [{ q: "2 + 2?", options: ["3", "4"] }])
  assert.equal(view.test_cases, null)
  assert.equal("answer" in view.questions![0], false)
})

test("malformed question content fails closed", () => {
  const view = toStudentAssignmentView({ questions: [{ answer: 2 }, "invalid"], test_cases: [] })
  assert.deepEqual(view.questions, [])
  assert.equal(view.test_cases, null)
})
