import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ROLES } from "@/constants/roles"
import { FacultySubjectDetailClient } from "./faculty-subject-detail-client"
import { getProjectsBySubjectAction } from "@/app/actions/project-groups"
import { getSubjectAnnouncementsAction } from "@/app/actions/announcements"
import {
  getGradeColumnsBySubjectAction,
  getGradeEntriesBySubjectAction,
} from "@/app/actions/gradebook"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{
    subjectId: string
  }>
}

export default async function FacultySubjectDetailPage({ params }: PageProps) {
  const { subjectId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, institution_id, name")
    .eq("id", user.id)
    .single()

  if (!profile || ![ROLES.FACULTY, ROLES.HOD, ROLES.PROGRAM_HEAD].includes(profile.role)) redirect("/dashboard")

  // 1. Fetch Subject Info
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, code")
    .eq("id", subjectId)
    .single()

  if (!subject) {
    redirect("/dashboard/faculty/subjects")
  }

  // 2. Fetch Sections taught by this faculty for this subject
  const { data: slots } = await supabase
    .from("timetable_slots")
    .select("section_id, semester")
    .eq("faculty_id", user.id)
    .eq("subject_id", subjectId)

  const sectionIds = Array.from(new Set((slots ?? []).map((s: any) => s.section_id).filter(Boolean))) as string[]

  // Fetch sections details
  const { data: sections = [] } = sectionIds.length
    ? await supabase
        .from("sections")
        .select("id, name")
        .in("id", sectionIds)
    : { data: [] }

  // 3. Fetch Assignments for this subject
  const { data: assignments = [] } = await supabase
    .from("assignments")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })

  // 3b. Fetch announcement posts for this subject
  const announcementItems = await getSubjectAnnouncementsAction(subjectId)

  const assignmentIds = (assignments ?? []).map((a: any) => a.id)

  // 4. Fetch Submissions for these assignments
  const { data: submissionsRaw = [] } = assignmentIds.length
    ? await supabase
        .from("submissions")
        .select("*")
        .in("assignment_id", assignmentIds)
    : { data: [] }

  // Fetch plagiarism & AI verification details
  const subIds = (submissionsRaw || []).map((s: any) => s.id)
  const { data: verifications = [] } = subIds.length
    ? await supabase
        .from("submission_verifications")
        .select("submission_id, plagiarism_rate, ai_probability, status")
        .in("submission_id", subIds)
    : { data: [] }

  const submissions = (submissionsRaw || []).map((s: any) => {
    const v = (verifications || []).find((ver: any) => ver.submission_id === s.id)
    return {
      ...s,
      plagiarism_rate: v ? Number(v.plagiarism_rate) : null,
      ai_probability: v ? (v.ai_probability != null ? Number(v.ai_probability) : null) : null,
      verification_status: v ? v.status : null,
    }
  })

  // 5. Fetch Students enrolled in the sections taught
  let students: any[] = []
  if (sectionIds.length) {
    const { data: studentRecords } = await supabase
      .from("students")
      .select("id, section_id, registration_number")
      .in("section_id", sectionIds)

    if (studentRecords?.length) {
      const sIds = studentRecords.map((s: any) => s.id)
      const { data: userRecords } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", sIds)
        .order("name")

      students = (studentRecords || []).map((st: any) => {
        const u = (userRecords || []).find((usr: any) => usr.id === st.id)
        return {
          id: st.id,
          name: u?.name || "Unknown",
          email: u?.email || "",
          section_id: st.section_id,
          registration_number: st.registration_number,
        }
      })
    }
  }

  // 6. Fetch Meetings for this subject
  const { data: meetings = [] } = await supabase
    .from("meetings")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })

  // 7. Fetch Project Groups for this subject
  const projects = await getProjectsBySubjectAction(subjectId)

  // 8. Fetch custom gradebook columns and entries
  const gradeColumns = await getGradeColumnsBySubjectAction(subjectId)
  const gradeEntries = await getGradeEntriesBySubjectAction(subjectId)

  return (
    <FacultySubjectDetailClient
      facultyId={user.id}
      facultyName={profile.name}
      institutionId={profile.institution_id}
      subject={subject}
      announcements={announcementItems ?? []}
      sections={sections ?? []}
      assignments={assignments ?? []}
      submissions={submissions ?? []}
      students={students ?? []}
      meetings={meetings ?? []}
      projects={projects ?? []}
      gradeColumns={gradeColumns}
      gradeEntries={gradeEntries}
    />
  )
}
