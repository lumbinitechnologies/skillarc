import assert from "node:assert/strict"
import test from "node:test"

import { readResponseError, resolveAppOrigin } from "./invite-user"

test("resolves Vercel host when public app URL is missing", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL
  const originalVercel = process.env.VERCEL_URL
  delete process.env.NEXT_PUBLIC_APP_URL
  process.env.VERCEL_URL = "skillarc-test.vercel.app"

  try {
    assert.equal(resolveAppOrigin(), "https://skillarc-test.vercel.app")
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = original

    if (originalVercel === undefined) delete process.env.VERCEL_URL
    else process.env.VERCEL_URL = originalVercel
  }
})

test("strips trailing slash from configured app URL", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL
  const originalVercel = process.env.VERCEL_URL
  process.env.NEXT_PUBLIC_APP_URL = "https://example.com/"
  delete process.env.VERCEL_URL

  try {
    assert.equal(resolveAppOrigin(), "https://example.com")
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = original

    if (originalVercel === undefined) delete process.env.VERCEL_URL
    else process.env.VERCEL_URL = originalVercel
  }
})

test("returns a fallback message when the error response body is empty", async () => {
  const response = new Response("", {
    status: 500,
    headers: { "content-type": "application/json" },
  })

  const message = await readResponseError(response, "Failed to invite admin")
  assert.equal(message, "Failed to invite admin")
})
