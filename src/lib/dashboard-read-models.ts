/* eslint-disable @typescript-eslint/no-explicit-any */

import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import type { UserContext } from "@/lib/user-context"
import type { Company, Drive, Student } from "@/lib/placements-mock"
import type {
  DashboardEvent,
  EventsDashboardData,
  PlacementAnalytics,
  PlacementApplication,
  PlacementDashboardData,
} from "@/lib/dashboard-read-model-types"
import { measureServer } from "@/lib/perf"

type PlacementUser = { id: string; name: string; email: string }
type PlacementApplicationRow = PlacementApplication & {
  users?: { institution_id?: string | null } | Array<{ institution_id?: string | null }>
  job_posts?: unknown
}

function relationValue<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function calculatePlacementAnalytics(
  students: Student[],
  companies: Company[],
): PlacementAnalytics {
  const total = students.length
  const placed = students.filter((student) => student.status === "Placed")
  const placedCount = placed.length
  const averagePackage = placed.reduce((sum, student) => sum + (student.package ?? 0), 0) / (placedCount || 1)

  const yearly: Record<number, { placements: number; total: number; packageSum: number }> = {}
  for (let year = 2020; year <= 2024; year += 1) {
    yearly[year] = { placements: 0, total: 0, packageSum: 0 }
  }

  students.forEach((student, index) => {
    const year = 2020 + (index % 5)
    yearly[year].total += 1
    if (student.status === "Placed") {
      yearly[year].placements += 1
      yearly[year].packageSum += student.package ?? 0
    }
  })

  const trend = Object.entries(yearly)
    .sort(([first], [second]) => Number(first) - Number(second))
    .map(([year, value]) => ({
      year: Number(year),
      placements: value.placements,
      placement_rate: Math.round((value.placements / (value.total || 1)) * 1000) / 10,
      avg_package: Math.round((value.packageSum / (value.placements || 1)) * 100) / 100,
    }))

  const branchMap: Record<string, { placed: number; total: number }> = {}
  students.forEach((student) => {
    const branch = student.branch || "Unknown"
    branchMap[branch] ??= { placed: 0, total: 0 }
    branchMap[branch].total += 1
    if (student.status === "Placed") branchMap[branch].placed += 1
  })

  const branches = Object.entries(branchMap).map(([branch, value]) => ({
    branch,
    placements: value.placed,
    total: value.total,
    rate: Math.round((value.placed / value.total) * 1000) / 10,
  }))

  const companyMap: Record<string, { selected: number; packageSum: number; total: number }> = {}
  students.forEach((student) => {
    if (!student.company) return
    companyMap[student.company] ??= { selected: 0, packageSum: 0, total: 0 }
    companyMap[student.company].total += 1
    if (student.status === "Placed") {
      companyMap[student.company].selected += 1
      companyMap[student.company].packageSum += student.package ?? 0
    }
  })

  const companyStats = Object.entries(companyMap)
    .map(([company, value]) => ({
      company,
      applicants: value.total,
      selected: value.selected,
      avg_package: Math.round((value.packageSum / (value.selected || 1)) * 100) / 100,
      selection_rate: Math.round((value.selected / value.total) * 1000) / 10,
    }))
    .sort((first, second) => second.selected - first.selected)

  return {
    kpi: {
      total_students: total,
      placed_students: placedCount,
      companies: companies.length,
      avg_package: Math.round(averagePackage * 100) / 100,
      placement_rate: Math.round((placedCount / (total || 1)) * 1000) / 10,
    },
    trend,
    branches,
    company_stats: companyStats,
  }
}

function mapCompanies(rows: any[]): Company[] {
  return rows.map((company) => ({
    id: company.id,
    name: company.name,
    industry: "Technology",
    website: company.website,
    location: company.website || "Corporate",
    email: "recruiting@" + (company.website || "company.com"),
  }))
}

function mapDrives(rows: any[]): Drive[] {
  return rows.map((post) => {
    const company = relationValue(post.companies)
    const deadline = post.deadline || "2026-07-15"

    return {
      id: post.id,
      company_id: post.company_id,
      company_name: company?.name || "Corporate Partner",
      job_title: post.title,
      job_type: "Full Time",
      ctc: 8.5,
      vacancies: 10,
      eligible_branches: ["CSE", "IT", "ECE"],
      min_cgpa: 7,
      backlogs_allowed: 0,
      skills_required: post.description || "System engineering",
      rounds: ["Online Assessment", "Technical", "HR Screen"],
      interview_mode: "Online",
      drive_status: new Date(deadline) < new Date() ? "Completed" : "Upcoming",
      applied: 0,
      shortlisted: 0,
      selected: 0,
      created_at: deadline,
    } satisfies Drive
  })
}

