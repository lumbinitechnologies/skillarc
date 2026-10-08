import assert from "node:assert/strict"
import test from "node:test"
import { NextRequest } from "next/server"
import { proxy } from "./proxy"

test("mobile routes reach Bearer-authenticated handlers without web cookies", async () => {
  for (const pathname of ["/api/mobile/v1", "/api/mobile/v1/me"]) {
    const response = await proxy(new NextRequest(`https://example.test${pathname}`))
    assert.equal(response.headers.get("x-middleware-next"), "1")
    assert.equal(response.headers.get("location"), null)
  }
})

test("mobile forwarding removes caller-supplied identity while preserving Bearer auth", async () => {
  const response = await proxy(new NextRequest("https://example.test/api/mobile/v1/me", {
    headers: {
      authorization: "Bearer synthetic-token",
      "x-user-id": "forged-user",
      "x-user-email": "forged@example.test",
      "x-user-role": "SUPER_ADMIN",
      "x-user-institution-id": "other-institution",
    },
  }))

  assert.equal(response.headers.get("x-middleware-next"), "1")
  assert.equal(response.headers.get("x-middleware-request-authorization"), "Bearer synthetic-token")
  const overriddenHeaders = response.headers.get("x-middleware-override-headers")
  assert.ok(overriddenHeaders)
  const forwardedNames = overriddenHeaders.split(",").map((name) => name.trim())
  assert.ok(forwardedNames.includes("authorization"))
  for (const name of ["x-user-id", "x-user-email", "x-user-role", "x-user-institution-id"]) {
    assert.equal(forwardedNames.includes(name), false)
    assert.equal(response.headers.has(`x-middleware-request-${name}`), false)
    assert.equal(response.headers.has(name), false)
  }
})

test("main's public auth routes remain reachable without web cookies", async () => {
  const response = await proxy(new NextRequest("https://example.test/api/auth/forgot-password"))
  assert.equal(response.headers.get("x-middleware-next"), "1")
})

test("non-mobile protected APIs and similarly named paths still require a web session", async () => {
  for (const pathname of ["/api/students", "/api/mobile/v10/me", "/api/mobile/v1-other"]) {
    const response = await proxy(new NextRequest(`https://example.test${pathname}`))
    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: "Unauthorized" })
  }
})
