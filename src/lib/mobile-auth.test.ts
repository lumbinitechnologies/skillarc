import assert from "node:assert/strict"
import test from "node:test"
import { authorizeMobileProfile, MobileAuthError, parseBearerToken } from "./mobile-auth"

const profile = {
  id: "student-a",
  role: "STUDENT",
  organization_id: "organization-a",
  institution_id: "institution-a",
  department_id: null,
  name: "Student A",
  email: "student@example.test",
  profile_image_url: null,
  is_active: true,
}

test("Bearer parser accepts only one well-formed token", () => {
  assert.equal(parseBearerToken("Bearer abc.def.ghi"), "abc.def.ghi")
  assert.equal(parseBearerToken("bearer abc.def.ghi"), "abc.def.ghi")
  for (const input of [null, "abc.def.ghi", "Bearer ", "Bearer a b", "Bearer a,b", `Bearer ${"x".repeat(8193)}`]) {
    assert.equal(parseBearerToken(input), null)
  }
  const forgedHeaderRequest = new Request("https://example.test/api/mobile/v1/me", {
    headers: { "x-user-id": "another-user", "x-user-role": "SUPER_ADMIN" },
  })
  assert.equal(parseBearerToken(forgedHeaderRequest.headers.get("authorization")), null)
})

test("mobile profile allows only active release-one roles with tenant scope", () => {
  for (const role of ["STUDENT", "PARENT", "FACULTY"]) {
    assert.equal(authorizeMobileProfile({ ...profile, role }).role, role)
  }
  for (const invalid of [
    null,
    { ...profile, is_active: false },
    { ...profile, role: "SUPER_ADMIN" },
    { ...profile, organization_id: null },
    { ...profile, institution_id: null },
  ]) {
    assert.throws(() => authorizeMobileProfile(invalid), MobileAuthError)
  }
})
