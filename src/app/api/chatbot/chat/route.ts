import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext } from "@/lib/user-context"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import type { SupabaseClient } from "@supabase/supabase-js"

const BACKEND_URL = process.env.EDURAG_BACKEND_URL || "http://localhost:8000"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  institution_id: string
  department_id?: string | null
}

type ContextBuilder = (
  supabase: SupabaseClient,
  profile: UserProfile
) => Promise<string[]>

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Student",
  FACULTY: "Faculty",
  INSTITUTION_ADMIN: "Institution Admin",
  HOD: "Head of Department",
  PROGRAM_HEAD: "Program Head",
  SUPER_ADMIN: "Super Admin",
}

function getReadableRole(role: string): string {
  return ROLE_LABELS[role] ?? role
}

/**
 * Runs a Supabase query and swallows/logs errors so a single failing
 * section can never blank out the rest of the chatbot's context.
 */
async function safeQuery(
  label: string,
  fn: () => PromiseLike<{ data: any; error: any }>
): Promise<any> {
  try {
    const { data, error } = await fn()
    if (error) {
      console.error(`[chatbot-context] "${label}" query failed:`, error.message)
      return null
    }
    return data
  } catch (err) {
    console.error(`[chatbot-context] "${label}" query threw:`, err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Shared: Department + HOD resolution
//
// departments_hierarchy / programs_hierarchy do not exist in the live schema.
// The correct source of truth is users.department_id + users.role = 'HOD',
// which is a direct FK already present on every user row.
// ---------------------------------------------------------------------------

async function resolveDepartmentAndHOD(
  supabase: SupabaseClient,
  departmentId: string,
  excludeUserId?: string
): Promise<string[]> {
  const lines: string[] = []

  const dept = await safeQuery("department lookup", () =>
    supabase.from("departments").select("name").eq("id", departmentId).maybeSingle()
  )
  if (dept?.name) {
    lines.push(`- Department: ${dept.name}`)
  }

  const hod = await safeQuery("HOD lookup", () =>
    supabase
      .from("users")
      .select("id, name, email")
      .eq("department_id", departmentId)
      .eq("role", "HOD")
      .maybeSingle()
  )
  if (hod && hod.id !== excludeUserId) {
    lines.push(`- Department Head (HOD): ${hod.name} (${hod.email})`)
  }

  return lines
}

// ---------------------------------------------------------------------------
// Student context
// ---------------------------------------------------------------------------

async function buildStudentContext(
  supabase: SupabaseClient,
  profile: UserProfile
): Promise<string[]> {
  const lines: string[] = []

  const student = await safeQuery("student profile", () =>
    supabase
      .from("students")
      .select(
        `
        section_id,
        semester,
        program_id,
        section:section_id(name),
        program:program_id(name, department_id)
      `
      )
      .eq("id", profile.id)
      .maybeSingle()
  )

  if (!student) return lines

  lines.push(`\nAcademic Details:`)
  lines.push(`- Program: ${(student as any).program?.name || "N/A"}`)
  lines.push(`- Section: ${(student as any).section?.name || "N/A"}`)
  lines.push(`- Semester: ${student.semester || "N/A"}`)

  const deptId = (student as any).program?.department_id
  const sectionId = student.section_id
  const semester = student.semester
  const programId = student.program_id

  // Run all independent lookups concurrently — none of these depend on
  // each other, so there's no reason to wait for them one at a time.
  const [deptLines, subjects, slots, attendanceRows, gradedSubmissions, allAssignments, mySubmissions] =
    await Promise.all([
      deptId ? resolveDepartmentAndHOD(supabase, deptId) : Promise.resolve([]),
      safeQuery("student subjects", () =>
        supabase
          .from("subjects")
          .select("name, code, credits")
          .eq("program_id", programId)
          .eq("semester", semester)
      ),
      safeQuery("student timetable", () =>
        supabase
          .from("timetable_slots")
          .select("day, period, subjects(name, code), faculty:faculty_id(name)")
          .eq("institution_id", profile.institution_id)
          .eq("section_id", sectionId)
          .eq("semester", semester)
      ),
      safeQuery("attendance records", () =>
        supabase
          .from("attendance_records")
          .select(
            `
            status,
            session:session_id ( subject_id, subjects(name, code) )
          `
          )
          .eq("student_id", profile.id)
      ),
      safeQuery("graded submissions", () =>
        supabase
          .from("submissions")
          .select(
            `
            grade, feedback, status, submitted_at,
            assignment:assignment_id ( title, max_score, type, subjects(name, code) )
          `
          )
          .eq("student_id", profile.id)
          .eq("status", "graded")
      ),
      sectionId
        ? safeQuery("assignments for section", () =>
            supabase
              .from("assignments")
              .select(`id, title, due_date, max_score, type, subjects(name, code)`)
              .contains("section_ids", [sectionId])
          )
        : Promise.resolve(null),
      safeQuery("student submissions", () =>
        supabase.from("submissions").select("assignment_id").eq("student_id", profile.id)
      ),
    ])

  lines.push(...deptLines)

  if (subjects && subjects.length > 0) {
    lines.push(`\nCourses/Subjects Enrolled:`)
    subjects.forEach((sub: any) => {
      lines.push(`- ${sub.name} (${sub.code || "No Code"}) [Credits: ${sub.credits || 0}]`)
    })
  }

  if (slots && slots.length > 0) {
    lines.push(`\nYour Active Timetable Schedule:`)
    slots.forEach((s: any) => {
      const subjectStr = s.subjects ? `${s.subjects.name} (${s.subjects.code || ""})` : "Free Period"
      const facultyStr = s.faculty?.name ? ` taught by ${s.faculty.name}` : ""
      lines.push(`- ${s.day}, Period ${s.period}: ${subjectStr}${facultyStr}`)
    })
  }

  if (attendanceRows && attendanceRows.length > 0) {
    const bySubject: Record<string, { name: string; present: number; total: number }> = {}
    attendanceRows.forEach((row: any) => {
      const subj = row.session?.subjects
      if (!subj) return
      const key = subj.code || subj.name
      if (!bySubject[key]) bySubject[key] = { name: subj.name, present: 0, total: 0 }
      bySubject[key].total += 1
      if (row.status === "PRESENT" || row.status === "LATE") bySubject[key].present += 1
    })

    lines.push(`\nAttendance Summary:`)
    Object.entries(bySubject).forEach(([code, s]) => {
      const pct = s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : "0"
      lines.push(`- ${s.name} (${code}): ${pct}% (${s.present}/${s.total} classes attended)`)
    })
  }

  if (gradedSubmissions && gradedSubmissions.length > 0) {
    lines.push(`\nGraded Assignments:`)
    gradedSubmissions.forEach((s: any) => {
      const a = s.assignment
      const subjName = a?.subjects?.name || "Unknown Subject"
      const feedbackStr = s.feedback ? ` — Feedback: ${s.feedback}` : ""
      lines.push(`- "${a?.title}" (${subjName}): ${s.grade}/${a?.max_score}${feedbackStr}`)
    })
  }

  if (allAssignments && allAssignments.length > 0) {
    const submittedIds = new Set((mySubmissions || []).map((s: any) => s.assignment_id))
    const pending = allAssignments.filter((a: any) => !submittedIds.has(a.id))

    if (pending.length > 0) {
      lines.push(`\nPending Assignments:`)
      pending.forEach((a: any) => {
        const subjName = a.subjects?.name || "Unknown Subject"
        const due = a.due_date ? new Date(a.due_date).toLocaleString() : "No due date set"
        const overdue = a.due_date && new Date(a.due_date) < new Date()
        lines.push(`- "${a.title}" (${subjName}, ${a.type}) — Due: ${due}${overdue ? " [OVERDUE]" : ""}`)
      })
    }
  }

  return lines
}

// ---------------------------------------------------------------------------
// Faculty / HOD / Program Head context
// ---------------------------------------------------------------------------

async function buildFacultyContext(
  supabase: SupabaseClient,
  profile: UserProfile
): Promise<string[]> {
  const lines: string[] = []

  const [subjectsTaught, slots, myAssignments, recentSessions] = await Promise.all([
    // faculty_subjects is the real source of truth for what a faculty
    // member teaches — direct FK, no fallback chain needed.
    safeQuery("faculty subjects", () =>
      supabase
        .from("faculty_subjects")
        .select("semester, academic_year, subject:subject_id(name, code), section:section_id(name)")
        .eq("faculty_id", profile.id)
    ),
    safeQuery("faculty timetable", () =>
      supabase
        .from("timetable_slots")
        .select("day, period, subjects(name, code), section:section_id(name)")
        .eq("faculty_id", profile.id)
    ),
    safeQuery("faculty assignments", () =>
      supabase.from("assignments").select("id, title, subjects(name)").eq("faculty_id", profile.id)
    ),
    safeQuery("recent attendance sessions", () =>
      supabase
        .from("attendance_sessions")
        .select("attendance_date, period, subjects(name)")
        .eq("faculty_id", profile.id)
        .order("attendance_date", { ascending: false })
        .limit(5)
    ),
  ])

  // Department + HOD, resolved directly from the user's own department_id.
  if (profile.department_id) {
    const deptLines = await resolveDepartmentAndHOD(supabase, profile.department_id, profile.id)
    if (deptLines.length > 0) {
      lines.push(`\nDepartment Affiliation:`)
      lines.push(...deptLines)
      if (profile.role === "HOD") {
        lines.push(`- Note: ${profile.name} is the Head of this Department.`)
      }
    }
  }

  // Program Head leadership scope: the schema has no direct
  // program -> program_head FK. Best available signal is the programs
  // reachable through the subjects this person teaches. This is a
  // best-effort approximation — if precise program-head assignment is
  // needed, add a `program_head_id` column to `programs`.
  if (profile.role === "PROGRAM_HEAD" && subjectsTaught && subjectsTaught.length > 0) {
    lines.push(`\nProgram Lead Details (best-effort, derived from taught subjects):`)
    const seen = new Set<string>()
    subjectsTaught.forEach((row: any) => {
      const name = row.subject?.name
      if (name && !seen.has(name)) {
        seen.add(name)
        lines.push(`- Associated with program via subject: ${name}`)
      }
    })
  }

  if (subjectsTaught && subjectsTaught.length > 0) {
    const uniqueSubjects = new Set<string>()
    subjectsTaught.forEach((row: any) => {
      if (row.subject?.name) {
        uniqueSubjects.add(`${row.subject.name} (${row.subject.code || ""})`)
      }
    })
    if (uniqueSubjects.size > 0) {
      lines.push(`\nSubjects Taught:`)
      uniqueSubjects.forEach((sub) => lines.push(`- ${sub}`))
    }
  }

  if (slots && slots.length > 0) {
    lines.push(`\nYour Teaching Schedule:`)
    slots.forEach((s: any) => {
      const subjectStr = s.subjects ? `${s.subjects.name} (${s.subjects.code || ""})` : "Class"
      const sectionStr = s.section?.name ? ` for Section ${s.section.name}` : ""
      lines.push(`- ${s.day}, Period ${s.period}: ${subjectStr}${sectionStr}`)
    })
  }

  if (myAssignments && myAssignments.length > 0) {
    const assignmentIds = myAssignments.map((a: any) => a.id)

    // Fetch ALL submissions once, then derive both "total submitted" and
    // "still needs grading" from the same result set — avoids a second
    // round trip and keeps the two numbers guaranteed consistent.
    const allSubmissionsForMyAssignments = await safeQuery("submissions for my assignments", () =>
      supabase.from("submissions").select("assignment_id, status").in("assignment_id", assignmentIds)
    )

    if (allSubmissionsForMyAssignments && allSubmissionsForMyAssignments.length > 0) {
      const totalByAssignment: Record<string, number> = {}
      const ungradedByAssignment: Record<string, number> = {}

      allSubmissionsForMyAssignments.forEach((s: any) => {
        totalByAssignment[s.assignment_id] = (totalByAssignment[s.assignment_id] || 0) + 1
        if (s.status === "pending" || s.status === "resubmitted") {
          ungradedByAssignment[s.assignment_id] = (ungradedByAssignment[s.assignment_id] || 0) + 1
        }
      })

      lines.push(`\nAssignment Submission Counts:`)
      Object.entries(totalByAssignment).forEach(([id, total]) => {
        const a = myAssignments.find((x: any) => x.id === id)
        const ungraded = ungradedByAssignment[id] || 0
        lines.push(
          `- "${a?.title}" (${(a as any)?.subjects?.name || "N/A"}): ${total} submission(s) received, ${ungraded} awaiting grading`
        )
      })
    }
  }

  if (recentSessions && recentSessions.length > 0) {
    lines.push(`\nRecent Attendance Sessions Taken:`)
    recentSessions.forEach((s: any) => {
      lines.push(`- ${s.subjects?.name || "N/A"}, Period ${s.period} on ${s.attendance_date}`)
    })
  }

  // Class-wide attendance overview: average % present across all sessions
  // this faculty member has conducted, grouped by subject.
  const allMySessions = await safeQuery("all faculty attendance sessions", () =>
    supabase.from("attendance_sessions").select("id, subjects(name, code)").eq("faculty_id", profile.id)
  )

  if (allMySessions && allMySessions.length > 0) {
    const sessionIds = allMySessions.map((s: any) => s.id)
    const allRecords = await safeQuery("records for faculty sessions", () =>
      supabase.from("attendance_records").select("session_id, status").in("session_id", sessionIds)
    )

    if (allRecords && allRecords.length > 0) {
      const sessionToSubject = new Map<string, string>()
      allMySessions.forEach((s: any) => {
        sessionToSubject.set(s.id, s.subjects?.name || "Unknown Subject")
      })

      const bySubject: Record<string, { present: number; total: number }> = {}
      allRecords.forEach((r: any) => {
        const subjName = sessionToSubject.get(r.session_id) || "Unknown Subject"
        if (!bySubject[subjName]) bySubject[subjName] = { present: 0, total: 0 }
        bySubject[subjName].total += 1
        if (r.status === "PRESENT" || r.status === "LATE") bySubject[subjName].present += 1
      })

      lines.push(`\nClass Attendance Overview (average across all students, by subject):`)
      Object.entries(bySubject).forEach(([subjName, s]) => {
        const pct = s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : "0"
        lines.push(`- ${subjName}: ${pct}% average attendance across ${s.total} recorded check-ins`)
      })
    }
  }

  return lines
}

// ---------------------------------------------------------------------------
// Announcements (all roles)
// ---------------------------------------------------------------------------

async function buildAnnouncementsContext(
  supabase: SupabaseClient,
  profile: UserProfile
): Promise<string[]> {
  const announcements = await safeQuery("announcements", () =>
    supabase
      .from("subject_announcements")
      .select("title, content, created_at, subjects(name)")
      .eq("institution_id", profile.institution_id)
      .order("created_at", { ascending: false })
      .limit(5)
  )

  if (!announcements || announcements.length === 0) return []

  const lines = [`\nRecent Notices & Announcements:`]
  announcements.forEach((a: any) => {
    const subjectStr = a.subjects?.name ? ` [Subject: ${a.subjects.name}]` : ""
    lines.push(`- "${a.title}": ${a.content}${subjectStr} (Posted on: ${new Date(a.created_at).toLocaleDateString()})`)
  })
  return lines
}

// ---------------------------------------------------------------------------
// Top-level context assembly
// ---------------------------------------------------------------------------

const ROLE_CONTEXT_BUILDERS: Record<string, ContextBuilder> = {
  STUDENT: buildStudentContext,
  FACULTY: buildFacultyContext,
  HOD: buildFacultyContext,
  PROGRAM_HEAD: buildFacultyContext,
}

async function fetchUserDatabaseContext(profile: UserProfile): Promise<string> {
  try {
    const supabase = await createSupabaseServerClient()
    const contextParts: string[] = [
      `User Profile Summary:`,
      `- Name: ${profile.name}`,
      `- Email: ${profile.email}`,
      `- Role: ${getReadableRole(profile.role)}`,
    ]

    const roleBuilder = ROLE_CONTEXT_BUILDERS[profile.role]
    const [roleLines, announcementLines] = await Promise.all([
      roleBuilder ? roleBuilder(supabase, profile) : Promise.resolve([]),
      buildAnnouncementsContext(supabase, profile),
    ])

    contextParts.push(...roleLines, ...announcementLines)
    return contextParts.join("\n")
  } catch (err) {
    console.error("Error fetching user database context for chatbot:", err)
    return ""
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const profile = (await getCurrentUserContext()) as UserProfile | null
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { question, session_id } = await request.json()
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    // 1. Sync user context to the EduRAG backend. Non-fatal if it fails —
    //    the chat can still proceed with stale/default settings.
    const syncedRole = getReadableRole(profile.role)
    try {
      await fetch(`${BACKEND_URL}/api/settings/user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name || "User",
          email: profile.email || "user@skillarc.edu",
          role: syncedRole,
        }),
      })
    } catch (syncErr) {
      console.warn("Failed to sync user context to EduRAG backend:", syncErr)
    }

    // 2. Build live Supabase context (academic details, attendance, grades,
    //    assignments, teaching load, announcements — all role-aware).
    const dbContextText = await fetchUserDatabaseContext(profile)
    if (process.env.NODE_ENV !== "production") {
      console.log("GENERATED CHATBOT DB CONTEXT:\n", dbContextText)
    }

    const modifiedQuestion = dbContextText
      ? `[DATABASE_CONTEXT:\n${dbContextText}\n]\n\nUser Question: ${question}`
      : question

    // 3. Query the RAG backend.
    const response = await fetch(`${BACKEND_URL}/api/chat/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: modifiedQuestion,
        session_id: session_id || null,
        top_k: 4,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("FastAPI backend error:", errText)
      return NextResponse.json({ error: `Backend failure: ${errText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Chatbot API route error:", error)
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 })
  }
}