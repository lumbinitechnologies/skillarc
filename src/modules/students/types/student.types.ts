export type Student = {
  id: string
  name?: string
  email?: string
  role?: string
  institution_id?: string | null
  organization_id?: string | null
  created_at?: string
  program_id?: string | null
  section_id?: string | null
  semester?: number | null
  registration_number?: string | null
  admission_year?: number | null
  dob?: string | null
  gender?: string | null
  phone?: string | null
  is_active?: boolean
  department_id?: string | null
}

export type StudentWithSection = Student & {
  section?: {
    id: string
    name: string
    semester?: number | null
    program_id?: string | null
    program?: { id: string; name: string } | null
  } | null
}

export type CreateStudentInput = {
  name: string
  email: string
  password?: string
  institution_id: string
  organization_id?: string | null
  program_id?: string | null
  section_id?: string | null
  semester?: number
  registration_number?: string
  admission_year?: number
  phone?: string
  parentName?: string
  parentEmail?: string
  parentPhone?: string
  parentRelationship?: string
}

export type UpdateStudentInput = Partial<CreateStudentInput>
