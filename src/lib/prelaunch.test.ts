import assert from "node:assert/strict"
import { test } from "node:test"
import { isPrelaunchPublicRequest } from "./prelaunch"

test("prelaunch keeps informational pages and their assets available", () => {
  for (const pathname of ["/", "/platform", "/solutions", "/features", "/about", "/resources", "/skillarc_logo.svg", "/images/landing/campus_hall.jpg", "/sequence/mobile/ezgif-frame-026.jpg", "/_next/static/chunks/main.js"]) {
    assert.equal(isPrelaunchPublicRequest("GET", pathname, []), true, pathname)
    assert.equal(isPrelaunchPublicRequest("HEAD", pathname, []), true, pathname)
  }
  assert.equal(isPrelaunchPublicRequest("GET", "/_next/image", ["/images/landing/campus_hall.jpg"]), true)
})

test("prelaunch denies portal, mobile, onboarding, jobs, server actions and indirect requests", () => {
  for (const [method, pathname] of [
    ["GET", "/auth/login"], ["GET", "/dashboard"], ["GET", "/apply"],
    ["GET", "/api/mobile/v1/me"], ["GET", "/api/internal/knowledge/worker"],
    ["POST", "/api/auth/signup"], ["POST", "/api/admissions/public-submit"],
    ["POST", "/api/admissions/payments"], ["POST", "/"], ["POST", "/resources"],
    ["GET", "/api/storage/file.jpg"], ["GET", "/samples/students_import_test.csv"],
  ]) {
    assert.equal(isPrelaunchPublicRequest(method, pathname, []), false, `${method} ${pathname}`)
  }
  for (const imageSources of [[], ["/api/internal/knowledge/worker"], ["/images/landing/campus_hall.jpg", "/images/landing/campus_hall.jpg"]]) {
    assert.equal(isPrelaunchPublicRequest("GET", "/_next/image", imageSources), false)
  }
})
