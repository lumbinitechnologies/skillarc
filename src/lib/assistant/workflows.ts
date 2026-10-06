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
  {
    id: "admin-add-student",
    title: "Add a student",
    roles: ["INSTITUTION_ADMIN"],
    keywords: ["add student", "create student", "new student", "register student", "enroll student"],
    prerequisites: ["You must have at least one program and section created."],
    steps: [
      { title: "Open Students page", description: "Navigate to the Students section in the admin dashboard.", href: "/dashboard/institution-admin/students" },
      { title: "Click Add Student", description: "Click the 'Add Student' or '+' button to open the creation form." },
      { title: "Fill student details", description: "Enter the student's name, email, program, section, semester, and parent details (if applicable)." },
      { title: "Submit", description: "Review and submit the form. The student will receive an invitation email." },
    ],
    relatedRoutes: ["/dashboard/institution-admin/students"],
  },
  {
    id: "admin-add-faculty",
    title: "Add a faculty member",
    roles: ["INSTITUTION_ADMIN"],
    keywords: ["add faculty", "create faculty", "new faculty", "invite faculty", "add teacher", "add professor"],
    prerequisites: ["You must have at least one department created."],
    steps: [
      { title: "Open Faculty page", description: "Navigate to the Faculty section in the admin dashboard.", href: "/dashboard/institution-admin/faculty" },
      { title: "Click Add Faculty", description: "Click the 'Add Faculty' or '+' button." },
      { title: "Fill details", description: "Enter name, email, role (Faculty/HOD/Program Head), and department." },
      { title: "Submit", description: "Submit the form. The faculty member will receive an invitation email." },
    ],
    relatedRoutes: ["/dashboard/institution-admin/faculty"],
  },
  {
    id: "admin-bulk-import",
    title: "Bulk import data",
    roles: ["INSTITUTION_ADMIN"],
    keywords: ["bulk import", "csv import", "import students", "import faculty", "upload csv", "bulk upload"],
    prerequisites: ["Prepare a CSV file matching the required template."],
    steps: [
      { title: "Open the relevant page", description: "Go to Students, Faculty, Subjects, or other section in admin dashboard." },
      { title: "Click Import/Bulk Import", description: "Look for the 'Import' or 'Bulk Import' button." },
      { title: "Download the template", description: "Download the sample CSV template to see the required columns." },
      { title: "Prepare your CSV", description: "Fill in the CSV following the template format. Mandatory columns are marked with *." },
      { title: "Upload and confirm", description: "Upload the CSV file and review the preview. Confirm to process the import." },
    ],
    relatedRoutes: ["/dashboard/institution-admin/students"],
  },
  {
    id: "admin-manage-departments",
    title: "Manage departments",
    roles: ["INSTITUTION_ADMIN"],
    keywords: ["department", "add department", "create department", "manage department"],
    prerequisites: [],
    steps: [
      { title: "Open Departments", description: "Navigate to the Departments section.", href: "/dashboard/institution-admin/departments" },
      { title: "Add or edit", description: "Click 'Add Department' to create a new one, or click an existing department to edit it." },
    ],
    relatedRoutes: ["/dashboard/institution-admin/departments"],
  },
  {
    id: "admin-manage-timetable",
    title: "Manage the timetable",
    roles: ["INSTITUTION_ADMIN"],
    keywords: ["timetable", "schedule", "build timetable", "create timetable", "period", "time slot"],
    prerequisites: ["You must have sections, subjects, and faculty set up first."],
    steps: [
      { title: "Open Timetable Builder", description: "Navigate to the Timetable Builder page.", href: "/dashboard/institution-admin/timetable/builder" },
      { title: "Select section and semester", description: "Choose the section and semester to build the timetable for." },
      { title: "Assign slots", description: "Drag or assign subjects and faculty to each day/period combination." },
      { title: "Save", description: "Save the timetable when done." },
    ],
    relatedRoutes: ["/dashboard/institution-admin/timetable/builder"],
  },
  {
    id: "faculty-create-assignment",
    title: "Create an assignment or quiz",
    roles: ["FACULTY", "HOD", "PROGRAM_HEAD"],
    keywords: ["create assignment", "new assignment", "add assignment", "create quiz", "new quiz", "homework", "upload assignment"],
    prerequisites: ["You must be assigned to at least one subject."],
    steps: [
      { title: "Open your subject", description: "Navigate to your subjects page and select the relevant subject.", href: "/dashboard/faculty/subjects" },
      { title: "Go to Assignments", description: "Open the Assignments tab within the subject." },
      { title: "Create new", description: "Click 'Create Assignment' or 'Create Quiz'. Fill in title, description, due date, max score, and upload any files." },
      { title: "Select sections", description: "Choose which sections should receive this assignment." },
      { title: "Submit", description: "Review and submit. Students will see it in their dashboard." },
    ],
    relatedRoutes: ["/dashboard/faculty/subjects"],
  },
  {
    id: "faculty-mark-attendance",
    title: "Mark attendance",
    roles: ["FACULTY", "HOD", "PROGRAM_HEAD"],
    keywords: ["mark attendance", "take attendance", "attendance", "absent", "present"],
    prerequisites: ["You must be assigned to the subject for which you want to mark attendance."],
    steps: [
      { title: "Open Attendance", description: "Navigate to the Attendance page.", href: "/dashboard/faculty/attendance" },
      { title: "Select subject and date", description: "Choose the subject, section, and date." },
      { title: "Mark students", description: "Mark each student as Present, Absent, or Late." },
      { title: "Submit", description: "Save the attendance records." },
    ],
    relatedRoutes: ["/dashboard/faculty/attendance"],
  },
  {
    id: "student-submit-assignment",
    title: "Submit an assignment",
    roles: ["STUDENT"],
    keywords: ["submit assignment", "upload assignment", "submit homework", "submit quiz", "assignment submission"],
    prerequisites: [],
    steps: [
      { title: "Open your dashboard", description: "Navigate to your student dashboard.", href: DASHBOARD_ROUTES.STUDENT },
      { title: "Find the assignment", description: "Look for the assignment in your pending assignments list or navigate to the subject." },
      { title: "Upload and submit", description: "Click on the assignment, upload your file or enter your response, and click Submit." },
    ],
    relatedRoutes: [DASHBOARD_ROUTES.STUDENT],
  },
  {
    id: "student-check-attendance",
    title: "Check your attendance",
    roles: ["STUDENT", "PARENT"],
    keywords: ["attendance", "check attendance", "my attendance", "attendance percentage", "absent"],
    prerequisites: [],
    steps: [
      { title: "Open your dashboard", description: "Navigate to your student dashboard.", href: DASHBOARD_ROUTES.STUDENT },
      { title: "View Attendance", description: "Look for the Attendance section which shows your subject-wise attendance percentage." },
    ],
    relatedRoutes: [DASHBOARD_ROUTES.STUDENT],
  },
  {
    id: "admin-faculty-subject-mapping",
    title: "Assign faculty to subjects",
    roles: ["INSTITUTION_ADMIN"],
    keywords: ["faculty subject", "assign faculty", "map faculty", "faculty mapping", "assign teacher"],
    prerequisites: ["Both the faculty member and subject must already exist."],
    steps: [
      { title: "Open Faculty-Subject Mapping", description: "Navigate to the Faculty-Subject Mapping page.", href: "/dashboard/institution-admin/faculty-subjects" },
      { title: "Add mapping", description: "Click 'Add Mapping' and select the faculty, subject, section, semester, and academic year." },
      { title: "Save", description: "Save the mapping. The faculty member will now see the subject in their dashboard." },
    ],
    relatedRoutes: ["/dashboard/institution-admin/faculty-subjects"],
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

  if (["INSTITUTION_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"].includes(principal.role)) {
    navigation.push(
      { label: "Students", href: "/dashboard/institution-admin/students" },
      { label: "Faculty", href: "/dashboard/institution-admin/faculty" },
      { label: "Departments", href: "/dashboard/institution-admin/departments" },
      { label: "Subjects", href: "/dashboard/institution-admin/subjects" },
      { label: "Sections", href: "/dashboard/institution-admin/sections" },
      { label: "Timetable Builder", href: "/dashboard/institution-admin/timetable/builder" },
      { label: "Attendance", href: "/dashboard/institution-admin/attendance" },
      { label: "Faculty-Subject Mapping", href: "/dashboard/institution-admin/faculty-subjects" },
      { label: "Placements", href: "/dashboard/placements" },
      { label: "Admissions", href: "/dashboard/institution-admin/admissions" },
    )
  }
  if (["FACULTY", "HOD", "PROGRAM_HEAD"].includes(principal.role)) {
    navigation.push(
      { label: "My Subjects", href: "/dashboard/faculty/subjects" },
      { label: "Attendance", href: "/dashboard/faculty/attendance" },
      { label: "Project Groups", href: "/dashboard/project-groups" },
      { label: "My Profile", href: "/dashboard/faculty/profile" },
    )
  }
  if (principal.role === "STUDENT") {
    navigation.push(
      { label: "My Profile", href: "/dashboard/student" },
    )
  }
  if (principal.role === "PARENT") {
    navigation.push(
      { label: "My Children", href: "/dashboard/parent" },
    )
  }

  // Filter to only routes known to be valid
  return navigation
}
