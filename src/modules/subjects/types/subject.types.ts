export interface Subject {
  id: string
  institution_id: string
  name: string
  code: string
  semester: number
  faculty_id: string | null
  section_id: string | null
  program_id: string | null
  credits: number
  subject_type: string
}

export interface SubjectWithRelations extends Subject {
  faculty?: {
    id: string
    name: string
    email: string
  } | null

  section?: {
    id: string
    name: string
  } | null

  program?: {
    id: string
    name: string
  } | null
}

export interface CreateSubjectInput {
  institution_id: string
  name: string
  code: string
  semester: number
  faculty_id?: string | null
  section_id?: string | null
  program_id?: string | null
  credits: number
  subject_type: string
}