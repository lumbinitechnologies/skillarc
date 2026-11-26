import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("admission lifecycle migration normalizes legacy statuses before adding its constraint", async () => {
  const migration = await readFile("migrations/010_task10_admissions_lifecycle.sql", "utf8")
  const normalize = migration.indexOf("WHERE status = 'OFFER_GENERATED'")
  const constraint = migration.indexOf("ADD CONSTRAINT admissions_applications_status_check")

  assert.notEqual(normalize, -1)
  assert.notEqual(constraint, -1)
  assert.ok(normalize < constraint)
  assert.match(migration, /SET status = 'OFFER_SENT'/)
  assert.match(migration, /Unsupported admissions application status remains/)
})

test("focused security migration narrows profile and document policies", async () => {
  const migration = await readFile("migrations/013_task_review_security.sql", "utf8")
  assert.match(migration, /actor\.id = %I\.student_id/)
  assert.match(migration, /actor\.role IN \('SUPER_ADMIN', 'ORG_ADMIN'\)/)
  assert.match(migration, /student_documents_select_scoped/)
  assert.match(migration, /student_documents_update_scoped/)
  assert.match(migration, /uploaded_by = \(SELECT auth\.uid\(\)\)/)
})

test("review migrations keep generated documents safe and profile-backed", async () => {
  const security = await readFile("migrations/015_task_review_admissions_hardening.sql", "utf8")
  const mergeFields = await readFile("migrations/016_task_review_profile_merge_fields.sql", "utf8")
  const triggerPermissions = await readFile("migrations/017_task_review_trigger_permissions.sql", "utf8")
  assert.match(security, /ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'AUD'/)
  assert.match(security, /actor\.role = 'INSTITUTION_ADMIN'/)
  assert.match(mergeFields, /student_profile_details/)
  assert.match(mergeFields, /passport_country/)
  assert.match(mergeFields, /REVOKE ALL ON FUNCTION public\.admissions_generate_offer/)
  assert.match(triggerPermissions, /REVOKE ALL ON FUNCTION public\.sync_offer_letter_currency/)
})
