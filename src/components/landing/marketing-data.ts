export const DEMO_URL = "https://www.lumbinitechnologies.com/Contact"

export const MARKETING_NAV = [
  { label: "Platform", href: "/platform" },
  { label: "Solutions", href: "/solutions" },
  { label: "Features", href: "/features" },
  { label: "Resources", href: "/resources" },
  { label: "About", href: "/about" },
] as const

export type MarketingAccent = "terracotta" | "navy" | "mint" | "amber"

export type FeatureGroup = {
  id: string
  label: string
  title: string
  description: string
  accent: MarketingAccent
  features: string[]
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "admissions",
    label: "Admissions & enrolment",
    title: "Move applications forward with fewer handoffs.",
    description: "Publish programs and intakes, collect applications, configure fees, track review status, and issue acceptance documents from one place.",
    accent: "terracotta",
    features: ["Programs and intakes", "Application review", "Fees and acceptance documents"],
  },
  {
    id: "academics",
    label: "Academic operations",
    title: "Keep the academic structure aligned.",
    description: "Connect departments, programs, courses, faculty, sections, and timetables so teams can plan and publish with confidence.",
    accent: "navy",
    features: ["Departments and programs", "Faculty and course assignments", "Timetable conflict checking"],
  },
  {
    id: "teaching",
    label: "Teaching & assessment",
    title: "Give faculty more time for teaching.",
    description: "Faculty can view schedules, share course materials, take attendance, create assignments, review submissions, and update grades.",
    accent: "mint",
    features: ["Course materials", "Assignments and quizzes", "Grades and report cards"],
  },
  {
    id: "student-success",
    label: "Student progress",
    title: "Help students know what comes next.",
    description: "Bring attendance, courses, assignments, grades, fees, events, and placements into a clear everyday view for students and families.",
    accent: "amber",
    features: ["Attendance and follow-up", "Student and parent visibility", "Events and placements"],
  },
  {
    id: "institutional",
    label: "Institutional management",
    title: "Keep leadership close to the work.",
    description: "Give university and institution leaders an up-to-date view across campuses, teams, records, and priorities.",
    accent: "navy",
    features: ["Multi-institution visibility", "Role-based workspaces", "Analytics and reporting"],
  },
]

export type RoleView = {
  id: string
  audience: string
  title: string
  tagline: string
  description: string
  focus: string[]
  accent: MarketingAccent
}

export const ROLE_VIEWS: RoleView[] = [
  {
    id: "leadership",
    audience: "University leadership",
    title: "See the bigger picture.",
    tagline: "Institutional visibility without the status-chasing.",
    description: "Understand what is happening across institutions, teams, and student services without requesting separate updates from every campus.",
    focus: ["Institution overview", "Shared reporting", "Student support priorities"],
    accent: "terracotta",
  },
  {
    id: "administrator",
    audience: "Institution administrators",
    title: "Run your institution.",
    tagline: "One place for the work that keeps the day moving.",
    description: "Manage admissions, programs, departments, faculty, students, fees, schedules, attendance, events, and placements from one workspace.",
    focus: ["Daily priorities", "Admissions review", "Attendance follow-up"],
    accent: "navy",
  },
  {
    id: "department",
    audience: "Department & program heads",
    title: "Keep your program on track.",
    tagline: "Coordinate the people, courses, and schedules around a cohort.",
    description: "Coordinate courses, sections, faculty assignments, schedules, events, student progress, and placement activity for your area.",
    focus: ["Faculty assignments", "Courses and cohorts", "Schedule readiness"],
    accent: "amber",
  },
  {
    id: "faculty",
    audience: "Faculty",
    title: "Teach with less administration.",
    tagline: "The next class, task, and assessment in one focused view.",
    description: "View your timetable, share course materials, take attendance, create assignments, review submissions, and update grades.",
    focus: ["Today’s timetable", "Attendance", "Pending assessments"],
    accent: "mint",
  },
  {
    id: "student",
    audience: "Students & families",
    title: "Know what comes next.",
    tagline: "Keep the student journey visible between offices and deadlines.",
    description: "View timetables, courses, assignments, attendance, grades, fees, events, and placement opportunities in one straightforward experience.",
    focus: ["Upcoming work", "Progress view", "Placement opportunities"],
    accent: "navy",
  },
]

export const WORKFLOW_STEPS = [
  {
    number: "01",
    label: "Recruit & enrol",
    title: "Admissions from application to enrolment.",
    description: "Keep programs, intakes, applications, fees, review status, and acceptance documents together.",
    accent: "terracotta" as const,
  },
  {
    number: "02",
    label: "Plan & teach",
    title: "Academic operations your teams can trust.",
    description: "Move from academic structure to faculty assignments and publishable timetables without losing the thread.",
    accent: "navy" as const,
  },
  {
    number: "03",
    label: "Support & place",
    title: "Keep students moving forward.",
    description: "Make attendance, coursework, grades, events, fees, and placements easier for every role to follow.",
    accent: "mint" as const,
  },
] as const
