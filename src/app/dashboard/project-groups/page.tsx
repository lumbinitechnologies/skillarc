import { createSupabaseServerClient } from "@/lib/supabase-server"
import ProjectGroupsClient from "./project-groups-client"
import { getProjectsByFacultyAction, getStudentProjectGroupsAction } from "@/app/actions/project-groups"
import { ROLES } from "@/constants/roles"

export default async function ProjectGroupsPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div className="p-8 text-center text-slate-500">Please log in to continue.</div>
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    return <div className="p-8 text-center text-slate-500">Failed to resolve active profile.</div>
  }

  let projects: any[] = []
  let subjects: any[] = []
  let studentGroups: any[] = []

  if (profile.role === ROLES.FACULTY) {
    // Fetch sections and subjects from timetable slots where faculty is assigned
    const { data: slots } = await supabase
      .from("timetable_slots")
      .select(`
        subject_id,
        section_id,
        subjects (id, name, code),
        sections (id, name)
      `)
      .eq("faculty_id", user.id)

    const uniqueSubjectsMap = new Map()
    for (const slot of (slots || []) as any[]) {
      if (!slot.subject_id || !slot.section_id) continue
      const key = `${slot.subject_id}-${slot.section_id}`
      if (!uniqueSubjectsMap.has(key)) {
        const sub = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects
        const sec = Array.isArray(slot.sections) ? slot.sections[0] : slot.sections
        uniqueSubjectsMap.set(key, {
          id: sub?.id,
          name: sub?.name,
          code: sub?.code,
          section_id: sec?.id,
          section_name: sec?.name,
        })
      }
    }
    subjects = Array.from(uniqueSubjectsMap.values())

    projects = await getProjectsByFacultyAction(user.id)
  } else if (profile.role === ROLES.STUDENT) {
    studentGroups = await getStudentProjectGroupsAction(user.id)
  } else {
    // HOD or Admins see all projects
    const { data } = await supabase
      .from("projects")
      .select(`
        id,
        title,
        description,
        created_at,
        project_groups (
          id,
          group_name,
          group_members (
            student_id,
            users:student_id (name, email)
          )
        )
      `)
      .order("created_at", { ascending: false })
    projects = data || []
  }

  return (
    <ProjectGroupsClient
      profile={profile}
      initialProjects={projects}
      subjects={subjects}
      studentGroups={studentGroups}
    />
  )
}
