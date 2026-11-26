import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Faculty, FacultyWithStats, CreateFacultyInput, UpdateFacultyInput } from "../types/faculty.types"
import { clearFacultyProfile, clearFacultySubjects, clearFacultyTimetable } from "@/app/dashboard/faculty/components/faculty-cache-v2"
import { ROLES } from "@/constants/roles"

export async function createSupabaseFacultyClient() {
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

export async function getFacultyByInstitution(
  institutionId: string
): Promise<Faculty[]> {
  const supabase = await createSupabaseFacultyClient()
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("role", ROLES.FACULTY)
    .order("name")

  if (error) throw new Error(`Failed to fetch faculty: ${error.message}`)
  return data || []
}

export async function getFacultyByDepartment(
  departmentId: string
): Promise<Faculty[]> {
  const supabase = await createSupabaseFacultyClient()

  const { data, error } = await supabase
    .from("departments_hierarchy")
    .select("users:user_id(id, name, email, role, institution_id, organization_id)")
    .eq("department_id", departmentId)
    .eq("role", ROLES.HOD)

  if (error) {
    throw new Error(`Failed to fetch department faculty: ${error.message}`)
  }

  const faculty = data?.flatMap((row) => row.users ?? []) ?? []

  return faculty as Faculty[]
}

export async function getFacultyById(facultyId: string): Promise<Faculty> {
  const supabase = await createSupabaseFacultyClient()
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", facultyId)
    .single()

  if (error) throw new Error(`Failed to fetch faculty: ${error.message}`)
  return data
}

export async function createFaculty(input: CreateFacultyInput): Promise<Faculty> {
  const supabase = await createSupabaseFacultyClient()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: Math.random().toString(36).slice(-12),
    email_confirm: true,
  })

  if (authError) throw new Error(`Failed to create auth user: ${authError.message}`)

  const { data: faculty, error } = await supabase
    .from("users")
    .insert([
      {
        id: authData.user.id,
        name: input.name,
        email: input.email,
        role: ROLES.FACULTY,
        institution_id: input.institution_id,
        organization_id: input.organization_id,
      },
    ])
    .select()
    .single()

  if (error) throw new Error(`Failed to create faculty profile: ${error.message}`)

  if (input.department_id) {
    await supabase.from("departments_hierarchy").insert([
      {
        user_id: authData.user.id,
        department_id: input.department_id,
        role: ROLES.FACULTY,
      },
    ])
  }

  return faculty
}

export async function updateFaculty(
  facultyId: string,
  input: UpdateFacultyInput
): Promise<Faculty> {
  const supabase = await createSupabaseFacultyClient()
  const { data, error } = await supabase
    .from("users")
    .update(input)
    .eq("id", facultyId)
    .eq("role", ROLES.FACULTY)
    .select()
    .single()

  if (error) throw new Error(`Failed to update faculty: ${error.message}`)
  try {
    clearFacultyProfile(facultyId)
    clearFacultySubjects(facultyId)
    clearFacultyTimetable(facultyId, data?.institution_id)
  } catch (e) {
    console.warn("Failed to clear faculty cache:", e)
  }
  try {
    if (process.env.CACHE_DEBUG === "1") {
      console.debug("[faculty-service] cleared faculty cache for", facultyId)
    }
  } catch {}
  return data
}

export async function deleteFaculty(facultyId: string): Promise<void> {
  const supabase = await createSupabaseFacultyClient()

  const { error: deleteError } = await supabase
    .from("users")
    .delete()
    .eq("id", facultyId)

  if (deleteError)
    throw new Error(`Failed to delete faculty: ${deleteError.message}`)

  try {
    await supabase.auth.admin.deleteUser(facultyId)
  } catch (e) {
    console.warn("Could not delete auth user:", e)
  }
}

export async function getFacultyCount(institutionId: string): Promise<number> {
  const supabase = await createSupabaseFacultyClient()
  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("institution_id", institutionId)
    .eq("role", ROLES.FACULTY)

  if (error) throw new Error(`Failed to count faculty: ${error.message}`)
  return count || 0
}

export async function getFacultyWithStats(
  institutionId: string
): Promise<FacultyWithStats[]> {
  const supabase = await createSupabaseFacultyClient()
  const { data, error } = await supabase
    .from("users")
    .select(`
      *,
      subjects(count),
      sections(count)
    `)
    .eq("institution_id", institutionId)
    .eq("role", ROLES.FACULTY)
    .order("name")

  if (error) throw new Error(`Failed to fetch faculty with stats: ${error.message}`)

  const rows = data ?? []

  return rows.map((faculty) => ({
    ...(faculty as Faculty),
    assignedSubjects: faculty.subjects?.[0]?.count ?? 0,
    assignedSections: faculty.sections?.[0]?.count ?? 0,
  })) as FacultyWithStats[]
}
