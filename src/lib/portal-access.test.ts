import assert from "node:assert/strict"
import test from "node:test"
import { canTransitionPortalAccess } from "./portal-access"

test("portal lifecycle distinguishes invitation, activation, deactivation, and reactivation", () => {
  assert.equal(canTransitionPortalAccess("NOT_INVITED", "INVITED"), true)
  assert.equal(canTransitionPortalAccess("INVITED", "ACTIVE"), true)
  assert.equal(canTransitionPortalAccess("ACTIVE", "DEACTIVATED"), true)
  assert.equal(canTransitionPortalAccess("DEACTIVATED", "INVITED"), true)
  assert.equal(canTransitionPortalAccess("INVITED", "DEACTIVATED"), true)
  assert.equal(canTransitionPortalAccess("NOT_INVITED", "ACTIVE"), false)
  assert.equal(canTransitionPortalAccess("ACTIVE", "INVITED"), false)
})

test("portal schema contract contains no token or secret persistence fields", async () => {
  const migration = await import("node:fs/promises").then((fs) => fs.readFile("migrations/012_task12_portal_activation.sql", "utf8"))
  assert.match(migration, /student_portal_access/)
  assert.match(migration, /UNIQUE \(student_id, institution_id\)/)
  assert.doesNotMatch(migration, /token_hash|token_id|secret_key/i)
})
