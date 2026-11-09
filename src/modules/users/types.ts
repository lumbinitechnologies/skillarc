import { UserRole } from "@/constants/roles"

export interface UserProfile {
  id: string
  name: string | null
  email: string
  role: UserRole
  institution_id: string | null
  organization_id: string | null
  section_id: string | null
  semester: number | null
  profile_image_url?: string | null
  created_at: string
  is_active?: boolean | null
}

export interface StudentProfile extends UserProfile {
  department_id: string | null
  program_id: string | null
  section_id: string
  semester: number
}

export type ParentProfile = UserProfile

export interface FacultyProfile extends UserProfile {
  department_id: string | null
}