function mapStudents(rows: any[], users: Map<string, PlacementUser>, applications: PlacementApplicationRow[]): Student[] {
  return rows.map((student) => {
    const user = users.get(student.id)
    const studentApplications = applications.filter((application) => application.student_id === student.id)
    const placedApplication = studentApplications.find((application) => application.status === "SELECTED")
    const jobPost = relationValue((placedApplication as any)?.job_posts)
    const company = relationValue((jobPost as any)?.companies)
    const program = relationValue(student.program)
    const companyName = company?.name

    return {
      student_id: student.id,
      name: user?.name || user?.email?.split("@")[0] || "Unknown Student",
      branch: program?.name || "Computer Science",
      year: student.admission_year
        ? Math.max(1, Math.min(4, new Date().getFullYear() - student.admission_year + 1))
        : 4,
      skills: "React, TypeScript, SQL, Node.js",
      hackathons: 1,
      papers: 0,
      conferences: 0,
      sports: 0,
      clubs: 1,
      status: companyName ? "Placed" : "Not Placed",
      company: companyName,
      package: companyName ? 8.5 : undefined,
      sgpa: { sem1: 8, sem2: 8.2, sem3: 8.5, sem4: 8.1, sem5: 8.3, sem6: 8.4, sem7: 8, sem8: 8.2 },
      backlogs: { sem1: 0, sem2: 0, sem3: 0, sem4: 0, sem5: 0, sem6: 0, sem7: 0, sem8: 0 },
      attendance: { sem1: 85, sem2: 85, sem3: 85, sem4: 85, sem5: 85, sem6: 85, sem7: 85, sem8: 85 },
    } satisfies Student
  })
}

async function loadPlacementDashboardDataImpl(context: UserContext): Promise<PlacementDashboardData> {
  const admin = createSupabaseAdminClient()
  const institutionId = context.institution_id
  const isStudent = ["STUDENT", "PARENT"].includes(context.role)

  let companiesQuery = admin.from("companies").select("id, name, website, description").order("name", { ascending: true })
  let postsQuery = admin.from("job_posts").select("id, company_id, title, description, deadline, companies(name, website, description)")
  let applicationsQuery = admin.from("applications").select(`
    id,
    student_id,
    status,
    job_post_id,
    resume_url,
    users!inner(institution_id),
    job_posts(title, company_id, companies(name))
  `)
  let studentsQuery = admin.from("students").select("id, admission_year, program:program_id(name)")

  if (institutionId) {
    companiesQuery = companiesQuery.eq("institution_id", institutionId)
    postsQuery = postsQuery.eq("institution_id", institutionId)
    applicationsQuery = applicationsQuery.eq("users.institution_id", institutionId)
    studentsQuery = studentsQuery.eq("institution_id", institutionId)
  }

  const [companiesResult, postsResult, applicationsResult, studentsResult, attendanceResult, personalApplicationsResult] = await Promise.all([
    companiesQuery,
    postsQuery,
    applicationsQuery,
    studentsQuery,
    isStudent ? admin.from("attendance_records").select("status").eq("student_id", context.id) : Promise.resolve({ data: [] as Array<{ status: string }>, error: null }),
    isStudent
      ? admin.from("applications").select("id, student_id, job_post_id, status, resume_url").eq("student_id", context.id)
      : Promise.resolve({ data: [] as PlacementApplication[], error: null }),
  ])

  const firstError = [companiesResult, postsResult, applicationsResult, studentsResult, attendanceResult, personalApplicationsResult]
    .find((result) => result.error)?.error
  if (firstError) throw new Error(firstError.message)

  const studentsRows = (studentsResult.data ?? []) as any[]
  const studentIds = studentsRows.map((student) => student.id)
  const usersResult = studentIds.length
    ? await admin.from("users").select("id, name, email").in("id", studentIds).order("name")
    : { data: [] as PlacementUser[], error: null }

  if (usersResult.error) throw new Error(usersResult.error.message)

  const applications = (applicationsResult.data ?? []) as PlacementApplicationRow[]
  const users = new Map<string, PlacementUser>((usersResult.data ?? []).map((user) => [user.id, user]))
  const companies = mapCompanies((companiesResult.data ?? []) as any[])
  const drives = mapDrives((postsResult.data ?? []) as any[])
  const students = mapStudents(studentsRows, users, applications)
  const attendance = (attendanceResult.data ?? []) as Array<{ status: string }>
  const present = attendance.filter((record) => record.status === "PRESENT" || record.status === "LATE").length

  return {
    companies,
    drives,
    students,
    analytics: calculatePlacementAnalytics(students, companies),
    studentApplications: (personalApplicationsResult.data ?? []) as PlacementApplication[],
    attendancePercent: attendance.length ? Math.round((present / attendance.length) * 100) : 85,
  }
}

export function loadPlacementDashboardData(context: UserContext): Promise<PlacementDashboardData> {
  return measureServer("dashboard.placements.server-loader", () => loadPlacementDashboardDataImpl(context))
}

