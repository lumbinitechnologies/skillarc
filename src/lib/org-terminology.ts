/**
 * org-terminology.ts
 *
 * Single source of truth for all terminology that differs between
 * a 'school' (K-12 / secondary) and a 'college' (higher-ed / university).
 *
 * Usage:
 *   import { getTerm } from '@/lib/org-terminology'
 *   getTerm('school', 'faculty_plural') // → 'Teachers'
 *
 * In components, prefer the useTerm() hook from org-type-context.tsx
 * which reads org type automatically from React context.
 */

export type OrgType = 'school' | 'college'

export interface TerminologyMap {
  // Structural
  institution: string          // "College" | "School"
  institution_plural: string   // "Colleges" | "Schools"
  department: string           // "Department" | "Stream"
  department_plural: string    // "Departments" | "Streams"
  program: string              // "Program" | "Grade"
  program_plural: string       // "Programs" | "Grades"
  section: string              // "Section" | "Division"
  section_plural: string       // "Sections" | "Divisions"
  semester: string             // "Semester" | "Term"
  semester_plural: string      // "Semesters" | "Terms"
  academic_year: string        // Same for both

  // People
  faculty_member: string       // "Faculty Member" | "Teacher"
  faculty_plural: string       // "Faculty" | "Teachers"
  hod: string                  // "HOD" | "Head of Stream"
  hod_full: string             // "Head of Department" | "Head of Stream"
  program_head: string         // "Program Head" | "Class Teacher"
  program_head_full: string    // "Program Coordinator" | "Class Teacher"
  institution_admin: string    // "Institution Admin" | "School Admin"

  // Academic
  subject: string              // Same
  subject_plural: string       // Same
  timetable: string            // Same
  attendance: string           // Same
  gradebook: string            // "Gradebook" | "Report Card"
  placement: string            // "Placement" | "Career Guidance"
  placement_plural: string     // "Placements" | "Career Guidance"

  // Actions / labels
  enroll_verb: string          // "Enroll" | "Admit"
  batch_label: string          // "Batch" | "Year"

  // UI descriptors
  institution_desc: string     // Short description shown in selectors
}

export const TERMINOLOGY: Record<OrgType, TerminologyMap> = {
  college: {
    institution: 'College',
    institution_plural: 'Colleges',
    department: 'Department',
    department_plural: 'Departments',
    program: 'Program',
    program_plural: 'Programs',
    section: 'Section',
    section_plural: 'Sections',
    semester: 'Semester',
    semester_plural: 'Semesters',
    academic_year: 'Academic Year',

    faculty_member: 'Faculty Member',
    faculty_plural: 'Faculty',
    hod: 'HOD',
    hod_full: 'Head of Department',
    program_head: 'Program Head',
    program_head_full: 'Program Coordinator',
    institution_admin: 'Institution Admin',

    subject: 'Subject',
    subject_plural: 'Subjects',
    timetable: 'Timetable',
    attendance: 'Attendance',
    gradebook: 'Gradebook',
    placement: 'Placement',
    placement_plural: 'Placements',

    enroll_verb: 'Enroll',
    batch_label: 'Batch',

    institution_desc: 'Higher education — colleges, universities, polytechnics.',
  },

  school: {
    institution: 'School',
    institution_plural: 'Schools',
    department: 'Stream',
    department_plural: 'Streams',
    program: 'Grade',
    program_plural: 'Grades',
    section: 'Section',
    section_plural: 'Sections',
    semester: 'Term',
    semester_plural: 'Terms',
    academic_year: 'Academic Year',

    faculty_member: 'Teacher',
    faculty_plural: 'Teachers',
    hod: 'Head of Stream',
    hod_full: 'Head of Stream',
    program_head: 'Class Teacher',
    program_head_full: 'Class Teacher',
    institution_admin: 'School Admin',

    subject: 'Subject',
    subject_plural: 'Subjects',
    timetable: 'Timetable',
    attendance: 'Attendance',
    gradebook: 'Report Card',
    placement: 'Career Guidance',
    placement_plural: 'Career Guidance',

    enroll_verb: 'Admit',
    batch_label: 'Year',

    institution_desc: 'K-12 / secondary — schools, prep schools, junior colleges.',
  },
}

/**
 * Get a single term for the given org type.
 * Falls back to the key name if not found (never crashes).
 */
export function getTerm(orgType: OrgType, key: keyof TerminologyMap): string {
  return TERMINOLOGY[orgType]?.[key] ?? key
}

/**
 * Default feature flags that make sense for each org type.
 * Super admin can override these after creation.
 */
export const DEFAULT_FEATURES_BY_TYPE: Record<OrgType, string[]> = {
  college: [
    'direct_onboarding',
    'multi_week_timetable',
    'report_cards',
    'interventions',
    'placements',
  ],
  school: [
    'direct_onboarding',
    'report_cards',
    'interventions',
    // schools skip: placements, admissions_workflow (not relevant for K-12)
  ],
}

/**
 * Features that are hidden/unavailable for a given org type.
 * Used to filter the module selector in the org creation modal.
 */
export const HIDDEN_FEATURES_BY_TYPE: Record<OrgType, string[]> = {
  college: [], // colleges can enable everything
  school: ['placements'], // placements replaced by career guidance concept
}
