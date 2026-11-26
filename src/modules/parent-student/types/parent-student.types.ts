export interface ParentStudentRelation {
  id: string
  parent_id: string
  student_id: string
  relationship: string
  created_at?: string
}

export interface ParentStudentRelationWithDetails extends ParentStudentRelation {
  parent?: {
    id: string
    name: string | null
    email: string
  }
  student?: {
    id: string
    name: string | null
    email: string
  }
}

export interface CreateParentStudentRelationInput {
  parent_id: string
  student_id: string
  relationship: string
}