function formatTime24To12(time24: string) {
  if (!time24) return "12:00 PM"
  const [hourText, minute = "00"] = time24.split(":")
  const hour = Number(hourText)
  return `${String(hour % 12 || 12).padStart(2, "0")}:${minute} ${hour >= 12 ? "PM" : "AM"}`
}

function mapEvent(row: any): DashboardEvent {
  const today = new Date().toISOString().split("T")[0]
  let description = row.description || ""
  let department = ""
  let tags: string[] = ["Academic"]
  let organizer = "Staff Coordinator"
  let organizerRole = "Faculty"
  let staffPhone = ""
  let studentCoordinator = ""
  let studentPhone = ""
  let coverImage = row.image_url || null
  let galleryImages = Array.isArray(row.gallery_images) ? row.gallery_images : []

  try {
    const parsed = typeof row.description === "string" ? JSON.parse(row.description) : null
    if (parsed && typeof parsed === "object" && "description" in parsed) {
      description = parsed.description || ""
      department = parsed.department || ""
      tags = parsed.tags || tags
      organizer = parsed.organizer || organizer
      organizerRole = parsed.organizerRole || organizerRole
      staffPhone = parsed.staff_coord_phone || ""
      studentCoordinator = parsed.student_coord || ""
      studentPhone = parsed.student_coord_phone || ""
      coverImage ||= parsed.image_url || null
      if (!galleryImages.length && Array.isArray(parsed.gallery_images)) galleryImages = parsed.gallery_images
    }
  } catch {
    // Keep the database description when it is plain text.
  }

  const rawDate = row.event_date || row.start_time || row.date
  const dateParts = rawDate ? String(rawDate).split("T") : []
  const registeredUsers = Array.isArray(row.event_registrations)
    ? row.event_registrations.map((registration: { user_id: string }) => registration.user_id)
    : []

  return {
    id: row.id,
    name: row.title || "Untitled Event",
    department,
    date: dateParts[0] || today,
    time: dateParts[1] ? formatTime24To12(dateParts[1].slice(0, 5)) : "12:00 PM",
    location: row.venue || row.location || "Campus Hall",
    description,
    capacity: 100,
    filled: registeredUsers.length,
    organizer,
    organizerRole,
    staff_coord_phone: staffPhone,
    student_coord: studentCoordinator,
    student_coord_phone: studentPhone,
    tags,
    registeredUsers,
    image_url: coverImage,
    gallery_images: galleryImages,
  }
}

async function loadEventsRows(admin: ReturnType<typeof createSupabaseAdminClient>, institutionId: string | null) {
  let primaryQuery = admin.from("events").select(`
    id, title, description, event_date, venue, created_by, image_url, gallery_images,
    event_registrations(user_id)
  `)
  if (institutionId) primaryQuery = primaryQuery.eq("institution_id", institutionId)
  const primary = await primaryQuery.order("event_date", { ascending: true })
  if (!primary.error) return (primary.data ?? []) as any[]

  let fallbackQuery = admin.from("events").select(`
    id, title, description, event_date, venue, created_by,
    event_registrations(user_id)
  `)
  if (institutionId) fallbackQuery = fallbackQuery.eq("institution_id", institutionId)
  const fallback = await fallbackQuery.order("event_date", { ascending: true })
  if (!fallback.error) return (fallback.data ?? []) as any[]

  let bareQuery = admin.from("events").select("id, title, description, event_date, venue, created_by")
  if (institutionId) bareQuery = bareQuery.eq("institution_id", institutionId)
  const bare = await bareQuery.order("event_date", { ascending: true })
  if (!bare.error) return (bare.data ?? []) as any[]

  let simpleQuery = admin.from("events").select("*")
  if (institutionId) simpleQuery = simpleQuery.eq("institution_id", institutionId)
  const simple = await simpleQuery.order("event_date", { ascending: true })
  if (simple.error) throw new Error(simple.error.message)
  return (simple.data ?? []) as any[]
}

async function loadEventsDashboardDataImpl(context: UserContext): Promise<EventsDashboardData> {
  const admin = createSupabaseAdminClient()
  const departmentsQuery = admin.from("departments").select("id, name").order("name", { ascending: true })
  if (context.institution_id) departmentsQuery.eq("institution_id", context.institution_id)

  const [departmentsResult, events] = await Promise.all([
    departmentsQuery,
    loadEventsRows(admin, context.institution_id),
  ])

  if (departmentsResult.error) throw new Error(departmentsResult.error.message)

  return {
    departments: (departmentsResult.data ?? []) as Array<{ id: string; name: string }>,
    events: events.map(mapEvent),
  }
}

export function loadEventsDashboardData(context: UserContext): Promise<EventsDashboardData> {
  return measureServer("dashboard.events.server-loader", () => loadEventsDashboardDataImpl(context))
}
