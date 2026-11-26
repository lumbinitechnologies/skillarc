export const STUDENT_DOCUMENT_CATEGORIES = [
  "PASSPORT",
  "VISA",
  "ENGLISH_EVIDENCE",
  "ACADEMIC_DOCUMENT",
  "SIGNED_APPLICATION",
  "STUDENT_REQUEST_FORM",
  "OTHER_SUPPORTING_EVIDENCE",
] as const

export type StudentDocumentCategory = (typeof STUDENT_DOCUMENT_CATEGORIES)[number]

export const STUDENT_DOCUMENT_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "ARCHIVED",
] as const

export type StudentDocumentStatus = (typeof STUDENT_DOCUMENT_STATUSES)[number]

export type StudentDocument = {
  id: string
  student_id: string
  institution_id: string
  application_id: string | null
  application_document_id: string | null
  category: StudentDocumentCategory
  title: string
  storage_bucket: string
  storage_path: string
  original_filename: string
  mime_type: string
  size_bytes: number
  checksum_sha256: string | null
  version: number
  status: StudentDocumentStatus
  review_feedback: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  uploaded_by: string
  created_at: string
  updated_at: string
  archived_at: string | null
  superseded_at: string | null
  superseded_by: string | null
}
