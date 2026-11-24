import assert from "node:assert/strict"
import test from "node:test"
import {
  AcademicTimeZoneError,
  createAcademicTimeZoneHandler,
  type AcademicTimeZoneActor,
} from "./academic-time-zone-handler"

const admin: AcademicTimeZoneActor = {
  id: "synthetic-admin",
  role: "INSTITUTION_ADMIN",
  is_active: true,
  institution_id: "synthetic-india",
  organization_id: "synthetic-organization",
}
const request = (body: unknown) =>
  new Request("https://example.test/api/timetable/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-user-role": "INSTITUTION_ADMIN",
    },
    body: JSON.stringify(body),
  })

test("unauthenticated, inactive, wrong-role and scopeless callers cannot configure", async () => {
  for (const actor of [
    null,
    { ...admin, is_active: false },
    { ...admin, role: "STUDENT" },
    { ...admin, role: "ORG_ADMIN" },
    { ...admin, institution_id: null },
    { ...admin, organization_id: null },
  ]) {
    const handler = createAcademicTimeZoneHandler({
      actor: async () => actor,
      save: async () => {
        assert.fail("denied request must not write")
      },
    })
    const response = await handler(
      request({ academic_time_zone: "Asia/Kolkata" }),
    )
    assert.equal(response.status, actor ? 403 : 401)
    assert.equal(response.headers.get("Cache-Control"), "private, no-store")
  }
})

test("invalid zones, caller-supplied scope and malformed payloads cannot write", async () => {
  const handler = createAcademicTimeZoneHandler({
    actor: async () => admin,
    save: async () => {
      assert.fail("invalid request must not write")
    },
  })
  for (const body of [
    {},
    [],
    null,
    { academic_time_zone: "IST" },
    { academic_time_zone: "" },
    { academic_time_zone: "Asia/Invalid" },
    { academic_time_zone: 5 },
    { academic_time_zone: "Asia/Kolkata", institution_id: "other" },
  ]) {
    assert.equal((await handler(request(body))).status, 400)
  }
  assert.equal(
    (
      await handler(
        new Request("https://example.test", { method: "PATCH", body: "{" }),
      )
    ).status,
    400,
  )
})

test("verified actor scope is passed to the atomic write; explicit null clears", async () => {
  for (const zone of ["Asia/Kolkata", "Australia/Sydney", null]) {
    let calls = 0
    const handler = createAcademicTimeZoneHandler({
      actor: async () => admin,
      save: async (actor, value) => {
        calls++
        assert.deepEqual(actor, admin)
        assert.equal(value, zone)
        return value
      },
    })
    const response = await handler(request({ academic_time_zone: zone }))
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      academic_time_zone: zone,
      academic_time_zone_status: zone === null ? "unconfigured" : "ready",
    })
    assert.equal(calls, 1)
  }
})

test("scope denial and upstream failure stay distinct and hide database details", async () => {
  for (const failure of [
    new AcademicTimeZoneError(403, "Forbidden"),
    new Error("private SQL/credentials"),
  ]) {
    const handler = createAcademicTimeZoneHandler({
      actor: async () => admin,
      save: async () => {
        throw failure
      },
    })
    const response = await handler(
      request({ academic_time_zone: "Asia/Kolkata" }),
    )
    assert.equal(
      response.status,
      failure instanceof AcademicTimeZoneError ? 403 : 503,
    )
    assert.doesNotMatch(await response.text(), /SQL|credentials/)
  }
})
