import assert from "node:assert/strict"
import test from "node:test"
import { GET } from "./route"

test("mobile profile endpoint rejects caller-supplied identity without a Bearer token", async () => {
  const request = new Request("https://example.test/api/mobile/v1/me", {
    headers: {
      "x-user-id": "forged-user",
      "x-user-role": "SUPER_ADMIN",
      "x-user-institution-id": "other-institution",
    },
  })
  const response = await GET(request)
  const body = await response.json()

  assert.equal(response.status, 401)
  assert.equal(body.error.code, "UNAUTHORIZED")
  assert.equal(response.headers.get("Cache-Control"), "private, no-store")
  assert.equal(typeof body.request_id, "string")
})
