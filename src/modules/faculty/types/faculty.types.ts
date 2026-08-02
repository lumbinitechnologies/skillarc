import type { UserProfile } from "@/modules/users/types"

export interface Faculty extends UserProfile {
  department_id?: string | null
}

export interface FacultyWithStats extends Faculty {
  assignedSubjects?: number
  assignedSections?: number
  is_timetable_builder?: boolean
  department?: {
    id: string
    name: string
  } | null
}

export interface CreateFacultyInput {
  name: string
  email: string
  department_id?: string
  institution_id: string
  organization_id?: string
}

export interface UpdateFacultyInput {
  name?: string
  email?: string
  department_id?: string
  role?: string
  is_timetable_builder?: boolean
}