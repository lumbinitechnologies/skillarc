export type Parent = {
  id: string
  name: string
  email: string
  institution_id?: string | null
  organization_id?: string | null
  students?: Array<{
    id: string
    name: string
    registration_number?: string | null
    relationship?: string | null
  }>
}

export type ParentProfile = Parent

export type ParentRecord = Parent

export type CreateParentInput = {
  name: string
  email: string
  password?: string
  institution_id: string
  organization_id?: string | null
}

export type UpdateParentInput = Partial<CreateParentInput>
