import { DASHBOARD_ROUTES } from "@/constants/routes"

import type { AssistantPrincipal, WorkflowDefinition } from "@/lib/assistant/types"

const VALID_ROUTES = new Set<string>([
  ...Object.values(DASHBOARD_ROUTES),
  "/dashboard/project-groups",
  "/dashboard/placements",
])

function validatedRoute(href: string): string | undefined {
  return VALID_ROUTES.has(href) ? href : undefined
}

function dashboardRouteFor(principal: AssistantPrincipal): string {
  return DASHBOARD_ROUTES[principal.role as keyof typeof DASHBOARD_ROUTES] ?? "/dashboard"
}

export const WORKFLOW_REGISTRY: WorkflowDefinition[] = [
  {
    id: "faculty-publish-project-team",
    title: "Publish a project team",
    roles: ["FACULTY", "HOD", "PROGRAM_HEAD"],
    keywords: ["publish project", "project team", "project group", "create team", "student team"],
    prerequisites: ["You must be assigned to the relevant subject or section."],
    steps: [
      {
        title: "Open Project Groups",
        description: "Open the Project Groups area from the dashboard.",
        href: "/dashboard/project-groups",
      },
      {
        title: "Select the subject or section",
        description: "Choose the class connected to the project team.",
      },
      {
        title: "Create or edit the team",
        description: "Add the project title, description, members, and supervisor details.",
      },
      {
        title: "Review and publish",
        description: "Review the team information. Arca provides guidance only; publishing remains a manual dashboard action.",
      },
    ],
    relatedRoutes: ["/dashboard/project-groups"],
  },
  {
    id: "student-find-timetable",
    title: "Find your timetable",
    roles: ["STUDENT", "PARENT"],
    keywords: ["timetable", "schedule", "class time", "period"],
    prerequisites: [],
    steps: [
      {
        title: "Open your dashboard",
        description: "Open the dashboard for the current account.",
        href: DASHBOARD_ROUTES.STUDENT,
      },
      {
        title: "Open Timetable",
        description: "Use the Timetable section to view class periods and assigned subjects.",
      },
    ],
    relatedRoutes: [DASHBOARD_ROUTES.STUDENT],
  },
]

export function getWorkflowInstructions(question: string, principal: AssistantPrincipal): WorkflowDefinition | null {
  const normalized = question.toLowerCase()
  const workflow = WORKFLOW_REGISTRY.find(
    (candidate) =>
      candidate.roles.includes(principal.role) &&
      candidate.keywords.some((keyword) => normalized.includes(keyword)),
  )

  if (!workflow) return null

  return {
    ...workflow,
    steps: workflow.steps.map((step) => ({
      ...step,
      href: step.href ? validatedRoute(step.href === DASHBOARD_ROUTES.STUDENT ? dashboardRouteFor(principal) : step.href) : undefined,
    })),
    relatedRoutes: workflow.relatedRoutes.map(validatedRoute).filter((route): route is string => Boolean(route)),
  }
}

export function getNavigationContext(principal: AssistantPrincipal): { label: string; href: string }[] {
  const roleRoute = DASHBOARD_ROUTES[principal.role as keyof typeof DASHBOARD_ROUTES]
  const navigation: { label: string; href: string }[] = [{ label: "Dashboard", href: roleRoute ?? "/dashboard" }]
  if (["FACULTY", "HOD", "PROGRAM_HEAD"].includes(principal.role)) {
    navigation.push({ label: "Project Groups", href: "/dashboard/project-groups" })
  }
  if (["INSTITUTION_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(principal.role)) {
    navigation.push({ label: "Placements", href: "/dashboard/placements" })
  }
  return navigation.filter((item) => VALID_ROUTES.has(item.href))
}
