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
  room?: string | null
  delivery_mode?: "ON_CAMPUS" | "ONLINE" | "HYBRID" | string | null
  meeting_link?: string | null
  notes?: string | null
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
  room?: string | null
  delivery_mode?: "ON_CAMPUS" | "ONLINE" | "HYBRID" | string | null
  meeting_link?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export type AcademicEventType = 
  | "PUBLIC_HOLIDAY" 
  | "TERM_BREAK" 
  | "EXAM_PERIOD" 
  | "CAMPUS_EVENT" 
  | "ORIENTATION"

export interface AcademicEvent {
  id: string
  institution_id: string
  title: string
  event_type: AcademicEventType
  start_date: string // YYYY-MM-DD
  end_date: string   // YYYY-MM-DD
  description?: string | null
  affects_classes?: boolean
  color?: string
  created_at?: string
}

export type ClashType = 
  | "TRAINER_DOUBLE_BOOKED" 
  | "ROOM_OVERLAP" 
  | "SECTION_CONCURRENT"

export interface TimetableClash {
  id: string
  type: ClashType
  severity: "CRITICAL" | "WARNING"
  title: string
  description: string
  day: string
  period: string | number
  faculty_id?: string | null
  faculty_name?: string | null
  room?: string | null
  section_id?: string | null
  section_name?: string | null
  subject_name?: string | null
  conflictingSlots: Array<{
    id?: string
    section_id?: string
    section_name?: string
    subject_code?: string
    subject_name?: string
    faculty_name?: string
    room?: string | null
    day: string
    period: number | string
    week_id?: string | null
  }>
}