import assert from "node:assert/strict"
import test from "node:test"

import {
  KNOWLEDGE_MAX_FILE_BYTES,
  parseAllowedRoles,
  safeExtension,
  safeFilename,
  sha256,
} from "./service"

test("knowledge upload validation accepts only supported document types", () => {
  assert.equal(safeExtension("outline.PDF"), "pdf")
  assert.equal(safeExtension("notes.docx"), "docx")
  assert.equal(safeExtension("notes.exe"), null)
  assert.equal(safeFilename("../../course notes?.pdf"), "._._course_notes_.pdf")
  assert.equal(KNOWLEDGE_MAX_FILE_BYTES, 50 * 1024 * 1024)
})

test("knowledge upload roles are normalized and validated", () => {
  assert.deepEqual(parseAllowedRoles(JSON.stringify(["student", "FACULTY", "student"])), ["FACULTY", "STUDENT"])
  assert.deepEqual(parseAllowedRoles("STUDENT, PARENT"), ["PARENT", "STUDENT"])
  assert.throws(() => parseAllowedRoles("anon"), /unsupported role/)
})

test("knowledge content hashes are deterministic", () => {
  assert.equal(sha256("course outline"), sha256("course outline"))
  assert.notEqual(sha256("course outline"), sha256("different outline"))
})
