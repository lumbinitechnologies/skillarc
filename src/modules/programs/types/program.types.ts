export interface Program {
  id: string
  name: string
  department_id: string | null
  institution_id: string | null
  organization_id: string | null
}

export interface ProgramWithDepartment extends Program {
  department?: {
    id: string
    name: string
  } | null
}

export interface CreateProgramInput {
  name: string
  department_id: string | null
  institution_id: string | null
  organization_id: string | null
}