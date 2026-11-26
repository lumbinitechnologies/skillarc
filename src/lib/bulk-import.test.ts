import test from "node:test"
import assert from "node:assert/strict"
import { parseCsvText, normalizeImportRows } from "./bulk-import"

test("parseCsvText parses quoted commas and multiline values", () => {
  const csv = `name,email,notes
Alice,alice@example.com,"hello, world"
Bob,bob@example.com,"line 1
line 2"`

  const result = parseCsvText(csv)

  assert.deepEqual(result, [
    { name: "Alice", email: "alice@example.com", notes: "hello, world" },
    { name: "Bob", email: "bob@example.com", notes: "line 1\nline 2" },
  ])
})

test("normalizeImportRows standardizes header names", () => {
  const result = normalizeImportRows([
    { Name: "Alice", EMAIL: "alice@example.com", Section_ID: "sec-1" },
  ])

  assert.deepEqual(result, [
    { name: "Alice", email: "alice@example.com", section_id: "sec-1" },
  ])
})
