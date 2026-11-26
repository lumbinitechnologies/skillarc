import { redirect } from "next/navigation"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { ROLES } from "@/constants/roles"
import { StudentSubjectDetailClient } from "./student-subject-detail-client"
import { getStudentProjectGroupsAction } from "@/app/actions/project-groups"
import { getSubjectAnnouncementsAction } from "@/app/actions/announcements"
import { getCurrentDashboardSession } from "@/lib/dashboard-session"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import type { AcademicAssignment, AcademicStudent, AttendanceEntry } from "@/lib/academic-content-types"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{
    subjectId: string
  }>
}

export default async function StudentSubjectDetailPage({ params }: PageProps) {
  const { subjectId } = await params
  const context = await getCurrentDashboardSession()
  if (!context) redirect("/auth/login")

  if (context.role !== ROLES.STUDENT) redirect("/dashboard")

  const sessionClient = await createSupabaseServerClient()
  const { data: visibleSubject, error: subjectAccessError } = await sessionClient
    .from("subjects")
    .select("id")
    .eq("id", subjectId)
    .maybeSingle()
  if (subjectAccessError || !visibleSubject) redirect("/dashboard/student/subjects")

  const adminClient = createSupabaseAdminClient()

  const { data: studentData } = await adminClient
    .from("students")
    .select("id, section_id, program_id, semester")
    .eq("id", context.id)
    .single()

  const profile = { ...context, ...studentData }
  const { data: visibleProfileSection } = profile.section_id
    ? await sessionClient.from("sections").select("id").eq("id", profile.section_id).maybeSingle()
    : { data: null }
  const studentSectionId = visibleProfileSection?.id ?? null

  // 1. Fetch Subject Info
  const { data: subject } = await adminClient
    .from("subjects")
    .select("id, name, code")
    .eq("id", subjectId)
    .single()

  if (!subject) {
    redirect("/dashboard/student/subjects")
  }

  // 2. Fetch Faculty details: check faculty_subjects first, fallback to timetable_slots
  let facultyName = "Faculty pending"

  const { data: fsRows } = await sessionClient
    .from("faculty_subjects")
    .select("faculty_id, section_id")
    .eq("subject_id", subjectId)

  if (fsRows && fsRows.length > 0) {
    const secMatch = fsRows.find((r) => r.section_id === studentSectionId)
    const targetRow = secMatch || fsRows[0]
    if (targetRow?.faculty_id) {
      const { data: facultyProfile } = await adminClient
        .from("users")
        .select("name")
        .eq("id", targetRow.faculty_id)
        .maybeSingle()
      if (facultyProfile?.name) facultyName = facultyProfile.name
    }
  }

  if (facultyName === "Faculty pending") {
    const { data: slots } = await sessionClient
      .from("timetable_slots")
      .select("faculty_id")
      .eq("subject_id", subjectId)
      .not("faculty_id", "is", null)
      .limit(1)

    const facultyId = slots?.[0]?.faculty_id
    if (facultyId) {
      const { data: facultyProfile } = await adminClient
        .from("users")
        .select("name")
        .eq("id", facultyId)
        .maybeSingle()
      if (facultyProfile?.name) facultyName = facultyProfile.name
    }
  }

  // Authorize each assignment through student RLS before loading display joins.
  const { data: authorizedAssignments } = await sessionClient
    .from("assignments")
    .select("id")
    .eq("subject_id", subjectId)
  const authorizedAssignmentIds = (authorizedAssignments ?? []).map((assignment) => assignment.id)
  const { data: assignments = [] } = authorizedAssignmentIds.length
    ? await adminClient
        .from("assignments")
        .select(`
          id, subject_id, faculty_id, title, description, due_date, created_at,
          updated_at, type, max_score, language, section_ids, files,
          faculty:faculty_id(name)
        `)
        .in("id", authorizedAssignmentIds)
        .order("created_at", { ascending: false })
    : { data: [] }

  const subjectAnnouncements = await getSubjectAnnouncementsAction(subjectId)

  // The session RLS query above has already applied formal enrollment or the
  // validated section relationship. Do not re-filter against a stale profile section.
  const activeAssignments = assignments ?? []
  const studentAssignments: AcademicAssignment[] = activeAssignments.map((assignment) => ({
    ...assignment,
    questions: null,
    test_cases: null,
    faculty: Array.isArray(assignment.faculty) ? assignment.faculty[0] ?? null : assignment.faculty ?? null,
  }))

  const assignmentIds = activeAssignments.map((a) => a.id)

  // 4. Fetch Student's Submissions for these assignments
  const { data: submissions = [] } = assignmentIds.length
    ? await adminClient
        .from("submissions")
        .select("*")
        .eq("student_id", context.id)
        .in("assignment_id", assignmentIds)
    : { data: [] }

  // 5. Fetch Classmates in the same section
  let classmates: AcademicStudent[] = []
  if (studentSectionId) {
    const { data: classmateStudents } = await adminClient
      .from("students")
      .select("id")
      .eq("section_id", studentSectionId)

    const classmateIds = (classmateStudents ?? []).map((s) => s.id)
    if (classmateIds.length) {
      const { data: usersData } = await adminClient
        .from("users")
        .select("id, name, email")
        .in("id", classmateIds)
        .order("name")
      classmates = (usersData ?? []).map((student) => ({
        ...student,
        email: student.email ?? undefined,
      }))
    }
  }

  // 6. Fetch meetings matching student's section and subject
  const { data: meetings = [] } = await adminClient
    .from("meetings")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("section_id", studentSectionId)
    .order("created_at", { ascending: false })

  // 7. Fetch Attendance records for this subject + section
  let attendanceEntries: AttendanceEntry[] = []
  let attendanceSummary = {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    rate: 0,
  }

  if (studentSectionId) {
    const { data: sessions = [] } = await adminClient
      .from("attendance_sessions")
      .select("id, attendance_date, period, faculty_id")
      .eq("subject_id", subjectId)
      .eq("section_id", studentSectionId)
      .order("attendance_date", { ascending: false })
      .order("period")

    const sessionIds = (sessions ?? []).map((session) => session.id)

    const { data: records = [] } = sessionIds.length
      ? await adminClient
          .from("attendance_records")
          .select("session_id, status")
          .eq("student_id", context.id)
          .in("session_id", sessionIds)
      : { data: [] }

    const recordMap = new Map((records ?? []).map((record) => [record.session_id, record]))

    const facultyIds = Array.from(new Set((sessions ?? []).map((s) => s.faculty_id).filter(Boolean))) as string[]
    const facultyMap = new Map<string, string>()
    if (facultyIds.length) {
      const { data: faculties = [] } = await adminClient
        .from("users")
        .select("id, name")
        .in("id", facultyIds)

      ;(faculties ?? []).forEach((fac) => {
        facultyMap.set(fac.id, fac.name)
      })
    }

    attendanceEntries = (sessions ?? []).map((session) => {
      const record = recordMap.get(session.id)
      const facName = session.faculty_id ? facultyMap.get(session.faculty_id) : undefined

      return {
        id: session.id,
        date: session.attendance_date,
        period: String(session.period),
        facultyName: facName ?? "Faculty pending",
        status: record?.status ?? "NOT_MARKED",
      }
    })

    const markedEntries = attendanceEntries.filter((entry) => entry.status !== "NOT_MARKED")
    const totalRecords = markedEntries.length
    const presentCount = markedEntries.filter((entry) => entry.status === "PRESENT").length
    const absentCount = markedEntries.filter((entry) => entry.status === "ABSENT").length
    const lateCount = markedEntries.filter((entry) => entry.status === "LATE").length
    const effectivePresent = presentCount + lateCount

    attendanceSummary = {
      total: totalRecords,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      rate: totalRecords > 0 ? Math.round((effectivePresent / totalRecords) * 100) : 0,
    }
  }

  // 8. Fetch Project Groups for this student and subject
  const studentGroupsAll = await getStudentProjectGroupsAction(context.id)
  const projectGroups = (studentGroupsAll || []).filter((sg) => sg.project?.subject_id === subjectId)

  let gradeColumns = []
  let gradeEntries = []

  try {
    const { data: columns, error: columnsError } = await adminClient
      .from("grade_columns")
      .select("*")
      .eq("subject_id", subjectId)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (!columnsError && columns?.length) {
      gradeColumns = columns
      const columnIds = columns.map((column) => column.id)

      const { data: entries, error: entriesError } = await adminClient
        .from("grade_entries")
        .select("*")
        .eq("student_id", context.id)
        .in("column_id", columnIds)

      if (!entriesError) {
        gradeEntries = entries ?? []
      }
    }
  } catch {
    gradeColumns = []
    gradeEntries = []
  }

  return (
    <StudentSubjectDetailClient
      studentId={context.id}
      studentName={profile.name}
      studentSectionId={studentSectionId}
      subject={subject}
      facultyName={facultyName}
      assignments={studentAssignments}
      submissions={submissions ?? []}
      classmates={classmates ?? []}
      meetings={meetings ?? []}
      attendanceEntries={attendanceEntries}
      attendanceSummary={attendanceSummary}
      projectGroups={projectGroups.map(allocation => ({ id: allocation.group.id, project: allocation.project, project_group: { ...allocation.group, group_members: allocation.members } }))}
      subjectAnnouncements={subjectAnnouncements ?? []}
      gradeColumns={gradeColumns}
      gradeEntries={gradeEntries}
    />
  )
}
