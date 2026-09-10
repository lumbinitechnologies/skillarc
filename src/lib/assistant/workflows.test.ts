import assert from "node:assert/strict"
import test from "node:test"

import { getNavigationContext, getWorkflowInstructions } from "./workflows"
import type { AssistantPrincipal } from "./types"

function principal(role: AssistantPrincipal["role"]): AssistantPrincipal {
  return {
    userId: "user-1",
    actorUserId: "user-1",
    name: "User One",
    organizationId: "org-1",
    institutionId: "institution-1",
    departmentId: "department-1",
    role,
    isImpersonating: false,
  }
}

test("faculty project publishing guidance is curated and role-scoped", () => {
  const workflow = getWorkflowInstructions("How do I publish a project team?", principal("FACULTY"))
  assert.ok(workflow)
  assert.equal(workflow.id, "faculty-publish-project-team")
  assert.equal(workflow.steps[0]?.href, "/dashboard/project-groups")
  assert.deepEqual(workflow.relatedRoutes, ["/dashboard/project-groups"])
})

test("students cannot receive faculty-only project publishing instructions", () => {
  assert.equal(getWorkflowInstructions("How do I publish a project team?", principal("STUDENT")), null)
})

test("parent timetable guidance uses the parent dashboard link", () => {
  const workflow = getWorkflowInstructions("Where can I see my timetable?", principal("PARENT"))
  assert.ok(workflow)
  assert.equal(workflow.steps[0]?.href, "/dashboard/parent")
})

test("navigation contains only validated role-appropriate routes", () => {
  assert.deepEqual(getNavigationContext(principal("FACULTY")), [
    { label: "Dashboard", href: "/dashboard/faculty" },
    { label: "Project Groups", href: "/dashboard/project-groups" },
  ])
})
