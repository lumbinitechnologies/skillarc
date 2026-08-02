"use server"

import { createSupabaseServerClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import https from "https"

export async function createProjectWithGroupsAction(data: {
  title: string
  description: string
  subject_id: string
  faculty_id: string
  groups: Array<{
    name: string
    description?: string
    motto?: string
    memberIds: string[]
  }>
}) {
  const supabase = await createSupabaseServerClient()

  // 1. Insert Project (with fallback if subject_id column doesn't exist)
  let projectRes = await supabase
    .from("projects")
    .insert({
      title: data.title,
      description: data.description,
      faculty_id: data.faculty_id,
      subject_id: data.subject_id,
    })
    .select("id")
    .single()

  if (projectRes.error && projectRes.error.code === "42703") {
    // Retry without subject_id column
    projectRes = await supabase
      .from("projects")
      .insert({
        title: data.title,
        description: data.description,
        faculty_id: data.faculty_id,
      })
      .select("id")
      .single()
  }

  const project = projectRes.data
  const projectError = projectRes.error

  if (projectError || !project) {
    console.error("Error creating project:", projectError)
    return { success: false, error: projectError?.message || "Failed to create project" }
  }

  // 2. Insert Groups & Members
  for (const group of data.groups) {
    const { data: pgGroup, error: groupError } = await supabase
      .from("project_groups")
      .insert({
        project_id: project.id,
        group_name: group.name,
      })
      .select("id")
      .single()

    if (groupError || !pgGroup) {
      console.error("Error creating project group:", groupError)
      continue
    }

    // Insert group members
    const membersData = group.memberIds.map(studentId => ({
      group_id: pgGroup.id,
      student_id: studentId,
    }))

    const { error: membersError } = await supabase
      .from("group_members")
      .insert(membersData)

    if (membersError) {
      console.error("Error inserting group members:", membersError)
    }
  }

  revalidatePath("/dashboard/project-groups")
  return { success: true, projectId: project.id }
}

export async function getProjectsByFacultyAction(facultyId: string) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
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
    .eq("faculty_id", facultyId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to load projects:", error)
    return []
  }

  return data || []
}

export async function getStudentProjectGroupsAction(studentId: string) {
  const supabase = await createSupabaseServerClient()

  // Find all groups the student belongs to
  const { data: memberships, error } = await supabase
    .from("group_members")
    .select(`
      group_id,
      project_groups (
        id,
        group_name,
        project_id,
        projects (id, title, description, created_at, faculty_id)
      )
    `)
    .eq("student_id", studentId)

  if (error || !memberships) {
    console.error("Failed to load student groups:", error)
    return []
  }

  const results = []
  for (const m of memberships) {
    const group = (m as any).project_groups
    if (!group) continue

    // Load other members in this group
    const { data: members } = await supabase
      .from("group_members")
      .select("student_id, users:student_id(name, email)")
      .eq("group_id", group.id)

    results.push({
      project: group.projects,
      group: {
        id: group.id,
        group_name: group.group_name,
      },
      members: members || []
    })
  }

  return results
}

export async function getSubjectStudentsAction(sectionId: string) {
  const supabase = await createSupabaseServerClient()

  if (!sectionId) return []

  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      users:id (name, email),
      section_id
    `)
    .eq("section_id", sectionId)

  if (error) {
    console.error("Failed to load subject students:", error)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.users?.name || "Student",
    email: row.users?.email || "",
    section_id: row.section_id || null,
  }))
}

export async function suggestTeamsAIAction(members: any[], settings: { teamCount: number; theme: string; focus: string }) {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY is not configured on the server.");
    return { success: false, error: "API Key not configured." }
  }

  const prompt = `
    As an expert Team Segregator, divide these students into ${settings.teamCount} teams:
    Students: ${JSON.stringify(members)}
    Theme: ${settings.theme}
    Optimization: ${settings.focus}

    Respond ONLY in valid JSON format:
    {
      "teams": [
        {
          "name": "Team Name",
          "description": "Team project desc",
          "motto": "Team motto",
          "memberIds": ["id1", "id2"],
          "strengths": ["list"],
          "synergyScore": 90
        }
      ],
      "overallFeedback": "Feedback text"
    }
  `;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  return new Promise((resolve) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          try {
            const resultJson = JSON.parse(responseData);
            const textResponse = resultJson.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textResponse) {
              resolve({ success: false, error: "Empty AI response" });
              return;
            }
            const cleanJson = JSON.parse(textResponse.replace(/```json|```/g, "").trim());
            resolve({ success: true, data: cleanJson });
          } catch (err: any) {
            console.error("AI parse error:", err, responseData);
            resolve({ success: false, error: "Failed to parse AI response" });
          }
        });
      }
    );

    req.on("error", (err) => {
      console.error("Gemini request error:", err);
      resolve({ success: false, error: err.message });
    });

    req.write(JSON.stringify(requestBody));
    req.end();
  });
}

export async function getProjectsBySubjectAction(subjectId: string) {
  const supabase = await createSupabaseServerClient()

  // 1. Try querying with subject_id column first
  const { data, error } = await supabase
    .from("projects")
    .select(`
      id,
      title,
      description,
      created_at,
      subject_id,
      project_groups (
        id,
        group_name,
        group_members (
          student_id,
          users:student_id (name, email)
        )
      )
    `)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })

  if (!error) {
    return data || []
  }

  // 2. Fallback: Query all projects and filter by student section matching the subject's section
  console.log("subject_id query failed (e.g. column missing), falling back to student correlation filtering...")
  
  const { data: allProjects, error: fallbackError } = await supabase
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

  if (fallbackError) {
    console.error("Fallback projects query failed:", fallbackError)
    return []
  }

  // Get active sections assigned to this subject
  const { data: slots } = await supabase
    .from("timetable_slots")
    .select("section_id")
    .eq("subject_id", subjectId)

  const sectionIds = Array.from(new Set((slots ?? []).map((s: any) => s.section_id).filter(Boolean)))
  if (sectionIds.length === 0) {
    return []
  }

  // Load students belonging to these sections
  const { data: studentRecords } = await supabase
    .from("students")
    .select("id")
    .in("section_id", sectionIds)

  const studentIdsSet = new Set((studentRecords ?? []).map((s: any) => s.id))

  // Filter projects in memory where at least one member is enrolled in the subject's sections
  const filtered = (allProjects || []).filter((proj: any) => {
    return proj.project_groups?.some((group: any) =>
      group.group_members?.some((member: any) => studentIdsSet.has(member.student_id))
    )
  })

  return filtered
}
