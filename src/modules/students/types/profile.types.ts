export type StudentProfileIdentity = {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
}

export type StudentAcademicProfile = {
  registration_number: string | null
  admission_year: number | null
  dob: string | null
  gender: string | null
  program_id: string | null
  section_id: string | null
  intake_id: string | null
  semester: number | null
}

export type StudentComplianceProfile = {
  citizenship: string | null
  country_of_birth: string | null
  passport_number: string | null
  passport_country: string | null
  passport_expiry: string | null
  visa_type: string | null
  visa_number: string | null
  visa_expiry: string | null
  english_evidence_type: string | null
  english_evidence_reference: string | null
  english_evidence_date: string | null
  usi: string | null
  other_identifiers: Record<string, string> | null
  education_agent_id: string | null
  marketing_staff_id: string | null
}

export type StudentAddressType = "RESIDENTIAL" | "POSTAL"

export type StudentAddress = {
  id: string
  type: StudentAddressType
  address_line_1: string
  address_line_2: string | null
  locality: string
  state_province: string | null
  postal_code: string
  country: string
  is_current: boolean
}

export type StudentEmergencyContact = {
  id: string
  name: string
  relationship: string
  email: string | null
  phone: string | null
  address: string | null
  priority: number
  is_primary: boolean
}

export type StudentNote = {
  id: string
  body: string
  created_at: string
  archived_at: string | null
  actor_id: string
}

export type StudentCommunication = {
  id: string
  summary: string
  channel: string
  occurred_at: string
  archived_at: string | null
  actor_id: string
}

export type StudentActivityEvent = {
  id: string
  action: string
  created_at: string
  actor_id: string | null
  student_id: string
}

export type StudentProfile = {
  institution_id: string
  access_scope?: "ADMIN" | "STUDENT_SELF" | "ACADEMIC_STAFF"
  identity: StudentProfileIdentity
  academic: StudentAcademicProfile
  details: StudentComplianceProfile | null
  addresses: StudentAddress[]
  emergency_contacts: StudentEmergencyContact[]
  notes: StudentNote[]
  communications: StudentCommunication[]
  activity: StudentActivityEvent[]
  options?: {
    education_agents: Array<{ id: string; name: string }>
    marketing_staff: Array<{ id: string; name: string; email: string }>
  }
}
