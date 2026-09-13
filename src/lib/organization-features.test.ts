import assert from "node:assert/strict"
import test from "node:test"
import {
  ALL_ORG_FEATURES,
  normalizeOrganizationFeatures,
  ORGANIZATION_FEATURE_CACHE_SECONDS,
  resolveDashboardFeatures,
} from "./organization-features"
import type { DashboardSession } from "@/lib/dashboard-session"

test("organization feature cache window is one minute", () => {
  assert.equal(ORGANIZATION_FEATURE_CACHE_SECONDS, 60)
})

test("organization feature fallback contains every known feature", () => {
  assert.ok(ALL_ORG_FEATURES.includes("multi_week_timetable"))
  assert.ok(ALL_ORG_FEATURES.includes("placements"))
  assert.equal(new Set(ALL_ORG_FEATURES).size, ALL_ORG_FEATURES.length)
  assert.deepEqual(resolveDashboardFeatures(null, []), [...ALL_ORG_FEATURES])
  assert.deepEqual(resolveDashboardFeatures("org-1", undefined), [])
})

test("organization feature normalization ignores malformed values", () => {
  assert.deepEqual(
    normalizeOrganizationFeatures(["placements", null, "multi_week_timetable", 42, undefined]),
    ["placements", "multi_week_timetable"]
  )
  assert.deepEqual(normalizeOrganizationFeatures(null), [])
})

test("dashboard session stays serializable for the client provider", () => {
  const session: DashboardSession = {
    id: "user-1",
    role: "STUDENT",
    institution_id: "institution-1",
    organization_id: "organization-1",
    department_id: null,
    name: "Test Student",
    email: "student@example.com",
    created_at: "2026-01-01T00:00:00.000Z",
    phone: null,
    profile_image_url: null,
    is_active: true,
    is_timetable_builder: false,
    isImpersonating: false,
    originalProfile: {
      id: "user-1",
      role: "STUDENT",
      name: "Test Student",
      email: "student@example.com",
      profile_image_url: null,
      organization_id: "organization-1",
      institution_id: "institution-1",
      department_id: null,
    },
    isSuperAdmin: false,
    features: ["placements"],
  }

  assert.deepEqual(JSON.parse(JSON.stringify(session)), session)
})
