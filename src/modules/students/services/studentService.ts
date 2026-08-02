import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Student, StudentWithSection, CreateStudentInput, UpdateStudentInput } from "../types/student.types"
import { ROLES } from "@/constants/roles"

export async function createSupabaseStudentClient() {
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

/**
 * Fetches all students for an institution.
 * Queries the students table and merges with user data.
 */
export async function getStudentsByInstitution(
  institutionId: string
): Promise<StudentWithSection[]> {
  const supabase = await createSupabaseStudentClient()
  
  // Fetch from students table (now separate from users)
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, institution_id, program_id, section_id, semester, registration_number, admission_year, dob, gender")
    .eq("institution_id", institutionId)
    .order("id")

  if (studentsError) throw new Error(`Failed to fetch students: ${studentsError.message}`)
  if (!students?.length) return []

  const studentIds = students.map(s => s.id)
  const sectionIds = Array.from(new Set(students.map(s => s.section_id).filter(Boolean))) as string[]
  const programIds = Array.from(new Set(students.map(s => s.program_id).filter(Boolean))) as string[]

  const [usersRes, sectionsRes, programsRes] = await Promise.all([
    supabase.from("users").select("id, name, email, role, organization_id, institution_id, created_at, is_active").in("id", studentIds),
    sectionIds.length ? supabase.from("sections").select("id, name, semester, program_id").in("id", sectionIds) : Promise.resolve({ data: [] }),
    programIds.length ? supabase.from("programs").select("id, name").in("id", programIds) : Promise.resolve({ data: [] }),
  ])

  const users = usersRes.data || []
  const sections = sectionsRes.data || []
  const programs = programsRes.data || []

  // Merge student + user + section + program data
  return students.map(student => {
    const user = users.find(u => u.id === student.id)
    const sec = sections.find(s => s.id === student.section_id)
    const prog = programs.find(p => p.id === (sec?.program_id || student.program_id))

    return {
      ...student,
      name: user?.name || "Unknown",
      email: user?.email || "",
      role: user?.role || ROLES.STUDENT,
      organization_id: user?.organization_id,
      created_at: user?.created_at,
      is_active: user?.is_active ?? true,
      department_id: null,
      section: sec
        ? {
            ...sec,
            program: prog ? { id: prog.id, name: prog.name } : null,
          }
        : null,
    } as any as StudentWithSection
  })
}

/**
 * Fetches a single student by ID.
 * Queries both students and users tables.
 */
export async function getStudentById(studentId: string): Promise<StudentWithSection> {
  const supabase = await createSupabaseStudentClient()
  
  // Fetch student data
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, institution_id, program_id, section_id, semester, registration_number, admission_year, dob, gender")
    .eq("id", studentId)
    .single()

  if (studentError) throw new Error(`Failed to fetch student: ${studentError.message}`)
  if (!student) throw new Error("Student not found")

  // Fetch user data
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("name, email, role, organization_id, institution_id, created_at, is_active")
    .eq("id", studentId)
    .single()

  if (userError) throw new Error(`Failed to fetch user data: ${userError.message}`)

  // Merge data
  return {
    id: student.id,
    institution_id: student.institution_id,
    program_id: student.program_id,
    section_id: student.section_id,
    semester: student.semester,
    registration_number: student.registration_number,
    admission_year: student.admission_year,
    dob: student.dob,
    gender: student.gender,
    name: user?.name || "Unknown",
    email: user?.email || "",
    role: user?.role || ROLES.STUDENT,
    organization_id: user?.organization_id,
    created_at: user?.created_at,
    is_active: user?.is_active,
    department_id: null,
  } as any as StudentWithSection
}

/**
 * Creates a new student.
 * Creates user auth account, inserts into users table, and inserts into students table.
 */
export async function createStudent(
  input: CreateStudentInput
): Promise<Student> {
  const supabase = await createSupabaseStudentClient()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password || Math.random().toString(36).slice(-12),
    email_confirm: true,
  })

  if (authError) throw new Error(`Failed to create auth user: ${authError.message}`)

  // 2. Create users entry
  const { data: userData, error: userError } = await supabase
    .from("users")
    .insert([
      {
        id: authData.user.id,
        name: input.name,
        email: input.email,
        role: ROLES.STUDENT,
        institution_id: input.institution_id,
        organization_id: input.organization_id || null,
      },
    ])
    .select()
    .single()

  if (userError) throw new Error(`Failed to create user profile: ${userError.message}`)

  // 3. Create students entry
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .insert([
      {
        id: authData.user.id,
        institution_id: input.institution_id,
        program_id: input.program_id || null,
        section_id: input.section_id,
        semester: input.semester,
        registration_number: input.registration_number || null,
        admission_year: input.admission_year || null,
        dob: null,
        gender: null,
      },
    ])
    .select()
    .single()

  if (studentError) throw new Error(`Failed to create student record: ${studentError.message}`)

  // Merge results
  return {
    ...studentData,
    name: userData?.name,
    email: userData?.email,
    role: userData?.role,
    organization_id: userData?.organization_id,
    created_at: userData?.created_at,
  } as Student
}

/**
 * Updates a student.
 * Updates both users and students tables as needed.
 */
export async function updateStudent(
  studentId: string,
  input: UpdateStudentInput
): Promise<Student> {
  const supabase = await createSupabaseStudentClient()

  // Separate user fields from student fields
  const userFields: Record<string, any> = {}
  const studentFields: Record<string, any> = {}

  if (input.name !== undefined) userFields.name = input.name

  if (input.section_id !== undefined) studentFields.section_id = input.section_id
  if (input.semester !== undefined) studentFields.semester = input.semester
  if (input.program_id !== undefined) studentFields.program_id = input.program_id
  if (input.registration_number !== undefined) studentFields.registration_number = input.registration_number
  if (input.admission_year !== undefined) studentFields.admission_year = input.admission_year

  // Update users table if needed
  if (Object.keys(userFields).length > 0) {
    const { error: userError } = await supabase
      .from("users")
      .update(userFields)
      .eq("id", studentId)

    if (userError) throw new Error(`Failed to update user: ${userError.message}`)
  }

  // Update students table if needed
  if (Object.keys(studentFields).length > 0) {
    const { error: studentError } = await supabase
      .from("students")
      .update(studentFields)
      .eq("id", studentId)

    if (studentError) throw new Error(`Failed to update student: ${studentError.message}`)
  }

  // Return updated student
  return await getStudentById(studentId)
}

/**
 * Deletes a student.
 * Cascade delete will remove from students table automatically.
 */
export async function deleteStudent(studentId: string): Promise<void> {
  const supabase = await createSupabaseStudentClient()
  
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", studentId)
    .eq("role", ROLES.STUDENT)

  if (error) throw new Error(`Failed to delete student: ${error.message}`)
}

/**
 * Gets count of students in an institution.
 */
export async function getStudentCount(institutionId: string): Promise<number> {
  const supabase = await createSupabaseStudentClient()
  const { count, error } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("institution_id", institutionId)

  if (error) throw new Error(`Failed to get student count: ${error.message}`)
  return count || 0
}