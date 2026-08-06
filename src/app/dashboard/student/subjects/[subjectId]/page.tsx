import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { ROLES } from "@/constants/roles"
import { StudentSubjectDetailClient } from "./student-subject-detail-client"
import { getStudentProjectGroupsAction } from "@/app/actions/project-groups"
import { getSubjectAnnouncementsAction } from "@/app/actions/announcements"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{
    subjectId: string
  }>
}

export default async function StudentSubjectDetailPage({ params }: PageProps) {
  const { subjectId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const adminClient = createSupabaseAdminClient()

  const { data: userProfile } = await adminClient
    .from("users")
    .select("id, name, role, institution_id")
    .eq("id", user.id)
    .single()

  if (!userProfile || userProfile.role !== ROLES.STUDENT) redirect("/dashboard")

  const { data: studentData } = await adminClient
    .from("students")
    .select("id, section_id, program_id, semester")
    .eq("id", user.id)
    .single()

  const profile = { ...userProfile, ...studentData }

  // 1. Fetch Subject Info
  const { data: subject } = await adminClient
    .from("subjects")
    .select("id, name, code")
    .eq("id", subjectId)
    .single()

  if (!subject) {
    redirect("/dashboard/student/subjects")
  }

  // 2. Fetch Faculty details for this subject + section from timetable
  const { data: slots } = await adminClient
    .from("timetable_slots")
    .select("faculty_id")
    .eq("institution_id", profile.institution_id)
    .eq("section_id", profile.section_id)
    .eq("subject_id", subjectId)
    .limit(1)

  const facultyId = slots?.[0]?.faculty_id
  let facultyName = "Faculty pending"

  if (facultyId) {
    const { data: fac } = await adminClient
      .from("users")
      .select("name")
      .eq("id", facultyId)
      .single()
    if (fac) facultyName = fac.name
  }

  // 3. Fetch Assignments for this subject
  const { data: assignments = [] } = await adminClient
    .from("assignments")
    .select(`
      *,
      faculty:faculty_id(
        id,
        name
      )
    `)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })

  const subjectAnnouncements = await getSubjectAnnouncementsAction(subjectId)

  // Filter assignments targeted to this student's section (or globally assigned)
  const studentSectionId = profile.section_id
  const activeAssignments = (assignments ?? []).filter((a: any) => {
    if (!a.section_ids || a.section_ids.length === 0) return true
    return a.section_ids.includes(studentSectionId)
  })

  const assignmentIds = activeAssignments.map((a: any) => a.id)

  // 4. Fetch Student's Submissions for these assignments
  const { data: submissions = [] } = assignmentIds.length
    ? await adminClient
        .from("submissions")
        .select("*")
        .eq("student_id", user.id)
        .in("assignment_id", assignmentIds)
    : { data: [] }

  // 5. Fetch Classmates in the same section
  let classmates: any[] = []
  if (studentSectionId) {
    const { data: classmateStudents } = await adminClient
      .from("students")
      .select("id")
      .eq("section_id", studentSectionId)

    const classmateIds = (classmateStudents ?? []).map((s: any) => s.id)
    if (classmateIds.length) {
      const { data: usersData } = await adminClient
        .from("users")
        .select("id, name, email")
        .in("id", classmateIds)
        .order("name")
      classmates = usersData ?? []
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
  let attendanceEntries: any[] = []
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

    const sessionIds = (sessions ?? []).map((session: any) => session.id)

    const { data: records = [] } = sessionIds.length
      ? await adminClient
          .from("attendance_records")
          .select("session_id, status")
          .eq("student_id", user.id)
          .in("session_id", sessionIds)
      : { data: [] }

    const recordMap = new Map((records ?? []).map((record: any) => [record.session_id, record]))

    const facultyIds = Array.from(new Set((sessions ?? []).map((s: any) => s.faculty_id).filter(Boolean))) as string[]
    let facultyMap = new Map<string, string>()
    if (facultyIds.length) {
      const { data: faculties = [] } = await adminClient
        .from("users")
        .select("id, name")
        .in("id", facultyIds)

      ;(faculties ?? []).forEach((fac: any) => {
        facultyMap.set(fac.id, fac.name)
      })
    }

    attendanceEntries = (sessions ?? []).map((session: any) => {
      const record = recordMap.get(session.id)
      const facName = session.faculty_id ? facultyMap.get(session.faculty_id) : undefined

      return {
        id: session.id,
        date: session.attendance_date,
        period: session.period,
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
  const studentGroupsAll = await getStudentProjectGroupsAction(user.id)
  const projectGroups = (studentGroupsAll || []).filter((sg: any) => sg.project?.subject_id === subjectId)

  return (
    <StudentSubjectDetailClient
      studentId={user.id}
      studentName={profile.name}
      studentSectionId={studentSectionId}
      subject={subject}
      facultyName={facultyName}
      assignments={activeAssignments}
      submissions={submissions ?? []}
      classmates={classmates ?? []}
      meetings={meetings ?? []}
      attendanceEntries={attendanceEntries}
      attendanceSummary={attendanceSummary}
      projectGroups={projectGroups ?? []}
  subjectAnnouncements={subjectAnnouncements ?? []}
    />
  )
}
