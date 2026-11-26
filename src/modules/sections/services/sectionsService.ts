import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Section, CreateSectionInput, UpdateSectionInput, SectionFull } from "../types/sections.types"

export async function createSupabaseSectionsClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function getSectionsByProgram(programId: string): Promise<SectionFull[]> {
  const supabase = await createSupabaseSectionsClient()
  const { data, error } = await supabase
    .from("sections")
    .select(`
      id,
      name,
      semester,
      program_id,
      institution_id,
      faculty_advisor_id,
      created_at,
      updated_at,
      users:faculty_advisor_id(id, name, email)
    `)
    .eq("program_id", programId)
    .order("semester", { ascending: true })

  if (error) throw new Error(`Failed to fetch sections: ${error.message}`)
  return data || []
}

export async function getSectionsByInstitution(institutionId: string): Promise<SectionFull[]> {
  const supabase = await createSupabaseSectionsClient()
  const { data, error } = await supabase
    .from("sections")
    .select(`
      id,
      name,
      semester,
      program_id,
      institution_id,
      faculty_advisor_id,
      created_at,
      updated_at,
      users:faculty_advisor_id(id, name, email),
      programs(id, name)
    `)
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to fetch sections: ${error.message}`)
  return data || []
}

export async function getSectionById(sectionId: string): Promise<SectionFull | null> {
  const supabase = await createSupabaseSectionsClient()
  const { data, error } = await supabase
    .from("sections")
    .select(`
      id,
      name,
      semester,
      program_id,
      institution_id,
      faculty_advisor_id,
      created_at,
      updated_at,
      users:faculty_advisor_id(id, name, email),
      programs(id, name)
    `)
    .eq("id", sectionId)
    .single()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch section: ${error.message}`)
  }
  return data || null
}

export async function createSection(input: CreateSectionInput): Promise<Section> {
  const supabase = await createSupabaseSectionsClient()
  const { data, error } = await supabase
    .from("sections")
    .insert([
      {
        name: input.name,
        semester: input.semester,
        program_id: input.program_id,
        institution_id: input.institution_id,
        faculty_advisor_id: input.faculty_advisor_id || null,
      },
    ])
    .select()
    .single()

  if (error) throw new Error(`Failed to create section: ${error.message}`)
  return data
}

export async function updateSection(sectionId: string, input: UpdateSectionInput): Promise<Section> {
  const supabase = await createSupabaseSectionsClient()
  const { data, error } = await supabase
    .from("sections")
    .update(input)
    .eq("id", sectionId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update section: ${error.message}`)
  return data
}

export async function deleteSection(sectionId: string): Promise<void> {
  const supabase = await createSupabaseSectionsClient()
  const { error } = await supabase
    .from("sections")
    .delete()
    .eq("id", sectionId)

  if (error) throw new Error(`Failed to delete section: ${error.message}`)
}

export async function assignFacultyAdvisor(sectionId: string, facultyId: string): Promise<Section> {
  const supabase = await createSupabaseSectionsClient()
  const { data, error } = await supabase
    .from("sections")
    .update({ faculty_advisor_id: facultyId })
    .eq("id", sectionId)
    .select()
    .single()

  if (error) throw new Error(`Failed to assign faculty advisor: ${error.message}`)
  return data
}

export async function getSectionStudents(sectionId: string) {
  const supabase = await createSupabaseSectionsClient()
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("section_id", sectionId)
    .eq("role", "student")

  if (error) throw new Error(`Failed to fetch section students: ${error.message}`)
  return data || []
}

export async function getSectionCount(institutionId: string): Promise<number> {
  const supabase = await createSupabaseSectionsClient()
  const { count, error } = await supabase
    .from("sections")
    .select("id", { count: "exact", head: true })
    .eq("institution_id", institutionId)

  if (error) throw new Error(`Failed to count sections: ${error.message}`)
  return count || 0
}