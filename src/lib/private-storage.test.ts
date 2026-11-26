import assert from "node:assert/strict"
import test from "node:test"
import {
  getPrivateStorageHref,
  makePrivateStorageReference,
  normalizePrivateStoragePath,
  parsePrivateStoragePath,
} from "./private-storage"

const supabaseUrl = "https://synthetic-project.supabase.co"

test("normalizes safe storage object paths and rejects traversal", () => {
  assert.equal(normalizePrivateStoragePath("student/file.pdf"), "student/file.pdf")
  assert.equal(normalizePrivateStoragePath("student/../private.pdf"), null)
  assert.equal(normalizePrivateStoragePath("/student/file.pdf"), null)
  assert.equal(normalizePrivateStoragePath("student\\file.pdf"), null)
})

test("creates private object references without exposing public URLs", () => {
  assert.equal(
    makePrivateStorageReference("assignments", "student/file.pdf"),
    "storage://assignments/student/file.pdf",
  )
  assert.throws(() => makePrivateStorageReference("resumes", "../private.pdf"))
})

test("parses internal references", () => {
  assert.equal(parsePrivateStoragePath("storage://assignments/student/file.pdf", "assignments"), "student/file.pdf")
  assert.equal(parsePrivateStoragePath("storage://resumes/resumes/student/file.pdf", "resumes"), "resumes/student/file.pdf")
})

test("converts legacy public and signed URLs from the configured Supabase origin", () => {
  assert.equal(
    parsePrivateStoragePath(`${supabaseUrl}/storage/v1/object/public/assignments/student/final%20draft.pdf`, "assignments", supabaseUrl),
    "student/final draft.pdf",
  )
  assert.equal(
    parsePrivateStoragePath(`${supabaseUrl}/storage/v1/object/sign/resumes/resumes/student/cv.pdf?token=synthetic`, "resumes", supabaseUrl),
    "resumes/student/cv.pdf",
  )
})

test("rejects other origins, buckets, traversal and encoded separators", () => {
  assert.equal(parsePrivateStoragePath("https://attacker.invalid/storage/v1/object/public/assignments/student/file.pdf", "assignments", supabaseUrl), null)
  assert.equal(parsePrivateStoragePath(`${supabaseUrl}/storage/v1/object/public/resumes/resumes/student/cv.pdf`, "assignments", supabaseUrl), null)
  assert.equal(parsePrivateStoragePath(`${supabaseUrl}/storage/v1/object/public/assignments/student/%2e%2e/private.pdf`, "assignments", supabaseUrl), null)
  assert.equal(parsePrivateStoragePath(`${supabaseUrl}/storage/v1/object/public/assignments/student/file%2Fsecret.pdf`, "assignments", supabaseUrl), null)
})

test("builds same-origin authenticated download routes", () => {
  assert.equal(
    getPrivateStorageHref("storage://assignments/student/file.pdf", "assignments", supabaseUrl),
    "/api/storage/assignments?path=student%2Ffile.pdf",
  )
})
