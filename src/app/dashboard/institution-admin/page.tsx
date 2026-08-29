import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import InstitutionAdminDashboardClient from "./institution-admin-dashboard-client"
import { ROLES } from "@/constants/roles"
import { getCurrentUserContext } from "@/lib/user-context"

export default async function InstitutionAdminPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect("/auth/login")
  if (context.role !== ROLES.INSTITUTION_ADMIN) redirect("/auth/login")

  const profile = context
  const supabase = await createSupabaseServerClient()

  // 1. Fetch institution details
  const { data: institution } = await supabase
    .from("institutions")
    .select("id, name, domain")
    .eq("id", profile.institution_id)
    .single()

  // 2. Fetch counts and datasets in parallel
  const [
    facultyCountRes,
    studentCountRes,
    parentCountRes,
    departmentCountRes,
    programCountRes,
    sectionCountRes,
    subjectCountRes,
    timetableSlotsRes,
    periodsRes,
    institutionUsersRes,
    allFacultyRes,
    assignedFacultyRes,
    programsListRes,
    sectionsListRes,
    pendingInvitesRes,
    eventsRes,
  ] = await Promise.all([
    // Basic counts
    supabase.from("users").select("*", { count: "exact", head: true }).eq("institution_id", profile.institution_id).in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD]),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("institution_id", profile.institution_id).eq("role", ROLES.STUDENT),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("institution_id", profile.institution_id).eq("role", ROLES.PARENT),
    supabase.from("departments").select("*", { count: "exact", head: true }).eq("institution_id", profile.institution_id),
    supabase.from("programs").select("*", { count: "exact", head: true }).eq("institution_id", profile.institution_id),
    supabase.from("sections").select("*", { count: "exact", head: true }).eq("institution_id", profile.institution_id),
    supabase.from("subjects").select("*", { count: "exact", head: true }).eq("institution_id", profile.institution_id),

    // Timetable & Periods
    supabase.from("timetable_slots").select(`
      id,
      day,
      period,
      subject:subject_id(
        id,
        name,
        code,
        program:program_id(
          id,
          name,
          department:department_id(id, name)
        )
      ),
      faculty:faculty_id(id, name),
      section:section_id(id, name)
    `).eq("institution_id", profile.institution_id),
    supabase.from("periods").select("period_number, start_time, end_time").eq("institution_id", profile.institution_id).order("period_number"),

    // Users (to filter audit logs)
    supabase.from("users").select("id, name, email").eq("institution_id", profile.institution_id),

    // Unassigned faculty metrics
    supabase.from("users").select("id, name, email").eq("institution_id", profile.institution_id).in("role", [ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD]),
    supabase.from("faculty_subjects").select("faculty_id"),

    // Programs without sections metrics
    supabase.from("programs").select("id, name").eq("institution_id", profile.institution_id),
    supabase.from("sections").select("program_id").eq("institution_id", profile.institution_id),

    // Pending invitations
    supabase.from("users").select("id, email, role, created_at").eq("institution_id", profile.institution_id).eq("is_active", false),

    // Events
    supabase.from("events").select("id, title, description, start_time, location").eq("institution_id", profile.institution_id).order("start_time", { ascending: true }).limit(5),
  ])

  // Get active user IDs to fetch their recent activity/audit logs
  const users = institutionUsersRes.data ?? []
  const userIds = users.map(u => u.id)
  let auditLogs: any[] = []

  if (userIds.length > 0) {
    const { data: logs } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, created_at, user_id")
      .in("user_id", userIds)
      .order("created_at", { ascending: false })
      .limit(6)
    
    // Map log user details locally
    auditLogs = (logs ?? []).map(l => {
      const u = users.find(user => user.id === l.user_id)
      return {
        ...l,
        user_name: u?.name ?? "System",
        user_email: u?.email ?? ""
      }
    })
  }

  // Calculate today's attendance rate
  const todayStr = new Date().toISOString().split("T")[0]
  const sectionIds = (sectionsListRes.data ?? []).map(s => s.program_id) // Wait, section has id, program_id
  const activeSectionIds = (sectionsListRes.data ?? []).map(s => s.program_id) // wait, sections_list has id
  const secIds = (sectionsListRes.data ?? []).map(s => (s as any).id)

  let attendanceRecords: any[] = []
  if (secIds.length > 0) {
    const { data: sessions } = await supabase
      .from("attendance_sessions")
      .select("id")
      .in("section_id", secIds)
      .eq("attendance_date", todayStr)

    const sessionIds = (sessions ?? []).map(s => s.id)
    if (sessionIds.length > 0) {
      const { data: records } = await supabase
        .from("attendance_records")
        .select("status")
        .in("session_id", sessionIds)
      attendanceRecords = records ?? []
    }
  }

  const presentCount = attendanceRecords.filter(r => r.status === "PRESENT" || r.status === "LATE").length
  const totalAttendanceCount = attendanceRecords.length
  const attendanceRate = totalAttendanceCount > 0 ? Math.round((presentCount / totalAttendanceCount) * 100) : null

  // Calculate unassigned faculty
  const facultyList = allFacultyRes.data ?? []
  const assignedFacultyIds = new Set((assignedFacultyRes.data ?? []).map(af => af.faculty_id))
  const unassignedFaculty = facultyList.filter(f => !assignedFacultyIds.has(f.id))

  // Calculate programs without sections
  const programsList = programsListRes.data ?? []
  const sectionsList = sectionsListRes.data ?? []
  const activeProgramIds = new Set(sectionsList.map(s => s.program_id))
  const programsWithoutSections = programsList.filter(p => !activeProgramIds.has(p.id))

  // Pending invites
  const pendingInvites = pendingInvitesRes.data ?? []

  // Format timetable slots to prevent array types issues
  const rawSlots = (timetableSlotsRes.data ?? []) as any[]
  const formattedSlots = rawSlots.map(s => {
    const subjectVal = Array.isArray(s.subject) ? s.subject[0] : s.subject
    const facultyVal = Array.isArray(s.faculty) ? s.faculty[0] : s.faculty
    const sectionVal = Array.isArray(s.section) ? s.section[0] : s.section
    
    const programVal = subjectVal ? (Array.isArray(subjectVal.program) ? subjectVal.program[0] : subjectVal.program) : null
    const deptVal = programVal ? (Array.isArray(programVal.department) ? programVal.department[0] : programVal.department) : null

    return {
      id: s.id,
      day: s.day,
      period: s.period,
      subject: subjectVal ? { id: subjectVal.id, name: subjectVal.name, code: subjectVal.code } : undefined,
      department: deptVal ? { id: deptVal.id, name: deptVal.name } : undefined,
      faculty: facultyVal ? { id: facultyVal.id, name: facultyVal.name } : undefined,
      section: sectionVal ? { id: sectionVal.id, name: sectionVal.name } : undefined,
    }
  })

  return (
    <InstitutionAdminDashboardClient
      institution={institution}
      stats={{
        faculty: facultyCountRes.count ?? 0,
        students: studentCountRes.count ?? 0,
        parents: parentCountRes.count ?? 0,
        departments: departmentCountRes.count ?? 0,
        programs: programCountRes.count ?? 0,
        sections: sectionCountRes.count ?? 0,
        courses: subjectCountRes.count ?? 0,
      }}
      timetableSlots={formattedSlots}
      periods={periodsRes.data ?? []}
      attendanceRate={attendanceRate}
      attentionMetrics={{
        unassignedFacultyCount: unassignedFaculty.length,
        pendingInvitesCount: pendingInvites.length,
        programsWithoutSectionsCount: programsWithoutSections.length,
      }}
      recentActivity={auditLogs}
      recentInvites={pendingInvites.slice(0, 5)}
      upcomingEvents={eventsRes.data ?? []}
    />
  )
}