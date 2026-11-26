export interface Section {
  id: string
  name: string
  semester: number
  program_id: string | null
  institution_id: string | null
  faculty_advisor_id: string | null
  created_at?: string
  updated_at?: string
}

export interface SectionWithFacultyAdvisor extends Section {
  faculty_advisor?: {
    id: string
    name: string | null
    email: string
  } | null

  program?: {
    id: string
    name: string
  } | null

  student_count?: number
}

export interface SectionWithProgram extends Section {
  program?: {
    id: string
    name: string
  } | null
}

export interface SectionFull extends SectionWithFacultyAdvisor, SectionWithProgram {}

export interface CreateSectionInput {
  name: string
  semester: number
  program_id: string | null
  institution_id: string | null
  faculty_advisor_id?: string | null
}

export interface UpdateSectionInput {
  name?: string
  semester?: number
  faculty_advisor_id?: string | null
}