import type { TableRow } from "./database-row"
import type { GradebookColumn, GradebookEntry } from "./gradebook"

export interface QuizQuestion {
  q: string
  options: string[]
  answer: number
}
export interface CodingTestCase { input: string; output: string }
export interface AcademicAssignment {
  id: string
  subject_id: string
  faculty_id: string
  faculty?: { name: string } | null
  title: string
  description: string | null
  type: string
  max_score: number
  due_date: string | null
  created_at: string
  section_ids: string[] | null
  files: string[] | null
  questions: QuizQuestion[] | null
  language: string | null
  test_cases: CodingTestCase[] | null
}
export interface AcademicStudent {
  id: string
  name: string
  email?: string
  section_id?: string | null
  profile_image_url?: string | null
  gender?: string
  sections?: { name: string } | null
  registration_number?: string | null
  semester?: number
  role?: string
  skill?: number
}
export interface AcademicSubmission {
  id: string
  assignment_id: string
  student_id: string
  status: string
  grade: number | null
  feedback: string | null
  submitted_at: string
  quiz_answers: Array<string | number | null> | null
  code_content: string | null
  language?: string | null
  file_url: string | null
  plagiarism_rate?: number | null
  verification_status?: string | null
  ai_probability?: number | null
  integrity_note?: string | null
  matched_student?: string | null
  ai_score?: number | null
  users?: { name: string; email?: string } | null
  students?: { users?: { name: string } | null } | null
  assignments?: { title: string; max_score: number; type?: string } | null
}
export interface CourseAnnouncement {
  id: string
  title: string
  content?: string
  description?: string
  created_at: string
  faculty_id?: string
  faculty_name?: string
  faculty?: { name: string } | null
  replies?: Array<{ id: string; message: string; created_at: string; author_id: string; users?: { name: string } | Array<{ name: string }> | null }>
}
export type CourseMeeting = TableRow<"meetings">
export interface CourseGroup {
  id: string
  group_name: string
  synergy_score?: number | null
  motto?: string | null
  description?: string | null
  project_id?: string
  group_members: Array<{ student_id: string; role?: string | null; skill?: number | null; users?: { name: string; email?: string } | Array<{ name: string; email?: string }> | null }>
}
export interface CourseProject {
  id: string
  title: string
  description: string | null
  created_at?: string
  project_groups: CourseGroup[]
}
export type { GradebookColumn, GradebookEntry }

export function relationOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export interface CourseGroupAllocation {
  id: string
  project?: Omit<CourseProject, "project_groups"> | null
  project_group?: CourseGroup | null
}
export interface AttendanceEntry {
  id: string
  date: string
  period: string
  facultyName: string
  status: string
}
export interface WorksheetPresentation {
  icon: import("lucide-react").LucideIcon
  color: string
  bg: string
  label: string
  border?: string
  activeBg?: string
}
export interface GeneratedTeam {
  name: string
  description: string
  motto: string
  memberIds: string[]
  synergyScore: number
}
export type RosterStudent = AcademicStudent & { role: string; skill: number; gender: string }

export interface AcademicOption {
  id: string
  name: string
  code?: string | null
  program_id?: string | null
  department_id?: string | null
  semester?: number | null
}
export interface AttendanceStudent extends AcademicStudent {
  program_id?: string | null
  department_id?: string | null
  program_name?: string
  section_name?: string
  attendanceRate?: number
  totalSessions?: number
  missedSessions?: number
}
export type LeaveApplication = Pick<TableRow<"leave_applications">, "id" | "from_date" | "to_date" | "reason" | "notes" | "status" | "created_at" | "approved_at" | "approved_by"> & Partial<TableRow<"leave_applications">> & {
  studentName?: string
  studentProfileImageUrl?: string | null
  registrationNumber?: string
  sectionName?: string
  studentEmail?: string
}
export interface AttendanceSessionStats {
  session_id: string
  section_id: string
  subject_id: string
  attendance_date: string
  period: string
  total_count: number
  present_count: number
  absent_count: number
  late_count: number
}
