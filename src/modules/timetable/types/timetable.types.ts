export interface Subject {
  id: string
  code: string
  name: string
  semester: number
  institution_id: string
  program_id: string | null
  credits?: number
  subject_type?: string
  faculty_id?: string | null
  faculty_name?: string | null
}

export interface Faculty {
  id: string
  name: string
  email: string
  role: string
  used?: number
  total?: number
}

export interface Section {
  id: string
  name: string
  semester: number
  program_id: string | null
  institution_id: string | null
}

export interface TimetableWeek {
  id: string
  institution_id: string
  section_id: string
  semester: number
  week_number: number
  title?: string | null
  start_date: string // YYYY-MM-DD
  end_date: string   // YYYY-MM-DD
  created_at?: string
  updated_at?: string
}

export interface Slot {
  id?: string
  day: string
  period: string
  faculty_id: string | null
  faculty_name?: string | null
  subject?: Subject
  week_id?: string | null
}

export interface TimetableSlot {
  id?: string
  day: string
  period: number
  institution_id: string
  section_id: string
  semester: number
  subject_id: string | null
  faculty_id: string | null
  week_id?: string | null
  created_at?: string
  updated_at?: string
}